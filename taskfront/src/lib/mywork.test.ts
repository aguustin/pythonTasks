import assert from 'node:assert/strict'
import { test } from 'node:test'

import { addDays, bucketOf, groupMyTasks, nextMonday, rescheduled, type MyTask } from './mywork.ts'

const today = '2026-11-25'
const t = (id: number, due: string | null, extra: Partial<MyTask> = {}) => ({
  id, board: 1, column: 1, title: `T${id}`, description: '', priority: 'medium', due_date: due, assignees: [], position: 0,
  completed_at: null, comments_count: 0, board_title: 'P', board_color: '', organization: 1, column_name: 'Pendiente', is_done: false,
  ...extra,
} as MyTask)

test('grupos con los mismos límites que los contadores de Inicio', () => {
  assert.equal(bucketOf(t(1, '2026-11-24'), today), 'overdue')
  assert.equal(bucketOf(t(1, today), today), 'today')
  assert.equal(bucketOf(t(1, '2026-11-26'), today), 'week')
  assert.equal(bucketOf(t(1, '2026-12-02'), today), 'week') // hoy + 7
  assert.equal(bucketOf(t(1, '2026-12-03'), today), 'later')
  assert.equal(bucketOf(t(1, null), today), 'none')
  assert.equal(bucketOf(t(1, '2026-11-01', { is_done: true }), today), 'done') // terminada: sin alarma
})

test('agrupa en orden fijo, omite vacíos y ordena por vencimiento y prioridad', () => {
  const groups = groupMyTasks([
    t(1, null), t(2, today), t(3, today, { priority: 'urgent' }), t(4, '2026-11-20'), t(5, '2026-11-30', { is_done: true }),
  ], today)
  assert.deepEqual(groups.map((g) => [g.label, g.tasks.map((x) => x.id)]), [
    ['Vencidas', [4]], ['Hoy', [3, 2]], ['Sin fecha', [1]], ['Terminadas', [5]],
  ])
})

test('reprogramar: días, próximo lunes y el inicio se corre con el vencimiento', () => {
  assert.equal(addDays('2026-02-28', 1), '2026-03-01')
  assert.equal(nextMonday('2026-11-25'), '2026-11-30') // miércoles
  assert.equal(nextMonday('2026-11-30'), '2026-12-07') // lunes → el siguiente
  assert.deepEqual(rescheduled({ start_date: '2026-11-20', due_date: '2026-11-22' }, '2026-11-30'), { due_date: '2026-11-30', start_date: '2026-11-28' })
  assert.deepEqual(rescheduled({ start_date: '2026-12-10', due_date: null }, '2026-12-01'), { due_date: '2026-12-01', start_date: '2026-12-01' })
  assert.deepEqual(rescheduled({ start_date: '2026-11-20', due_date: '2026-11-22' }, null), { due_date: null })
})
