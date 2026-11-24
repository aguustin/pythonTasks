import assert from 'node:assert/strict'
import { test } from 'node:test'

import { toFormErrors, UNKNOWN_ERROR } from './errors.ts'

test('errores por campo de DRF', () => {
  assert.deepEqual(
    toFormErrors(400, { email: ['Ya existe una cuenta con este email.'], password: ['Muy corta.', 'Muy común.'] }),
    { message: undefined, fields: { email: 'Ya existe una cuenta con este email.', password: 'Muy corta.' } },
  )
})

test('detail y non_field_errors van al mensaje general', () => {
  assert.deepEqual(toFormErrors(401, { detail: 'Email o contraseña incorrectos.', code: 'x' }), {
    message: 'Email o contraseña incorrectos.',
    fields: undefined,
  })
  assert.equal(toFormErrors(400, { non_field_errors: ['No coincide.'] }).message, 'No coincide.')
})

test('429 y 5xx usan un mensaje humano', () => {
  assert.match(toFormErrors(429, { detail: 'Request was throttled. Expected available in 30 seconds.' }).message!, /demasiados intentos/)
  assert.equal(toFormErrors(500, '<html>').message, UNKNOWN_ERROR)
})

test('respuesta vacía usa el texto por estado', () => {
  assert.match(toFormErrors(404, null).message!, /No encontramos/)
  assert.match(toFormErrors(403, {}).message!, /permiso/)
})
