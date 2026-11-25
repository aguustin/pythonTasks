import { Board } from '@/components/board/Board'
import { PageBody } from '@/components/ui/PageHeader'
import { todayISO } from '@/lib/projects'
import { requireUser } from '@/lib/server/dal'
import { getLabels, getPeople, getProject, getTaskDetail, getTasks } from '@/lib/server/projects'

type Params = Promise<{ id: string }>
type Search = Promise<Record<string, string | string[] | undefined>>

/**
 * Tablero, Lista y Calendario comparten datos, filtros, panel de la tarea (?tarea=) y la cola de
 * cambios: solo cambia cómo se muestran las tareas.
 */
export async function ProjectView({ params, searchParams, view }: { params: Params; searchParams: Search; view: 'board' | 'list' | 'calendar' }) {
  const id = Number((await params).id)
  const project = await getProject(id) // 404 si no existe o no hay acceso
  const tarea = (await searchParams).tarea
  const taskId = Number(Array.isArray(tarea) ? tarea[0] : tarea)
  const [tasks, people, user, detail, labels] = await Promise.all([
    getTasks(id),
    getPeople(id),
    requireUser(),
    taskId ? getTaskDetail(id, taskId) : Promise.resolve(null),
    getLabels(id),
  ])
  const columns = [...(project.columns ?? [])].sort((a, b) => a.position - b.position)
  return (
    <PageBody className={view === 'board' ? 'pb-0!' : ''}>
      <Board
        view={view}
        projectId={project.id}
        projectColor={project.color}
        columns={columns}
        tasks={tasks}
        role={project.my_role}
        me={{ id: user.id, email: user.email, full_name: user.full_name }}
        archived={Boolean(project.archived_at)}
        today={todayISO()}
        people={people}
        labels={labels}
        detail={detail && { taskId: detail.task.id, comments: detail.comments, history: detail.history, following: detail.following, checklist: detail.checklist }}
      />
    </PageBody>
  )
}
