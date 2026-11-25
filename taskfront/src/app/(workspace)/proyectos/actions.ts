'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import type { Activity, Page } from '@/lib/activity'
import { failure, type ActionResult } from '@/lib/forms'
import type { BoardRole, Project, ProjectStatus } from '@/lib/projects'
import type { ChecklistItem, Column, Comment, Label, LabelColor, Priority, Repeat, Task } from '@/lib/tasks'
import { PROJECT_COLORS } from '@/lib/palette'
import { apiAction, requireUser } from '@/lib/server/dal'
import { requireActiveOrganization } from '@/lib/server/organization'

/**
 * Acciones de proyectos. Los permisos los verifica la API en cada operación (líder = admin del
 * proyecto); acá solo se validan formatos y se refrescan las vistas afectadas.
 */

const ROLES: BoardRole[] = ['admin', 'editor', 'viewer']
const STATUSES: ProjectStatus[] = ['active', 'on_hold', 'completed']
const COLORS: string[] = PROJECT_COLORS.map((c) => c.light)
const validId = (id: unknown): id is number => Number.isInteger(id) && (id as number) > 0
const isDate = (v: unknown) => v === null || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v))

function refresh(id?: number) {
  revalidatePath('/proyectos')
  if (id) revalidatePath(`/proyectos/${id}`, 'layout')
  revalidatePath('/', 'layout') // lista de proyectos del menú lateral
}

export type ProjectInput = {
  title: string
  color: string
  visibility: 'organization' | 'private'
  organization_role: 'editor' | 'viewer'
  description?: string
  start_date?: string | null
  due_date?: string | null
  members?: { user_id: number; role: BoardRole }[]
}

/** S8 — Crear proyecto. Con acceso restringido, suma a las personas elegidas como miembros. */
export async function createProject(input: ProjectInput): Promise<ActionResult<{ id: number }>> {
  const title = input.title.trim()
  if (!title) return { ok: false, error: 'Poné un nombre para el proyecto.', fields: { title: 'Este campo es obligatorio.' } }
  if (!isDate(input.start_date ?? null) || !isDate(input.due_date ?? null)) return { ok: false, error: 'Fecha inválida.' }
  const org = await requireActiveOrganization()
  const res = await apiAction<Project>('/boards/', 'POST', {
    organization: org.id,
    title,
    description: (input.description ?? '').trim(),
    color: COLORS.includes(input.color) ? input.color : COLORS[0],
    visibility: input.visibility === 'private' ? 'private' : 'organization',
    organization_role: input.organization_role === 'viewer' ? 'viewer' : 'editor',
    start_date: input.start_date || null,
    due_date: input.due_date || null,
  })
  if (!res.ok) return failure(res)
  const id = res.data.id
  if (input.visibility === 'private') {
    for (const m of input.members ?? []) {
      if (!validId(m.user_id) || !ROLES.includes(m.role)) continue
      await apiAction(`/boards/${id}/members/`, 'POST', { user_id: m.user_id, role: m.role })
    }
  }
  refresh(id)
  return { ok: true, data: { id } }
}

export type ProjectChanges = Partial<{
  title: string
  description: string
  color: string
  status: ProjectStatus
  start_date: string | null
  due_date: string | null
}>

export async function updateProject(id: number, changes: ProjectChanges): Promise<ActionResult> {
  if (!validId(id)) return { ok: false, error: 'Proyecto inválido.' }
  const body: Record<string, unknown> = {}
  if (changes.title !== undefined) {
    if (!changes.title.trim()) return { ok: false, error: 'El nombre es obligatorio.', fields: { title: 'Este campo es obligatorio.' } }
    body.title = changes.title.trim()
  }
  if (changes.description !== undefined) body.description = changes.description.trim()
  if (changes.color !== undefined && COLORS.includes(changes.color)) body.color = changes.color
  if (changes.status !== undefined && STATUSES.includes(changes.status)) body.status = changes.status
  for (const key of ['start_date', 'due_date'] as const) {
    if (changes[key] !== undefined) {
      if (!isDate(changes[key] || null)) return { ok: false, error: 'Fecha inválida.' }
      body[key] = changes[key] || null
    }
  }
  const res = await apiAction(`/boards/${id}/`, 'PATCH', body)
  if (!res.ok) return failure(res)
  refresh(id)
  return { ok: true, data: undefined }
}

