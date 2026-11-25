import assert from 'node:assert/strict'
import { test } from 'node:test'

import { activityText, dayHeading, groupByDay, joinEs, stamp } from './activity.ts'

const a = (verb: string, data: Record<string, unknown> = {}) => ({ verb, verb_display: 'X', data })

test('textos de actividad', () => {
  assert.equal(activityText(a('task_moved', { title: 'Pan', from_column: 'Pendiente', to_column: 'Hecho' })), 'movió «Pan» de Pendiente a Hecho')
  assert.equal(activityText(a('task_moved', { title: 'Pan', from_column: 'Pendiente', to_column: 'Hecho' }), true), 'la movió de Pendiente a Hecho')
  assert.equal(activityText(a('task_updated', { title: 'Pan', fields: ['due_date', 'priority'] }), true), 'cambió el vencimiento y la prioridad')
  assert.equal(activityText(a('task_updated', { title: 'Pan', fields: ['assignees'] })), 'cambió los responsables de «Pan»')
  assert.equal(activityText(a('member_added', { user: 'Eva', role: 'viewer' })), 'sumó a Eva como lector')
  assert.equal(activityText(a('assignees_removed', { users: [{ full_name: 'Eva', tasks: 2 }] })), 'quitó como responsables a Eva (ya no tienen acceso)')
  assert.equal(activityText(a('otro_verbo')), 'x')
})

test('unir en español', () => {
  assert.equal(joinEs(['a']), 'a')
  assert.equal(joinEs(['a', 'b', 'c']), 'a, b y c')
})

test('días y horas en la zona de la organización', () => {
  assert.equal(dayHeading('2026-11-24', '2026-11-24'), 'Hoy')
  assert.equal(dayHeading('2026-11-23', '2026-11-24'), 'Ayer')
  assert.match(dayHeading('2026-11-20', '2026-11-24'), /20 de noviembre/)
  // 02:30 UTC del 25 = 23:30 del 24 en Buenos Aires
  assert.equal(stamp('2026-11-25T02:30:00Z', '2026-11-24'), 'Hoy · 23:30')
  const g = groupByDay([{ created_at: '2026-11-24T15:00:00Z' }, { created_at: '2026-11-24T13:00:00Z' }, { created_at: '2026-11-23T13:00:00Z' }])
  assert.deepEqual(g.map((x) => [x.day, x.items.length]), [['2026-11-24', 2], ['2026-11-23', 1]])
})
