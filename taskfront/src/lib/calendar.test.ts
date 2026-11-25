import assert from 'node:assert/strict'
import { test } from 'node:test'

import { mondayOf, monthGrid, movedDates, parseMonth, parseWeek, shiftMonth, shiftWeek, tasksByDay, weekDays } from './calendar.ts'

test('grilla del mes de lunes a domingo', () => {
  const g = monthGrid('2026-11') // 1/11/2026 es domingo
  assert.equal(g[0][0], '2026-10-26')
  assert.equal(g[0][6], '2026-11-01')
  assert.equal(g[g.length - 1][6], '2026-12-06')
  assert.ok(g.every((w) => w.length === 7))
  assert.equal(shiftMonth('2026-12', 1), '2027-01')
  assert.equal(parseMonth('2026-13', '2026-11-25'), '2026-11')
})

test('tareas en los días entre inicio y vencimiento', () => {
  const days = monthGrid('2026-11').flat()
  const t = (id: number, start: string | null, due: string | null) => ({ id, title: '', color: '', done: false, start_date: start, due_date: due })
  const map = tasksByDay([t(1, '2026-11-02', '2026-11-04'), t(2, null, '2026-11-03'), t(3, null, null)], days)
  assert.deepEqual(map.get('2026-11-03')!.map((x) => x.id), [1, 2])
  assert.deepEqual(map.get('2026-11-05')!.map((x) => x.id), [])
})

test('semana: lunes, desplazamiento y validación', () => {
  assert.equal(mondayOf('2026-11-25'), '2026-11-23')
  assert.equal(mondayOf('2026-11-29'), '2026-11-23') // domingo
  assert.equal(parseWeek('2026-11-27'), '2026-11-23')
  assert.equal(parseWeek('2026-02-30'), null)
  assert.equal(parseWeek('x'), null)
  assert.equal(shiftWeek('2026-12-28', 1), '2027-01-04')
  assert.deepEqual(weekDays('2026-11-30').slice(-1), ['2026-12-06'])
})

test('arrastrar: corre la tarea entera o le pone vencimiento', () => {
  const t = { start_date: '2026-11-23', due_date: '2026-11-25' }
  assert.deepEqual(movedDates(t, '2026-11-24', '2026-11-30'), { start_date: '2026-11-29', due_date: '2026-12-01' })
  assert.equal(movedDates(t, '2026-11-24', '2026-11-24'), null)
  assert.deepEqual(movedDates({ start_date: null, due_date: '2026-11-25' }, '2026-11-25', '2026-11-20'), { due_date: '2026-11-20' })
  assert.deepEqual(movedDates({ start_date: null, due_date: null }, null, '2026-11-26'), { due_date: '2026-11-26' })
})
