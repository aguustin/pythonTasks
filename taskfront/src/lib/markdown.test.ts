import assert from 'node:assert/strict'
import { test } from 'node:test'

import { parseInline, parseMarkdown, plainText, safeHref } from './markdown.ts'

test('solo enlaces http(s) y mailto (nada de javascript: ni data:)', () => {
  assert.equal(safeHref('https://a.com/x'), 'https://a.com/x')
  assert.equal(safeHref('mailto:x@a.com'), 'mailto:x@a.com')
  assert.equal(safeHref('www.a.com'), 'https://www.a.com')
  assert.equal(safeHref('javascript:alert(1)'), null)
  assert.equal(safeHref('JaVaScRiPt:alert(1)'), null)
  assert.equal(safeHref('data:text/html,x'), null)
  assert.deepEqual(parseInline('[clic](javascript:alert(1))'), [{ t: 'text', v: '[clic](javascript:alert(1))' }])
})

test('marcas en línea', () => {
  assert.deepEqual(parseInline('a **b** _c_ `d`'), [
    { t: 'text', v: 'a ' }, { t: 'strong', c: [{ t: 'text', v: 'b' }] }, { t: 'text', v: ' ' },
    { t: 'em', c: [{ t: 'text', v: 'c' }] }, { t: 'text', v: ' ' }, { t: 'code', v: 'd' },
  ])
  assert.deepEqual(parseInline('ver https://a.com.'), [
    { t: 'text', v: 'ver ' }, { t: 'link', href: 'https://a.com', c: [{ t: 'text', v: 'https://a.com' }] }, { t: 'text', v: '.' },
  ])
  assert.deepEqual(parseInline('nombre_de_archivo'), [{ t: 'text', v: 'nombre_de_archivo' }])
  assert.deepEqual(parseInline('2 * 3 * 4'), [{ t: 'text', v: '2 * 3 * 4' }])
})

test('bloques y texto plano existente', () => {
  assert.deepEqual(parseMarkdown('Hola\nchau').map((b) => b.t), ['p'])
  assert.deepEqual(parseMarkdown('## Pasos\n- uno\n- dos\n\n1. a\n2. b\n> ojo').map((b) => b.t), ['h', 'ul', 'ol', 'quote'])
  assert.equal(plainText('**Reponer** la _góndola_'), 'Reponer la góndola')
})