export async function setFavorite(id: number, favorite: boolean): Promise<ActionResult> {
  if (!validId(id)) return { ok: false, error: 'Proyecto inválido.' }
  const res = await apiAction(`/boards/${id}/favorite/`, favorite ? 'POST' : 'DELETE')
  if (!res.ok) return failure(res)
  refresh()
  return { ok: true, data: undefined }
}

export async function archiveProject(id: number): Promise<ActionResult> {
  if (!validId(id)) return { ok: false, error: 'Proyecto inválido.' }
  const res = await apiAction(`/boards/${id}/archive/`, 'POST')
  if (!res.ok) return failure(res)
  refresh(id)
  return { ok: true, data: undefined }
}

export async function restoreProject(id: number): Promise<ActionResult> {
  if (!validId(id)) return { ok: false, error: 'Proyecto inválido.' }
  const res = await apiAction(`/boards/${id}/restore/`, 'POST')
  if (!res.ok) return failure(res)
  refresh(id)
  return { ok: true, data: undefined }
}

/** Eliminar: se exige el nombre exacto también en el servidor. */
export async function deleteProject(id: number, confirmName: string): Promise<ActionResult> {
  if (!validId(id)) return { ok: false, error: 'Proyecto inválido.' }
  const current = await apiAction<Project>(`/boards/${id}/`, 'GET')
  if (!current.ok) return failure(current)
  if (confirmName.trim() !== current.data.title) return { ok: false, error: 'El nombre no coincide.' }
  const res = await apiAction(`/boards/${id}/`, 'DELETE')
  if (!res.ok) return failure(res)
  refresh()
  redirect('/proyectos')
}

// ── Acceso y miembros ────────────────────────────────────────────────────────

export type AccessPreview = { affected: { user_id: number; full_name: string; tasks: number }[]; tasks: number }

/** Vista previa (no cambia nada): responsables que perderían el acceso (D18). */
export async function previewProjectAccess(id: number, change: { visibility?: 'private' | 'organization'; remove_user_ids?: number[] }): Promise<ActionResult<AccessPreview>> {
  if (!validId(id)) return { ok: false, error: 'Proyecto inválido.' }
  const res = await apiAction<AccessPreview>(`/boards/${id}/access-preview/`, 'POST', {
    ...(change.visibility ? { visibility: change.visibility } : {}),
    remove_user_ids: (change.remove_user_ids ?? []).filter(validId),
  })
  if (!res.ok) return failure(res)
  return { ok: true, data: res.data }
}

export async function setProjectAccess(id: number, visibility: 'private' | 'organization', organizationRole: 'editor' | 'viewer'): Promise<ActionResult> {
  if (!validId(id)) return { ok: false, error: 'Proyecto inválido.' }
  const res = await apiAction(`/boards/${id}/`, 'PATCH', {
    visibility: visibility === 'private' ? 'private' : 'organization',
    organization_role: organizationRole === 'viewer' ? 'viewer' : 'editor',
  })
  if (!res.ok) return failure(res)
  refresh(id)
  return { ok: true, data: undefined }
}

export async function addProjectMember(id: number, userId: number, role: BoardRole): Promise<ActionResult> {
  if (!validId(id) || !validId(userId) || !ROLES.includes(role)) return { ok: false, error: 'Datos inválidos.' }
  const res = await apiAction(`/boards/${id}/members/`, 'POST', { user_id: userId, role })
  if (!res.ok) return failure(res)
  refresh(id)
  return { ok: true, data: undefined }
}

export async function changeProjectMemberRole(id: number, memberId: number, role: BoardRole): Promise<ActionResult> {
  if (!validId(id) || !validId(memberId) || !ROLES.includes(role)) return { ok: false, error: 'Datos inválidos.' }
  const res = await apiAction(`/boards/${id}/members/${memberId}/`, 'PATCH', { role })
  if (!res.ok) return failure(res)
  refresh(id)
  return { ok: true, data: undefined }
}

