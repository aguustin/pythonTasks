import assert from 'node:assert/strict'
import { test } from 'node:test'

import { jwtExp, needsRefresh, openSession, sealSession, type SessionData } from './codec.ts'

const SECRET = 'a'.repeat(40)
const jwt = (payload: object) =>
  `x.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.y`

const data: SessionData = {
  access: jwt({ exp: 2000 }),
  refresh: 'r.r.r',
  accessExp: 2000,
  user: { id: 1, email: 'ana@test.com', full_name: 'Ana' },
}

test('sella y abre la sesión', () => {
  assert.deepEqual(openSession(sealSession(data, SECRET), SECRET), data)
})

test('cada sellado es distinto (IV aleatorio)', () => {
  assert.notEqual(sealSession(data, SECRET), sealSession(data, SECRET))
})

test('no expone los tokens en claro', () => {
  const sealed = sealSession(data, SECRET)
  assert.ok(!sealed.includes('ana@test.com'))
  assert.ok(!Buffer.from(sealed.slice(3), 'base64url').toString('latin1').includes(data.refresh))
})

test('rechaza clave equivocada, alteraciones y formatos inválidos', () => {
  const sealed = sealSession(data, SECRET)
  assert.equal(openSession(sealed, 'b'.repeat(40)), null)
  const raw = Buffer.from(sealed.slice(3), 'base64url')
  raw[raw.length - 1] ^= 1
  assert.equal(openSession(`v1.${raw.toString('base64url')}`, SECRET), null)
  for (const bad of [undefined, '', 'v1.', 'v2.abc', 'basura']) assert.equal(openSession(bad, SECRET), null)
})

test('exige un secreto de al menos 32 caracteres', () => {
  assert.throws(() => sealSession(data, 'corto'))
})

test('lee exp del JWT y decide cuándo renovar', () => {
  assert.equal(jwtExp(jwt({ exp: 1234 })), 1234)
  assert.equal(jwtExp('no-es-jwt'), 0)
  assert.equal(needsRefresh(data, 1900), false)
  assert.equal(needsRefresh(data, 1950), true) // dentro del margen de 60 s
})
