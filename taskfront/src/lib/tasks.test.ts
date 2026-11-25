import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  activeFilters, canMoveTask, dueLabel, dueState, EMPTY_FILTERS, groupByColumn, locate, matchesFilters, moveInGroups,
  parseFilters, writeFilters, type Column, type Task,
} from './tasks.ts'

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

const task = (over: Partial<Task>): Task => ({
  id: 1, board: 1, column: 1, title: 'Reponer gaseosas', description: 'Revisar la cámara', priority: 'medium',
  due_date: null, assignees: [], position: 0, completed_at: null, comments_count: 0, ...over,
})
const ctx = { userId: 7, today, done: false }

test('filtros: texto sin acentos en título y descripción', () => {
  assert.equal(matchesFilters(task({}), { ...EMPTY_FILTERS, q: 'CAMARA' }, ctx), true)
  assert.equal(matchesFilters(task({}), { ...EMPTY_FILTERS, q: 'leche' }, ctx), false)
})

test('filtros: responsables y solo mis tareas', () => {
  const mine = task({ assignees: [{ id: 7, email: '', full_name: 'Eva' }] })
  assert.equal(matchesFilters(mine, { ...EMPTY_FILTERS, mine: true }, ctx), true)
  assert.equal(matchesFilters(task({}), { ...EMPTY_FILTERS, mine: true }, ctx), false)
  assert.equal(matchesFilters(task({}), { ...EMPTY_FILTERS, assignee: 'none' }, ctx), true)
  assert.equal(matchesFilters(mine, { ...EMPTY_FILTERS, assignee: 'none' }, ctx), false)
  assert.equal(matchesFilters(mine, { ...EMPTY_FILTERS, assignee: '7' }, ctx), true)
  assert.equal(matchesFilters(mine, { ...EMPTY_FILTERS, assignee: '8' }, ctx), false)
})

test('filtros: vencimiento con la semántica de la API', () => {
  const late = task({ due_date: '2026-11-20' })
  assert.equal(matchesFilters(late, { ...EMPTY_FILTERS, due: 'overdue' }, ctx), true)
  assert.equal(matchesFilters(late, { ...EMPTY_FILTERS, due: 'overdue' }, { ...ctx, done: true }), false)
  assert.equal(matchesFilters(task({ due_date: today }), { ...EMPTY_FILTERS, due: 'today' }, ctx), true)
  assert.equal(matchesFilters(task({ due_date: '2026-12-01' }), { ...EMPTY_FILTERS, due: 'week' }, ctx), true)
  assert.equal(matchesFilters(task({ due_date: '2026-12-02' }), { ...EMPTY_FILTERS, due: 'week' }, ctx), false)
  assert.equal(matchesFilters(task({}), { ...EMPTY_FILTERS, due: 'none' }, ctx), true)
  assert.equal(matchesFilters(task({ priority: 'urgent' }), { ...EMPTY_FILTERS, priority: 'high' }, ctx), false)
})

test('filtros: lectura y escritura en la URL', () => {
  const p = new URLSearchParams('tarea=5&responsable=x&prioridad=urgent&vence=week&mias=1&q=pan')
  const f = parseFilters(p)
  assert.deepEqual(f, { q: 'pan', assignee: '', priority: 'urgent', due: 'week', mine: true })
  assert.equal(activeFilters(f), 4)
  assert.equal(writeFilters(p, EMPTY_FILTERS).toString(), 'tarea=5')
})
