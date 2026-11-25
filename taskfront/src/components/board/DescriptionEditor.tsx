'use client'

import { Bold, Code, Heading, Italic, Link2, List, ListOrdered, Pencil, Strikethrough, type LucideIcon } from 'lucide-react'
import { useRef, useState } from 'react'

import { RichText } from '@/components/ui/RichText'

type Tool = { label: string; icon: LucideIcon; keys?: string; apply: (v: string, s: number, e: number) => [string, number, number] }

/** Envuelve la selección (o inserta las marcas y deja el cursor en el medio). */
const wrap = (mark: string, end = mark): Tool['apply'] => (v, s, e) => {
  const sel = v.slice(s, e)
  return [v.slice(0, s) + mark + sel + end + v.slice(e), s + mark.length, e + mark.length]
}

/** Antepone un prefijo a cada línea seleccionada (listas, títulos). */
const prefix = (make: (i: number) => string): Tool['apply'] => (v, s, e) => {
  const from = v.lastIndexOf('\n', s - 1) + 1
  const lines = v.slice(from, e).split('\n')
  const out = lines.map((l, i) => make(i) + l).join('\n')
  return [v.slice(0, from) + out + v.slice(e), from + out.length, from + out.length]
}

const TOOLS: Tool[] = [
  { label: 'Negrita', icon: Bold, keys: 'Ctrl+B', apply: wrap('**') },
  { label: 'Cursiva', icon: Italic, keys: 'Ctrl+I', apply: wrap('_') },
  { label: 'Tachado', icon: Strikethrough, apply: wrap('~~') },
  { label: 'Título', icon: Heading, apply: prefix(() => '## ') },
  { label: 'Lista', icon: List, apply: prefix(() => '- ') },
  { label: 'Lista numerada', icon: ListOrdered, apply: prefix((i) => `${i + 1}. `) },
  { label: 'Código', icon: Code, apply: wrap('`') },
  {
    label: 'Enlace', icon: Link2, keys: 'Ctrl+K',
    apply: (v, s, e) => {
      const text = v.slice(s, e) || 'texto'
      const md = `[${text}](https://)`
      const urlAt = s + text.length + 3
      return [v.slice(0, s) + md + v.slice(e), urlAt, urlAt + 8] // selecciona "https://"
    },
  },
]

const SHORTCUTS: Record<string, Tool> = { b: TOOLS[0], i: TOOLS[1], k: TOOLS[7] }

/**
 * Descripción de la tarea: se ve con formato; "Editar" abre el texto con una barra de formato.
 * Se guarda al salir del editor (o Ctrl+Enter); Esc descarta los cambios.
 */
export function DescriptionEditor({ value, canEdit, onSave }: { value: string; canEdit: boolean; onSave: (v: string) => Promise<void> }) {
  const [draft, setDraft] = useState<string | null>(null)
  const area = useRef<HTMLTextAreaElement>(null)
  const editing = draft !== null

  const finish = async () => {
    if (draft === null) return
    const next = draft
    setDraft(null)
    if (next !== value) await onSave(next)
  }

  const run = (tool: Tool) => {
    const el = area.current
    if (!el || draft === null) return
    const [v, s, e] = tool.apply(draft, el.selectionStart, el.selectionEnd)
    setDraft(v.slice(0, 10000))
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s, e) })
  }

  if (!editing) {
    return (
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="eyebrow">Descripción</h3>
          {canEdit && value && (
            <button type="button" onClick={() => setDraft(value)}
              className="inline-flex h-7 items-center gap-1 rounded-[var(--radius-sm)] px-2 text-[12px] font-medium text-muted hover:bg-surface-2 hover:text-text">
              <Pencil aria-hidden size={13} /> Editar<span className="sr-only"> la descripción</span>
            </button>
          )}
        </div>
        {value ? (
          <RichText source={value} className="mt-2" />
        ) : canEdit ? (
          <button type="button" onClick={() => setDraft('')}
            className="mt-2 w-full rounded-[var(--radius-field)] border border-dashed border-input-border px-3 py-3 text-left text-[13px] text-subtle hover:border-muted hover:text-muted">
            Agregá detalles, pasos o enlaces…
          </button>
        ) : (
          <p className="mt-2 text-[13px] text-subtle">Sin descripción.</p>
        )}
      </div>
    )
  }

  return (
    <div onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) void finish() }}>
      <label htmlFor="task-description" className="eyebrow">Descripción</label>
      <div className="mt-2 rounded-[var(--radius-field)] border border-input-border bg-field focus-within:border-focus focus-within:shadow-[0_0_0_3px_var(--accent-soft)]">
        <div role="toolbar" aria-label="Formato" className="flex flex-wrap gap-0.5 border-b border-border px-1 py-1">
          {TOOLS.map((t) => (
            <button key={t.label} type="button" title={t.keys ? `${t.label} (${t.keys})` : t.label} aria-label={t.label}
              onMouseDown={(e) => e.preventDefault()} onClick={() => run(t)}
              className="grid size-7 place-items-center rounded-[var(--radius-sm)] text-muted hover:bg-surface-2 hover:text-text">
              <t.icon aria-hidden size={14} />
            </button>
          ))}
        </div>
        <textarea id="task-description" ref={area} autoFocus value={draft} maxLength={10000}
          placeholder="Agregá detalles, pasos o enlaces…" aria-describedby="task-description-hint"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setDraft(null); return }
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void finish(); return }
            const tool = (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey ? SHORTCUTS[e.key.toLowerCase()] : undefined
            if (tool) { e.preventDefault(); e.stopPropagation(); run(tool) }
          }}
          className="block min-h-28 w-full resize-y bg-transparent px-3 py-2 text-[13px] leading-relaxed text-text outline-none [field-sizing:content] placeholder:text-subtle" />
      </div>
      <p id="task-description-hint" className="mt-1.5 text-[12px] text-subtle">
        **negrita**, _cursiva_, - lista, [texto](https://…). Se guarda al salir · Ctrl+Enter guarda · Esc descarta.
      </p>
    </div>
  )
}