export async function removeProjectMember(id: number, memberId: number): Promise<ActionResult> {
  if (!validId(id) || !validId(memberId)) return { ok: false, error: 'Datos inválidos.' }
  const res = await apiAction(`/boards/${id}/members/${memberId}/`, 'DELETE')
  if (!res.ok) return failure(res)
  refresh(id)
  return { ok: true, data: undefined }
}

// ── Tablero ──────────────────────────────────────────────────────────────────
// Sin revalidatePath: el tablero aplica los cambios en forma optimista y, cuando termina
// la cola de operaciones, pide un refresco para sincronizar avance y menú lateral.

export async function createTask(boardId: number, columnId: number, title: string): Promise<ActionResult<Task>> {
  const clean = title.trim()
  if (!validId(boardId) || !validId(columnId)) return { ok: false, error: 'Datos inválidos.' }
  if (!clean) return { ok: false, error: 'Escribí un título para la tarea.' }
  const res = await apiAction<Task>(`/boards/${boardId}/tasks/`, 'POST', { title: clean.slice(0, 200), column: columnId })
  if (!res.ok && res.status === 404) return { ok: false, error: 'El proyecto ya no está disponible.' }
  if (!res.ok) return failure(res)
  return { ok: true, data: res.data }
}

/** Mover a `columnId` en el índice `position` (0 = arriba). La API renumera ambas columnas. */
export async function moveTask(taskId: number, columnId: number, position: number): Promise<ActionResult<Task>> {
  if (!validId(taskId) || !validId(columnId) || !Number.isInteger(position) || position < 0) {
    return { ok: false, error: 'Datos inválidos.' }
  }
  const res = await apiAction<Task>(`/tasks/${taskId}/move/`, 'POST', { column: columnId, position })
  if (!res.ok && res.status === 404) return { ok: false, error: GONE }
  if (!res.ok) return failure(res)
  return { ok: true, data: res.data }
}

const GONE = 'La tarea ya no existe: puede que alguien la haya eliminado.'
const PRIORITY_VALUES: Priority[] = ['low', 'medium', 'high', 'urgent']

export type TaskChanges = Partial<{
  title: string
  description: string
  priority: Priority
  start_date: string | null
  due_date: string | null
  assignee_ids: number[]
  repeat: Repeat
  label_ids: number[]
}>

const REPEATS: Repeat[] = ['none', 'daily', 'weekdays', 'weekly', 'monthly']

/** Guardado por campo desde el panel de la tarea (editor o más). */
export async function updateTask(taskId: number, changes: TaskChanges): Promise<ActionResult<Task>> {
  if (!validId(taskId)) return { ok: false, error: 'Tarea inválida.' }
  const body: Record<string, unknown> = {}
  if (changes.title !== undefined) {
    const title = changes.title.trim()
    if (!title) return { ok: false, error: 'El título es obligatorio.' }
    body.title = title.slice(0, 200)
  }
  if (changes.description !== undefined) body.description = changes.description.slice(0, 10_000)
  if (changes.priority !== undefined) {
    if (!PRIORITY_VALUES.includes(changes.priority)) return { ok: false, error: 'Prioridad inválida.' }
    body.priority = changes.priority
  }
  if (changes.start_date !== undefined) {
    if (!isDate(changes.start_date || null)) return { ok: false, error: 'Fecha inválida.' }
    body.start_date = changes.start_date || null
  }
  if (changes.due_date !== undefined) {
    if (!isDate(changes.due_date || null)) return { ok: false, error: 'Fecha inválida.' }
    body.due_date = changes.due_date || null
  }
  if (changes.label_ids !== undefined) body.label_ids = [...new Set(changes.label_ids.filter(validId))]
  if (changes.repeat !== undefined) {
    if (!REPEATS.includes(changes.repeat)) return { ok: false, error: 'Repetición inválida.' }
    body.repeat = changes.repeat
  }
  if (changes.assignee_ids !== undefined) body.assignee_ids = [...new Set(changes.assignee_ids.filter(validId))]
  const res = await apiAction<Task>(`/tasks/${taskId}/`, 'PATCH', body)
  if (!res.ok && res.status === 404) return { ok: false, error: GONE }
  if (!res.ok) return failure(res)
  return { ok: true, data: res.data }
}

