'use client'

import { useState } from 'react'

const TIME_ZONE = 'America/Argentina/Buenos_Aires'
const short = (iso: string) =>
  new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: TIME_ZONE }).format(new Date(`${iso}T12:00:00Z`))

/** Escala "linda" para el eje: 1, 2, 5 × 10ⁿ. */
function niceMax(n: number) {
  if (n <= 4) return 4
  const p = 10 ** Math.floor(Math.log10(n))
  return [1, 2, 5, 10].map((m) => m * p).find((v) => v >= n) ?? n
}

/**
 * Completadas por semana: una sola serie (sin leyenda; el título la nombra), barras finas
 * con punta redondeada, grilla tenue y un tooltip por barra (mouse o teclado).
 * La tabla equivalente está debajo para lectores de pantalla.
 */
export function WeeklyChart({ weeks }: { weeks: { start: string; completed: number; created: number }[] }) {
  const [active, setActive] = useState<number | null>(null)
  const max = niceMax(Math.max(...weeks.map((w) => w.completed), 0))
  const ticks = [0, max / 2, max]
  const labelEvery = weeks.length > 13 ? 4 : weeks.length > 8 ? 2 : 1

  return (
    <div>
      <div className="flex gap-2" aria-hidden>
        <div className="relative w-6 shrink-0 font-mono text-[10px] text-subtle" style={{ height: 180 }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - (t / max) * 100}%` }}>{t}</span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1" style={{ height: 180 }} onMouseLeave={() => setActive(null)}>
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-border" style={{ top: `${100 - (t / max) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {weeks.map((w, i) => (
              <div key={w.start} className="relative flex h-full flex-1 items-end justify-center"
                onMouseEnter={() => setActive(i)}>
                <div className="w-full max-w-7 rounded-t-[4px] bg-accent-indicator transition-opacity"
                  style={{ height: `${(w.completed / max) * 100}%`, opacity: active === null || active === i ? 1 : 0.55 }} />
                {active === i && (
                  <div className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1 text-[12px] shadow-md"
                    style={{ bottom: `${(w.completed / max) * 100}%` }}>
                    <p className="font-semibold">Semana del {short(w.start)}</p>
                    <p className="text-muted"><span className="font-mono text-text">{w.completed}</span> completadas · <span className="font-mono text-text">{w.created}</span> creadas</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="ml-8 mt-1.5 flex gap-[2px] font-mono text-[10px] text-subtle" aria-hidden>
        {weeks.map((w, i) => (
          <span key={w.start} className="flex-1 truncate text-center">{i % labelEvery === 0 ? short(w.start) : ''}</span>
        ))}
      </div>

      {/* Navegación con teclado por semana + tabla para lectores de pantalla. */}
      <label className="mt-3 flex items-center gap-2 text-[12px] text-subtle">
        <span>Ver semana</span>
        <select value={active ?? ''} onChange={(e) => setActive(e.target.value === '' ? null : Number(e.target.value))}
          className="h-7 rounded-[var(--radius-sm)] border border-input-border bg-field px-1.5 text-[12px] text-text outline-none focus-visible:border-focus">
          <option value="">—</option>
          {weeks.map((w, i) => <option key={w.start} value={i}>{short(w.start)}: {w.completed} completadas</option>)}
        </select>
      </label>
      <table className="sr-only">
        <caption>Tareas completadas y creadas por semana</caption>
        <thead><tr><th>Semana del</th><th>Completadas</th><th>Creadas</th></tr></thead>
        <tbody>{weeks.map((w) => <tr key={w.start}><td>{short(w.start)}</td><td>{w.completed}</td><td>{w.created}</td></tr>)}</tbody>
      </table>
    </div>
  )
}
