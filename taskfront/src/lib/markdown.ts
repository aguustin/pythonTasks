/**
 * Formato de las descripciones: un Markdown chico, a propósito.
 * Se guarda como texto (lo existente se sigue viendo igual) y se convierte a un árbol que se
 * dibuja con elementos de React: nunca se inyecta HTML, así que no hay forma de colar scripts.
 * Los enlaces solo pueden ser http(s) o mailto.
 *
 * Bloques: párrafos (un salto de línea = salto de línea), # / ## / ### títulos, - listas,
 * 1. listas numeradas, > citas. En línea: **negrita**, *cursiva* o _cursiva_, ~~tachado~~,
 * `código`, [texto](url) y direcciones web sueltas.
 */

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'code'; v: string }
  | { t: 'strong' | 'em' | 'del'; c: Inline[] }
  | { t: 'link'; href: string; c: Inline[] }

export type Block =
  | { t: 'p'; lines: Inline[][] }
  | { t: 'h'; level: 1 | 2 | 3; c: Inline[] }
  | { t: 'ul'; items: Inline[][] }
  | { t: 'ol'; start: number; items: Inline[][] }
  | { t: 'quote'; lines: Inline[][] }

/** Solo enlaces web y de email. Cualquier otro esquema (javascript:, data:…) no es enlace. */
export function safeHref(raw: string): string | null {
  const url = raw.trim()
  if (/^https?:\/\/[^\s]+$/i.test(url) || /^mailto:[^\s]+$/i.test(url)) return url
  if (/^www\.[^\s]+$/i.test(url)) return `https://${url}`
  return null
}

const INLINE = new RegExp([
  /`([^`\n]+)`/.source, // 1 código
  /\*\*(?=\S)([^\n]*?\S)\*\*/.source, // 2 negrita
  /~~(?=\S)([^\n]*?\S)~~/.source, // 3 tachado
  /\[([^\]\n]+)\]\(([^)\s]+)\)/.source, // 4,5 enlace
  /((?:https?:\/\/|www\.)[^\s<>()]*[^\s<>().,;:!?'"*_~])/.source, // 6 dirección suelta
  /\*(?=\S)([^*\n]*?\S)\*/.source, // 7 cursiva
  /(?<![\p{L}\p{N}])_(?=\S)([^_\n]*?\S)_(?![\p{L}\p{N}])/u.source, // 8 cursiva (no dentro de palabras: nombre_de_archivo)
].join('|'), 'gu')

export function parseInline(text: string): Inline[] {
  const out: Inline[] = []
  let last = 0
  const push = (node: Inline) => {
    const prev = out[out.length - 1]
    if (node.t === 'text' && prev?.t === 'text') prev.v += node.v
    else out.push(node)
  }
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0
    if (at > last) push({ t: 'text', v: text.slice(last, at) })
    last = at + m[0].length
    if (m[1] !== undefined) push({ t: 'code', v: m[1] })
    else if (m[2] !== undefined) push({ t: 'strong', c: parseInline(m[2]) })
    else if (m[3] !== undefined) push({ t: 'del', c: parseInline(m[3]) })
    else if (m[4] !== undefined) {
      const href = safeHref(m[5])
      if (href) push({ t: 'link', href, c: parseInline(m[4]) })
      else push({ t: 'text', v: m[0] })
    } else if (m[6] !== undefined) {
      const href = safeHref(m[6])
      push(href ? { t: 'link', href, c: [{ t: 'text', v: m[6] }] } : { t: 'text', v: m[6] })
    } else if (m[7] !== undefined) push({ t: 'em', c: parseInline(m[7]) })
    else if (m[8] !== undefined) push({ t: 'em', c: parseInline(m[8]) })
  }
  if (last < text.length) push({ t: 'text', v: text.slice(last) })
  return out
}

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = []
  let current: Block | null = null
  const flush = () => { if (current) blocks.push(current); current = null }

  for (const line of source.replace(/\r\n?/g, '\n').split('\n')) {
    if (!line.trim()) { flush(); continue }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line)
    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line)
    const numbered = /^\s*(\d{1,4})[.)]\s+(.*)$/.exec(line)
    const quote = /^>\s?(.*)$/.exec(line)
    if (heading) {
      flush()
      blocks.push({ t: 'h', level: heading[1].length as 1 | 2 | 3, c: parseInline(heading[2].trim()) })
    } else if (bullet) {
      if (current?.t !== 'ul') { flush(); current = { t: 'ul', items: [] } }
      current.items.push(parseInline(bullet[1]))
    } else if (numbered) {
      if (current?.t !== 'ol') { flush(); current = { t: 'ol', start: Number(numbered[1]), items: [] } }
      current.items.push(parseInline(numbered[2]))
    } else if (quote) {
      if (current?.t !== 'quote') { flush(); current = { t: 'quote', lines: [] } }
      current.lines.push(parseInline(quote[1]))
    } else {
      if (current?.t !== 'p') { flush(); current = { t: 'p', lines: [] } }
      current.lines.push(parseInline(line))
    }
  }
  flush()
  return blocks
}

/** Texto sin marcas (para vistas previas de una línea). */
export function plainText(source: string): string {
  const flat = (nodes: Inline[]): string => nodes.map((n) => ('v' in n ? n.v : flat(n.c))).join('')
  return parseMarkdown(source).map((b) => {
    if (b.t === 'h') return flat(b.c)
    if (b.t === 'ul' || b.t === 'ol') return b.items.map(flat).join(' · ')
    return b.lines.map(flat).join(' ')
  }).join(' ')
}
