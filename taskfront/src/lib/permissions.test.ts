import assert from 'node:assert/strict'
import { test } from 'node:test'

import { assignableRoles, canCreateProjects, canManageMember, canUndoRoleChange, invitableRoles } from './permissions.ts'

test('quién gestiona a quién (igual que la API)', () => {
  assert.equal(canManageMember('owner', 'owner', false), true)
  assert.equal(canManageMember('owner', 'admin', true), false) // a sí mismo nunca
  assert.equal(canManageMember('admin', 'member', false), true)
  assert.equal(canManageMember('admin', 'admin', false), false)
  assert.equal(canManageMember('admin', 'owner', false), false)
  assert.equal(canManageMember('member', 'member', false), false)
})

test('roles asignables e invitables', () => {
  assert.deepEqual(assignableRoles('owner'), ['owner', 'admin', 'member', 'guest'])
  assert.deepEqual(assignableRoles('admin'), ['admin', 'member', 'guest'])
  assert.deepEqual(assignableRoles('member'), [])
  assert.deepEqual(invitableRoles('admin'), ['member', 'admin', 'guest'])
  assert.equal(canManageMember('admin', 'guest', false), true)
  assert.equal(canCreateProjects({ my_role: 'member', project_creation: 'members' }), true)
  assert.equal(canCreateProjects({ my_role: 'member', project_creation: 'managers' }), false)
  assert.equal(canCreateProjects({ my_role: 'admin', project_creation: 'managers' }), true)
  assert.equal(canCreateProjects({ my_role: 'guest', project_creation: 'members' }), false)
  assert.deepEqual(invitableRoles('member'), [])
})

test('deshacer un cambio de rol solo si el actor puede revertirlo', () => {
  assert.equal(canUndoRoleChange('owner', 'admin'), true)
  assert.equal(canUndoRoleChange('admin', 'admin'), false) // un admin no puede bajar a otro admin
  assert.equal(canUndoRoleChange('admin', 'member'), true)
})