export async function deleteTask(taskId: number): Promise<ActionResult> {
  if (!validId(taskId)) return { ok: false, error: 'Tarea inválida.' }
  const res = await apiAction(`/tasks/${taskId}/`, 'DELETE')
  if (!res.ok && res.status !== 404) return failure(res) // si ya no existía, el resultado es el mismo
  return { ok: true, data: undefined }
}

// ── Comentarios ──────────────────────────────────────────────────────────────

/** Seguir o dejar de seguir una tarea (cualquiera con acceso). */
export async function followTask(taskId: number, follow: boolean): Promise<ActionResult<boolean>> {
  if (!validId(taskId)) return { ok: false, error: 'Tarea inválida.' }
  const res = await apiAction<{ following: boolean }>(`/tasks/${taskId}/follow/`, follow ? 'POST' : 'DELETE')
  if (!res.ok && res.status === 404) return { ok: false, error: GONE }
  if (!res.ok) return failure(res)
  return { ok: true, data: res.data.following }
}

/** `mentionIds`: personas mencionadas con @ (la API descarta a quien no tenga acceso). */
export async function addComment(taskId: number, text: string, mentionIds: number[] = []): Promise<ActionResult<Comment>> {
  const clean = text.trim()
  if (!validId(taskId)) return { ok: false, error: 'Tarea inválida.' }
  if (!clean) return { ok: false, error: 'Escribí un comentario.' }
  const res = await apiAction<Comment>(`/tasks/${taskId}/comments/`, 'POST', { text: clean.slice(0, 5000), mention_ids: mentionIds.filter(validId) })
  if (!res.ok && res.status === 404) return { ok: false, error: GONE }
  if (!res.ok) return failure(res)
  return { ok: true, data: res.data }
}

export async function editComment(commentId: number, text: string, mentionIds: number[] = []): Promise<ActionResult<Comment>> {
  const clean = text.trim()
  if (!validId(commentId)) return { ok: false, error: 'Comentario inválido.' }
  if (!clean) return { ok: false, error: 'El comentario no puede quedar vacío.' }
  const res = await apiAction<Comment>(`/comments/${commentId}/`, 'PATCH', { text: clean.slice(0, 5000), mention_ids: mentionIds.filter(validId) })
  if (!res.ok && res.status === 404) return { ok: false, error: 'El comentario ya no existe.' }
  if (!res.ok) return failure(res)
  return { ok: true, data: res.data }
}

export async function deleteComment(commentId: number): Promise<ActionResult> {
  if (!validId(commentId)) return { ok: false, error: 'Comentario inválido.' }
  const res = await apiAction(`/comments/${commentId}/`, 'DELETE')
  if (!res.ok && res.status !== 404) return failure(res)
  return { ok: true, data: undefined }
}

// ── Columnas (líder) ─────────────────────────────────────────────────────────

const MAX_COLUMN_NAME = 40

export async function createColumn(boardId: number, name: string): Promise<ActionResult<Column>> {
  const clean = name.trim()
  if (!validId(boardId)) return { ok: false, error: 'Proyecto inválido.' }
  if (!clean) return { ok: false, error: 'Poné un nombre para la columna.' }
  const res = await apiAction<Column>(`/boards/${boardId}/columns/`, 'POST', { name: clean.slice(0, MAX_COLUMN_NAME) })
  if (!res.ok) return failure(res)
  return { ok: true, data: res.data }
}

export async function updateColumn(boardId: number, columnId: number, changes: { name?: string; is_done?: boolean }): Promise<ActionResult<Column>> {
  if (!validId(boardId) || !validId(columnId)) return { ok: false, error: 'Columna inválida.' }
  const body: Record<string, unknown> = {}
  if (changes.name !== undefined) {
    if (!changes.name.trim()) return { ok: false, error: 'El nombre es obligatorio.' }
    body.name = changes.name.trim().slice(0, MAX_COLUMN_NAME)
  }
  if (changes.is_done !== undefined) body.is_done = Boolean(changes.is_done)
  const res = await apiAction<Column>(`/boards/${boardId}/columns/${columnId}/`, 'PATCH', body)
  if (!res.ok) return failure(res)
  return { ok: true, data: res.data }
}

