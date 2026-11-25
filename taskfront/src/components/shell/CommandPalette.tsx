'use client'

import { Bell, CircleCheck, FolderKanban, House, ListChecks, LoaderCircle, Plus, Search, type LucideIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'

import { searchAll, type SearchResults } from '@/app/(workspace)/search-actions'
import { colorVars } from '@/lib/palette'

type Item = {
  key: string
  group: string
  label: string
  hint?: string
  icon?: LucideIcon
  color?: string
  done?: boolean
  run: () => void
}

/**
 * Búsqueda global (Ctrl/⌘ K): proyectos y tareas de la organización activa, más accesos rápidos.
 * Flechas para moverse, Enter para abrir, Esc para cerrar. Patrón combobox + listbox (WAI-ARIA).
 */
export function CommandPalette({ open, onClose, onNewTask }: { open: boolean; onClose: () => void; onNewTask: () => void }) {
  const router = useRouter()
  const ref = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults & { for: string }>({ projects: [], tasks: [], for: '' })
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      requestAnimationFrame(() => inputRef.current?.focus())
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Búsqueda con espera corta mientras se escribe; se descartan respuestas viejas.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) return
    let cancelled = false
    const timer = setTimeout(() => {
      setLoading(true)
      searchAll(q).then((r) => {
        if (cancelled) return
        setResults({ ...r, for: q })
        setActive(0)
      }).catch(() => {}).finally(() => !cancelled && setLoading(false))
    }, 200)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query])

  const go = (href: string) => { close(); router.push(href) }
  const close = () => { setQuery(''); setActive(0); onClose() }

  const q = query.trim()
  const quick: Item[] = [
    { key: 'new', group: 'Acciones', label: 'Nueva tarea', hint: 'N', icon: Plus, run: () => { close(); onNewTask() } },
    { key: 'home', group: 'Ir a', label: 'Inicio', icon: House, run: () => go('/inicio') },
    { key: 'mine', group: 'Ir a', label: 'Mis tareas', icon: ListChecks, run: () => go('/mis-tareas') },
    { key: 'notif', group: 'Ir a', label: 'Notificaciones', icon: Bell, run: () => go('/notificaciones') },
    { key: 'projects', group: 'Ir a', label: 'Proyectos', icon: FolderKanban, run: () => go('/proyectos') },
  ]
  const fresh = results.for === q
  const items: Item[] = q.length < 2 ? quick : fresh ? [
    ...results.projects.map((p) => ({ key: `p${p.id}`, group: 'Proyectos', label: p.title, color: p.color, run: () => go(`/proyectos/${p.id}`) })),
    ...results.tasks.map((t) => ({
      key: `t${t.id}`, group: 'Tareas', label: t.title, color: t.board_color, done: t.is_done,
      hint: `${t.board_title} · ${t.column_name}`, run: () => go(`/proyectos/${t.board}?tarea=${t.id}`),
    })),
  ] : []
  const current = Math.min(active, Math.max(0, items.length - 1))

  return (
    <dialog ref={ref} aria-label="Buscar" onCancel={(e) => { e.preventDefault(); close() }}
      onClick={(e) => e.target === ref.current && close()}
      className="mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-xl rounded-[var(--radius-lg)] border border-border bg-surface p-0 text-text shadow-[var(--shadow-pop)] backdrop:bg-black/50">
      {open && (
        <div>
          <div className="flex items-center gap-2.5 border-b border-border px-4">
            {loading ? <LoaderCircle aria-hidden size={17} className="animate-spin text-subtle" /> : <Search aria-hidden size={17} className="text-subtle" />}
            <input ref={inputRef} value={query} onChange={(e) => { setQuery(e.target.value); setActive(0) }}
              role="combobox" aria-expanded aria-controls={listId} aria-autocomplete="list"
              aria-activedescendant={items[current] ? `${listId}-${items[current].key}` : undefined}
              aria-label="Buscar proyectos y tareas" placeholder="Buscar proyectos y tareas…" maxLength={100}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActive((current + 1) % Math.max(1, items.length)) }
                if (e.key === 'ArrowUp') { e.preventDefault(); setActive((current - 1 + items.length) % Math.max(1, items.length)) }
                if (e.key === 'Enter') { e.preventDefault(); items[current]?.run() }
              }}
              className="h-12 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle" />
            <kbd className="rounded border border-border px-1.5 font-mono text-[10px] text-subtle">Esc</kbd>
          </div>
          <ul id={listId} role="listbox" aria-label="Resultados" className="max-h-[50vh] overflow-y-auto p-1.5">
            {items.map((item, i) => (
              <li key={item.key}>
                {(i === 0 || items[i - 1].group !== item.group) && (
                  <p role="presentation" className="eyebrow px-2.5 pb-1 pt-2">{item.group}</p>
                )}
                <div id={`${listId}-${item.key}`} role="option" aria-selected={i === current}
                  onMouseMove={() => setActive(i)} onClick={() => item.run()}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] ${i === current ? 'bg-surface-2' : ''}`}>
                  {item.icon ? <item.icon aria-hidden size={16} strokeWidth={1.75} className="shrink-0 text-subtle" />
                    : <span aria-hidden style={colorVars(item.color)} className="size-2.5 shrink-0 rounded-[3px] bg-[var(--pc)] dark:bg-[var(--pc-dark)]" />}
                  <span className={`min-w-0 flex-1 truncate ${item.done ? 'text-muted line-through' : ''}`}>{item.label}</span>
                  {item.done && <CircleCheck aria-label="Terminada" size={14} className="shrink-0 text-success" />}
                  {item.hint && <span className={`shrink-0 truncate text-[12px] text-subtle ${item.icon ? 'font-mono' : 'max-w-[45%]'}`}>{item.hint}</span>}
                </div>
              </li>
            ))}
          </ul>
          {q.length >= 2 && fresh && items.length === 0 && (
            <p className="px-4 pb-5 pt-2 text-center text-[13px] text-muted">No encontramos nada con «{q}» en esta organización.</p>
          )}
          {q.length === 1 && <p className="px-4 pb-4 text-[12px] text-subtle">Escribí al menos 2 letras.</p>}
        </div>
      )}
    </dialog>
  )
}
