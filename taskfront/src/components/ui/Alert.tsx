import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'

/**
 * Aviso con ícono + texto (nada depende solo del color).
 * "info" es neutro (gris con ícono `info`): en Projects el azul no comunica estados.
 */
const TONES = {
  error: { icon: CircleAlert, cls: 'border-danger/30 bg-danger-bg text-danger', role: 'alert' },
  warning: { icon: TriangleAlert, cls: 'border-warning/30 bg-warning-bg text-warning', role: 'status' },
  success: { icon: CircleCheck, cls: 'border-success/30 bg-success-bg text-success', role: 'status' },
  info: { icon: Info, cls: 'border-border bg-surface-2 text-text', role: 'status' },
} as const

export function Alert({ tone, children, className = '' }: { tone: keyof typeof TONES; children: React.ReactNode; className?: string }) {
  const { icon: Icon, cls, role } = TONES[tone]
  return (
    <div role={role} className={`flex items-start gap-2.5 rounded-[var(--radius-md)] border px-3.5 py-3 text-sm ${cls} ${className}`}>
      <Icon aria-hidden size={18} strokeWidth={1.75} className="mt-px shrink-0" />
      <div className="min-w-0 [&_a]:font-semibold [&_a]:underline">{children}</div>
    </div>
  )
}
