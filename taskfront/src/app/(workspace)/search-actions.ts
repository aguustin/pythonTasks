'use server'

import { apiAction } from '@/lib/server/dal'
import { requireActiveOrganization } from '@/lib/server/organization'

export type SearchResults = {
  projects: { id: number; title: string; color: string }[]
  tasks: { id: number; title: string; board: number; board_title: string; board_color: string; column_name: string; is_done: boolean; due_date: string | null }[]
}

const EMPTY: SearchResults = { projects: [], tasks: [] }

/** Búsqueda global en la organización activa (solo lo que la persona puede ver; lo filtra la API). */
export async function searchAll(query: string): Promise<SearchResults> {
  const q = query.trim().slice(0, 100)
  if (q.length < 2) return EMPTY
  const org = await requireActiveOrganization()
  const res = await apiAction<SearchResults>(`/search/?organization=${org.id}&q=${encodeURIComponent(q)}`, 'GET')
  return res.ok ? res.data : EMPTY
}
