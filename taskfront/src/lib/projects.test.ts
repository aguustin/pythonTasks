import assert from 'node:assert/strict'
import { test } from 'node:test'

import { accessLabel, isLate, progress } from './projects.ts'

test('avance redondeado y sin tareas = 0', () => {
  assert.equal(progress({ tasks_done: 0, tasks_total: 0 }), 0)
  assert.equal(progress({ tasks_done: 18, tasks_total: 26 }), 69)
})

test('atrasado solo con fin pasado y sin finalizar', () => {
  assert.equal(isLate({ due_date: '2026-11-20', status: 'active' }, '2026-11-24'), true)
  assert.equal(isLate({ due_date: '2026-11-20', status: 'completed' }, '2026-11-24'), false)
  assert.equal(isLate({ due_date: '2026-11-24', status: 'active' }, '2026-11-24'), false)
  assert.equal(isLate({ due_date: null, status: 'on_hold' }, '2026-11-24'), false)
})

test('alcance de acceso en palabras', () => {
  assert.equal(accessLabel({ visibility: 'private', organization_role: 'editor' }), 'Solo miembros del proyecto')
  assert.equal(accessLabel({ visibility: 'organization', organization_role: 'viewer' }), 'Toda la organización · solo ver')
})