export async function reorderColumns(boardId: number, order: number[]): Promise<ActionResult> {
  if (!validId(boardId) || !order.every(validId)) return { ok: false, error: 'Datos inválidos.' }
  const res = await apiAction(`/boards/${boardId}/columns/reorder/`, 'POST', { order })
  if (!res.ok) return failure(res)
  return { ok: true, data: undefined }
}

/** Eliminar columna; si tiene tareas, `moveTo` indica a qué columna pasan. */
export async function deleteColumn(boardId: number, columnId: number, moveTo: number | null): Promise<ActionResult> {
  if (!validId(boardId) || !validId(columnId) || (moveTo !== null && !validId(moveTo))) return { ok: false, error: 'Datos inválidos.' }
  const res = await apiAction(`/boards/${boardId}/columns/${columnId}/${moveTo ? `?move_to=${moveTo}` : ''}`, 'DELETE')
  if (!res.ok) return failure(res)
  return { ok: true, data: undefined }
}

export type TaskDetailData = { taskId: number; comments: Comment[]; history: Activity[]; following: boolean; checklist: ChecklistItem[] }

/**
 * Comentarios e historial de una tarea, para abrir el panel sin volver a renderizar todo el
 * tablero en el servidor. null si no es de este proyecto o no hay acceso.
 */
export async function loadTaskDetail(projectId: number, taskId: number): Promise<ActionResult<TaskDetailData | null>> {
  if (!validId(projectId) || !validId(taskId)) return { ok: true, data: null }
  const [task, comments, history, follow, checklist] = await Promise.all([
    apiAction<Task>(`/tasks/${taskId}/`, 'GET'),
    apiAction<Page<Comment>>(`/tasks/${taskId}/comments/?page_size=200`, 'GET'),
    apiAction<Page<Activity>>(`/boards/${projectId}/activity/?task=${taskId}&page_size=100`, 'GET'),
    apiAction<{ following: boolean }>(`/tasks/${taskId}/follow/`, 'GET'),
    apiAction<ChecklistItem[]>(`/tasks/${taskId}/checklist/`, 'GET'),
  ])
  if (!task.ok || task.data.board !== projectId) return { ok: true, data: null }
  if (!comments.ok) return failure(comments)
  if (!history.ok) return failure(history)
  return { ok: true, data: { taskId, comments: comments.data.results, history: history.data.results, following: follow.ok && follow.data.following, checklist: checklist.ok ? checklist.data : [] } }
}

// ── Mi trabajo (Inicio y Mis tareas) ─────────────────────────────────────────

export type Completed = Task & { previous: { column: number; position: number } | null }

/** Marcar como hecha. `previous` permite deshacer moviéndola exactamente adonde estaba. */
export async function completeTask(taskId: number): Promise<ActionResult<Completed>> {
  if (!validId(taskId)) return { ok: false, error: 'Tarea inválida.' }
  const res = await apiAction<Completed>(`/tasks/${taskId}/complete/`, 'POST')
  if (!res.ok && res.status === 404) return { ok: false, error: GONE }
  if (!res.ok) return failure(res)
  return { ok: true, data: res.data }
}

export async function reopenTask(taskId: number): Promise<ActionResult<Task>> {
  if (!validId(taskId)) return { ok: false, error: 'Tarea inválida.' }
  const res = await apiAction<Task>(`/tasks/${taskId}/reopen/`, 'POST')
  if (!res.ok && res.status === 404) return { ok: false, error: GONE }
  if (!res.ok) return failure(res)
  return { ok: true, data: res.data }
}

/** Columnas de un proyecto, para el diálogo global "Nueva tarea". */
export async function getProjectColumns(boardId: number): Promise<ActionResult<Column[]>> {
  if (!validId(boardId)) return { ok: false, error: 'Proyecto inválido.' }
  const res = await apiAction<Project>(`/boards/${boardId}/`, 'GET')
  if (!res.ok) return failure(res)
  return { ok: true, data: [...(res.data.columns ?? [])].sort((a, b) => a.position - b.position) }
}

