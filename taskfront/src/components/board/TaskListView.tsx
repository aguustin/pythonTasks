'use client'

import { ArrowDown, ArrowUp, ListChecks } from 'lucide-react'
import { useState } from 'react'

import { Avatar } from '@/components/ui/Badges'
import { dueLabel, PRIORITY_LABELS, type Column, type Priority, type Task } from '@/lib/tasks'

import { LabelChip } from './Labels'
import { DueTag, PriorityTag } from './TaskCard'

type SortKey = 'title' | 'column' | 'priority' | 'start' | 'due'
const RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

/**
 * Vista Lista del proyecto: las mismas tareas y filtros que el tablero, en una tabla ordenable.
 * Clic en una fila (o Enter sobre su título) abre el panel de la tarea.
 */
export function TaskListView({ tasks, columns, today, onOpen, selectedId }: {
  tasks: { task: Task; column: Column }[]
  columns: Column[]
  today: string
  onOpen: (taskId: number) => void
  selectedId: number | null
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'column', dir: 1 })
  const colIndex = new Map(columns.map((c, i) => [c.id, i]))

  const value = ({ task, column }: { task: Task; column: Column }): string | number => {
    switch (sort.key) {
      case 'title': return task.title.toLowerCase()
      case 'column': return colIndex.get(column.id) ?? 0
      case 'priority': return RANK[task.priority]
      case 'start': return task.start_date ?? '9999'
      case 'due': return task.due_date ?? '9999'
    }
  }
  const rows = [...tasks].sort((a, b) => {
    const va = value(a)
    const vb = value(b)
    return (va < vb ? -1 : va > vb ? 1 : a.task.position - b.task.position) * sort.dir
  })

  const header = (key: SortKey, label: string, className = '') => {
    const active = sort.key === key
    return (
      <th scope="col" aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'} className={`px-3 py-2 text-left font-normal ${className}`}>
        <button type="button" onClick={() => setSort({ key, dir: active ? (sort.dir === 1 ? -1 : 1) : 1 })}
          className="eyebrow inline-flex items-center gap-1 hover:text-text">
          {label}
          {active && (sort.dir === 1 ? <ArrowUp aria-hidden size={12} /> : <ArrowDown aria-hidden size={12} />)}
        </button>
      </th>
    )
  }

  if (rows.length === 0) {
    return <p className="rounded-[var(--radius-md)] border border-dashed border-border bg-surface px-4 py-8 text-center text-[13px] text-subtle">No hay tareas para mostrar.</p>
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border bg-surface">
      <table className="w-full min-w-[760px] text-[13px]">
        <thead className="border-b border-border">
          <tr>
            {header('title', 'Tarea', 'w-[34%]')}
            {header('column', 'Columna')}
            <th scope="col" className="eyebrow px-3 py-2 text-left font-normal">Responsables</th>
            {header('priority', 'Prioridad')}
            {header('start', 'Inicio')}
            {header('due', 'Vence')}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(({ task, column }) => (
            <tr key={task.id} data-task-id={task.id} onClick={() => onOpen(task.id)}
              className={`cursor-pointer hover:bg-surface-2 ${selectedId === task.id ? 'bg-accent-subtle/50' : ''}`}>
              <td className="px-3 py-2">
                <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(task.id) }}
                  className={`text-left hover:underline ${column.is_done ? 'text-muted line-through' : 'text-text'}`}>
                  {task.title}
                </button>
                {((task.labels?.length ?? 0) > 0 || (task.checklist_total ?? 0) > 0) && (
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {task.labels?.map((l) => <LabelChip key={l.id} label={l} />)}
                    {(task.checklist_total ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-subtle">
                        <ListChecks aria-hidden size={12} /> {task.checklist_done}/{task.checklist_total}
                      </span>
                    )}
                  </div>
                )}
              </td>
              <td className="px-3 py-2 text-muted">{column.name}</td>
              <td className="px-3 py-2">
                {task.assignees.length === 0 ? <span className="text-subtle">—</span> : (
                  <span className="flex" aria-label={task.assignees.map((a) => a.full_name).join(', ')}>
                    {task.assignees.slice(0, 3).map((a, i) => (
                      <span key={a.id} title={a.full_name} className={`rounded-full ring-2 ring-surface ${i ? '-ml-1' : ''}`}><Avatar name={a.full_name} size={22} /></span>
                    ))}
                  </span>
                )}
              </td>
              <td className="px-3 py-2">{task.priority === 'medium' ? <span className="text-muted">{PRIORITY_LABELS.medium}</span> : <PriorityTag priority={task.priority} />}</td>
              <td className="px-3 py-2 font-mono text-[12px] text-muted">{task.start_date ? dueLabel(task.start_date, today) : '—'}</td>
              <td className="px-3 py-2">{task.due_date ? <DueTag due={task.due_date} done={column.is_done} today={today} /> : <span className="text-subtle">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
