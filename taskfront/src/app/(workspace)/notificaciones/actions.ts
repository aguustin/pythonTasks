'use server'

import { failure, type ActionResult } from '@/lib/forms'
import { apiAction } from '@/lib/server/dal'
import { requireActiveOrganization } from '@/lib/server/organization'

/** Cantidad de avisos sin leer en la organización activa (para el contador del menú). */
export async function getUnreadCount(): Promise<number> {
  const org = await requireActiveOrganization()
  const res = await apiAction<{ count: number }>(`/notifications/unread-count/?organization=${org.id}`, 'GET')
  return res.ok ? res.data.count : 0
}

export async function markNotificationRead(id: number): Promise<ActionResult> {
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: 'Aviso inválido.' }
  const res = await apiAction(`/notifications/${id}/read/`, 'POST')
  if (!res.ok) return failure(res)
  return { ok: true, data: undefined }
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const org = await requireActiveOrganization()
  const res = await apiAction(`/notifications/read-all/?organization=${org.id}`, 'POST')
  if (!res.ok) return failure(res)
  return { ok: true, data: undefined }
}