export type NewTaskInput = {
  boardId: number
  columnId: number | null
  title: string
  priority: Priority
  due_date: string | null
  assignToMe: boolean
  repeat?: Repeat
}

/** F7 — "+ Nueva tarea" global: proyecto → título → opcionales. */
export async function createTaskWithDetails(input: NewTaskInput): Promise<ActionResult<Task>> {
  const title = input.title.trim()
  if (!validId(input.boardId)) return { ok: false, error: 'Elegí un proyecto.', fields: { board: 'Elegí un proyecto.' } }
  if (!title) return { ok: false, error: 'Escribí un título para la tarea.', fields: { title: 'Este campo es obligatorio.' } }
  if (!PRIORITY_VALUES.includes(input.priority)) return { ok: false, error: 'Prioridad inválida.' }
  if (!isDate(input.due_date || null)) return { ok: false, error: 'Fecha inválida.' }
  const body: Record<string, unknown> = { title: title.slice(0, 200), priority: input.priority, due_date: input.due_date || null }
  if (input.repeat && input.repeat !== 'none' && REPEATS.includes(input.repeat)) body.repeat = input.repeat
  if (input.columnId !== null && validId(input.columnId)) body.column = input.columnId
  if (input.assignToMe) body.assignee_ids = [(await requireUser()).id] // de la sesión, no del cliente
  const res = await apiAction<Task>(`/boards/${input.boardId}/tasks/`, 'POST', body)
  if (!res.ok) return failure(res)
  revalidatePath('/', 'layout') // avance en el menú lateral, Inicio y Mis tareas
  return { ok: true, data: res.data }
}

/** Plantillas: duplicar un proyecto como punto de partida (también si está archivado). */
export async function duplicateProject(id: number, input: { title: string; includeTasks: boolean; includeMembers: boolean; keepDates: boolean }): Promise<ActionResult<{ id: number }>> {
  if (!validId(id)) return { ok: false, error: 'Proyecto inválido.' }
  const title = input.title.trim()
  if (!title) return { ok: false, error: 'Poné un nombre para el proyecto.', fields: { title: 'Este campo es obligatorio.' } }
  const res = await apiAction<{ id: number }>(`/boards/${id}/duplicate/`, 'POST', {
    title: title.slice(0, 100),
    include_tasks: Boolean(input.includeTasks),
    include_members: Boolean(input.includeMembers),
    keep_dates: Boolean(input.includeTasks && input.keepDates),
  })
  if (!res.ok) return failure(res)
  refresh(res.data.id)
  return { ok: true, data: res.data }
}

// ── Etiquetas ────────────────────────────────────────────────────────────────

