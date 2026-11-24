import type { LucideIcon } from 'lucide-react'

/** Estado vacío: explica qué va ahí y ofrece como mucho una acción principal. */
export function EmptyState({ icon: Icon, title, children, action }: {
  icon: LucideIcon
  title: string
  children?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="mesa flex flex-col items-center rounded-[var(--radius-md)] border border-dashed border-border-strong bg-bg px-6 py-14 text-center">
      <span className="mb-4 grid size-11 place-items-center rounded-[var(--radius-md)] border border-border bg-surface text-muted">
        <Icon aria-hidden size={22} strokeWidth={1.75} />
      </span>
      <h2 className="text-[15px]">{title}</h2>
      {children && <p className="mt-1.5 max-w-md text-sm text-muted">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
