'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { errorsFrom, failure, text, type ActionResult, type FormState } from '@/lib/forms'
import { apiAction } from '@/lib/server/dal'
import { requireActiveOrganization } from '@/lib/server/organization'

export async function renameOrganization(_prev: FormState, form: FormData): Promise<FormState> {
  const name = text(form, 'name')
  if (!name) return { errors: { fields: { name: 'El nombre es obligatorio.' } }, values: { name } }
  const org = await requireActiveOrganization()
  const res = await apiAction<{ name: string }>(`/organizations/${org.id}/`, 'PATCH', { name })
  if (!res.ok) return { errors: errorsFrom(res), values: { name } }
  revalidatePath('/', 'layout')
  return { success: 'Guardamos el nombre de la organización.', values: { name: res.data.name } }
}

/** D4: quién puede crear proyectos (propietarios y administradores). */
export async function setProjectCreation(value: 'members' | 'managers'): Promise<ActionResult> {
  if (value !== 'members' && value !== 'managers') return { ok: false, error: 'Opción inválida.' }
  const org = await requireActiveOrganization()
  const res = await apiAction(`/organizations/${org.id}/`, 'PATCH', { project_creation: value })
  if (!res.ok) return failure(res)
  revalidatePath('/', 'layout')
  return { ok: true, data: undefined }
}

/** Eliminar la organización activa. Se exige el nombre exacto también en el servidor. */
export async function deleteOrganization(confirmName: string): Promise<ActionResult> {
  const org = await requireActiveOrganization()
  if (confirmName.trim() !== org.name) return { ok: false, error: 'El nombre no coincide.' }
  const res = await apiAction(`/organizations/${org.id}/`, 'DELETE')
  if (!res.ok) return failure(res)
  revalidatePath('/', 'layout')
  redirect('/inicio')
}