const LABEL_COLOR_VALUES: LabelColor[] = ['gray', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple']

/** Crear etiqueta (editor). Se usa desde el panel de la tarea y la configuración. */
export async function createLabel(boardId: number, name: string, color: LabelColor): Promise<ActionResult<Label>> {
  const clean = name.trim()
  if (!validId(boardId)) return { ok: false, error: 'Proyecto inválido.' }
  if (!clean) return { ok: false, error: 'Poné un nombre para la etiqueta.' }
  const res = await apiAction<Label>(`/boards/${boardId}/labels/`, 'POST', {
    name: clean.slice(0, 30), color: LABEL_COLOR_VALUES.includes(color) ? color : 'gray',
  })
  if (!res.ok) return failure(res)
  return { ok: true, data: res.data }
}

/** Renombrar o cambiar el color (líder). */
export async function updateLabel(boardId: number, labelId: number, changes: { name?: string; color?: LabelColor }): Promise<ActionResult<Label>> {
  if (!validId(boardId) || !validId(labelId)) return { ok: false, error: 'Etiqueta inválida.' }
  const body: Record<string, unknown> = {}
  if (changes.name !== undefined) {
    if (!changes.name.trim()) return { ok: false, error: 'El nombre es obligatorio.' }
    body.name = changes.name.trim().slice(0, 30)
  }
  if (changes.color !== undefined && LABEL_COLOR_VALUES.includes(changes.color)) body.color = changes.color
  const res = await apiAction<Label>(`/boards/${boardId}/labels/${labelId}/`, 'PATCH', body)
  if (!res.ok) return failure(res)
  refresh(boardId)
  return { ok: true, data: res.data }
}

/** Eliminar (líder): se quita de todas las tareas del proyecto. */
export async function deleteLabel(boardId: number, labelId: number): Promise<ActionResult> {
  if (!validId(boardId) || !validId(labelId)) return { ok: false, error: 'Etiqueta inválida.' }
  const res = await apiAction(`/boards/${boardId}/labels/${labelId}/`, 'DELETE')
  if (!res.ok && res.status !== 404) return failure(res)
  refresh(boardId)
  return { ok: true, data: undefined }
}

// ── Checklist ────────────────────────────────────────────────────────────────

export async function addChecklistItem(taskId: number, text: string): Promise<ActionResult<ChecklistItem>> {
  const clean = text.trim()
  if (!validId(taskId)) return { ok: false, error: 'Tarea inválida.' }
  if (!clean) return { ok: false, error: 'Escribí el ítem.' }
  const res = await apiAction<ChecklistItem>(`/tasks/${taskId}/checklist/`, 'POST', { text: clean.slice(0, 200) })
  if (!res.ok && res.status === 404) return { ok: false, error: GONE }
  if (!res.ok) return failure(res)
  return { ok: true, data: res.data }
}

export async function updateChecklistItem(itemId: number, changes: { text?: string; done?: boolean }): Promise<ActionResult<ChecklistItem>> {
  if (!validId(itemId)) return { ok: false, error: 'Ítem inválido.' }
  const body: Record<string, unknown> = {}
  if (changes.text !== undefined) {
    if (!changes.text.trim()) return { ok: false, error: 'El ítem no puede quedar vacío.' }
    body.text = changes.text.trim().slice(0, 200)
  }
  if (changes.done !== undefined) body.done = Boolean(changes.done)
  const res = await apiAction<ChecklistItem>(`/checklist/${itemId}/`, 'PATCH', body)
  if (!res.ok && res.status === 404) return { ok: false, error: 'El ítem ya no existe.' }
  if (!res.ok) return failure(res)
  return { ok: true, data: res.data }
}

export async function deleteChecklistItem(itemId: number): Promise<ActionResult> {
  if (!validId(itemId)) return { ok: false, error: 'Ítem inválido.' }
  const res = await apiAction(`/checklist/${itemId}/`, 'DELETE')
  if (!res.ok && res.status !== 404) return failure(res)
  return { ok: true, data: undefined }
}

// ── Equipos con acceso al proyecto (líder) ──────────────────────────────────

export type ProjectTeam = { id: number; role: BoardRole; team: { id: number; name: string; members: { id: number; full_name: string; email: string }[] } }

export async function addProjectTeam(boardId: number, teamId: number, role: BoardRole): Promise<ActionResult> {
  if (!validId(boardId) || !validId(teamId) || !ROLES.includes(role)) return { ok: false, error: 'Datos inválidos.' }
  const res = await apiAction(`/boards/${boardId}/teams/`, 'POST', { team_id: teamId, role })
  if (!res.ok) return failure(res)
  refresh(boardId)
  return { ok: true, data: undefined }
}

export async function changeProjectTeamRole(boardId: number, accessId: number, role: BoardRole): Promise<ActionResult> {
  if (!validId(boardId) || !validId(accessId) || !ROLES.includes(role)) return { ok: false, error: 'Datos inválidos.' }
  const res = await apiAction(`/boards/${boardId}/teams/${accessId}/`, 'PATCH', { role })
  if (!res.ok) return failure(res)
  refresh(boardId)
  return { ok: true, data: undefined }
}

/** Quitar el acceso del equipo: quienes solo entraban por él lo pierden (y sus asignaciones, D18). */
export async function removeProjectTeam(boardId: number, accessId: number): Promise<ActionResult> {
  if (!validId(boardId) || !validId(accessId)) return { ok: false, error: 'Datos inválidos.' }
  const res = await apiAction(`/boards/${boardId}/teams/${accessId}/`, 'DELETE')
  if (!res.ok && res.status !== 404) return failure(res)
  refresh(boardId)
  return { ok: true, data: undefined }
}
