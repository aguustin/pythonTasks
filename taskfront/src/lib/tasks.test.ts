import assert from 'node:assert/strict'
import { test } from 'node:test'

import { canMoveTask, dueLabel, dueState, groupByColumn, locate, moveInGroups, type Column, type Task } from './tasks.ts'

const today = '2026-11-24'

test('estado del vencimiento', () => {
  assert.equal(dueState('2026-11-23', false, today), 'late')
  assert.equal(dueState('2026-11-24', false, today), 'today')
  assert.equal(dueState('2026-11-27', false, today), 'soon')
  assert.equal(dueState('2026-11-28', false, today), 'later')
  assert.equal(dueState('2026-11-20', true, today), null) // terminada: sin alarma
  assert.equal(dueState(null, false, today), null)
})

test('etiqueta del vencimiento', () => {
  assert.equal(dueLabel('2026-11-24', today), 'Hoy')
  assert.equal(dueLabel('2026-11-25', today), 'Mañana')
  assert.equal(dueLabel('2026-11-23', today), 'Ayer')
  assert.match(dueLabel('2026-12-12', today), /12/)
  assert.match(dueLabel('2027-01-05', today), /2027/)
})

test('permisos para mover', () => {
  const task = { assignees: [{ id: 7, email: '', full_name: '' }] }
  assert.equal(canMoveTask('editor', task, 1, false), true)
  assert.equal(canMoveTask('viewer', task, 7, false), true)
  assert.equal(canMoveTask('viewer', task, 1, false), false)
  assert.equal(canMoveTask('admin', task, 1, true), false) // archivado
})

const cols: Column[] = [
  { id: 1, name: 'A', color: '', position: 0, is_done: false },
  { id: 2, name: 'B', color: '', position: 1, is_done: true },
]
const t = (id: number, column: number, position: number) => ({ id, column, position } as Task)

test('agrupar respeta la posición', () => {
  assert.deepEqual(groupByColumn(cols, [t(3, 1, 1), t(4, 1, 0), t(5, 2, 0)]), { 1: [4, 3], 2: [5] })
})

test('mover entre columnas y dentro de una columna', () => {
  const g = { 1: [10, 11, 12], 2: [20] }
  assert.deepEqual(moveInGroups(g, 11, 2, 0), { 1: [10, 12], 2: [11, 20] })
  assert.deepEqual(moveInGroups(g, 10, 1, 2), { 1: [11, 12, 10], 2: [20] })
  assert.deepEqual(moveInGroups(g, 12, 2, 99), { 1: [10, 11], 2: [20, 12] }) // índice fuera de rango: al final
  assert.deepEqual(g, { 1: [10, 11, 12], 2: [20] }) // inmutable
  assert.deepEqual(locate(g, 12), { column: 1, index: 2 })
  assert.equal(locate(g, 99), null)
})
