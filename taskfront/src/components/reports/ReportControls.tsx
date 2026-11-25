'use client'

import { Download } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

import { exportCompletedCsv } from '@/app/(workspace)/reportes/actions'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

const select = 'h-9 rounded-[var(--radius-field)] border border-input-border bg-field px-2.5 text-[13px] outline-none focus-visible:border-focus'
const PERIODS: Record<number, string> = { 4: 'Últimas 4 semanas', 8: 'Últimas 8 semanas', 12: 'Últimas 12 semanas', 26: 'Últimos 6 meses' }

/** Filtros del reporte en la URL (?semanas=&proyecto=) y exportación a CSV. */
export function ReportControls({ weeks, board, boards }: {
  weeks: number
  board: number | null
  boards: { id: number; title: string; archived: boolean }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const toast = useToast()
  const [loading, startLoading] = useTransition()
  const [exporting, startExport] = useTransition()

  const go = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    startLoading(() => router.replace(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false }))
  }

  const download = () => startExport(async () => {
    const res = await exportCompletedCsv(weeks, board).catch(() => ({ ok: false as const, error: 'No se pudo conectar. Revisá tu conexión e intentá de nuevo.' }))
    if (!res.ok) { toast({ tone: 'error', message: res.error }); return }
    if (res.data.count === 0) { toast({ tone: 'info', message: 'No hay tareas completadas en este período.' }); return }
    const url = URL.createObjectURL(new Blob([res.data.csv], { type: 'text/csv;charset=utf-8' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `completadas-${new Date().toISOString().slice(0, 10)}.csv` })
    a.click()
    URL.revokeObjectURL(url)
  })

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={loading}>
      <label>
        <span className="sr-only">Período</span>
        <select value={weeks} onChange={(e) => go('semanas', e.target.value === '8' ? '' : e.target.value)} className={select}>
          {Object.entries(PERIODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <label>
        <span className="sr-only">Proyecto</span>
        <select value={board ?? ''} onChange={(e) => go('proyecto', e.target.value)} className={`${select} max-w-60`}>
          <option value="">Todos los proyectos</option>
          {boards.map((b) => <option key={b.id} value={b.id}>{b.title}{b.archived ? ' (archivado)' : ''}</option>)}
        </select>
      </label>
      <Button type="button" variant="secondary" onClick={download} disabled={exporting}>
        <Download aria-hidden size={15} /> {exporting ? 'Preparando…' : 'Exportar CSV'}
      </Button>
    </div>
  )
}
