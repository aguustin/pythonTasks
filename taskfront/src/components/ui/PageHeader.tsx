import Link from 'next/link'

/**
 * Barra de página (dirección C): migas + título + pestañas de vista + acción principal,
 * fija arriba del contenido. Reemplaza al título grande del sistema base.
 */
export function PageBar({ title, crumbs, tabs, activeTab, meta, actions }: {
  title: string
  crumbs?: { label: string; href: string }[]
  tabs?: { key: string; label: string; href: string; count?: number }[]
  activeTab?: string
  meta?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="sticky top-0 z-10 border-b border-border bg-surface lg:top-0">
      <div className="flex min-h-13 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          {crumbs?.map((c) => (
            <span key={c.href} className="flex items-center gap-2 text-subtle">
              <Link href={c.href} className="hover:text-text">{c.label}</Link>
              <span aria-hidden>/</span>
            </span>
          ))}
          <h1 className="truncate text-[15px]">{title}</h1>
          {meta && <span className="hidden truncate text-[13px] text-subtle sm:inline">{meta}</span>}
        </div>
        {tabs && (
          <nav aria-label={`Vistas de ${title}`} className="-my-2 flex h-13 items-stretch gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const selected = tab.key === activeTab
              return (
                <Link key={tab.key} href={tab.href} aria-current={selected ? 'page' : undefined} scroll={false}
                  className={`relative flex items-center gap-1.5 whitespace-nowrap px-2.5 text-[13px] font-medium transition-colors ${
                    selected
                      ? 'text-text after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent-indicator'
                      : 'text-subtle hover:text-text'
                  }`}>
                  {tab.label}
                  {tab.count !== undefined && <span className="font-mono text-[11px] text-subtle">{tab.count}</span>}
                </Link>
              )
            })}
          </nav>
        )}
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

/** Área de contenido de una página, debajo de la barra. */
export function PageBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-4 py-5 sm:px-5 ${className}`}>{children}</div>
}

/**
 * Panel plano (dirección C): línea fina, radio 8, sin sombra.
 * `label` va como etiqueta de sección en monoespaciada; `title` como título.
 */
export function Card({ title, label, description, aside, children, className = '', flush = false }: {
  title?: string
  label?: string
  description?: React.ReactNode
  aside?: React.ReactNode
  children: React.ReactNode
  className?: string
  /** Sin relleno interno (para listas que llegan al borde). */
  flush?: boolean
}) {
  const hasHead = title || label || description || aside
  return (
    <section className={`min-w-0 rounded-[var(--radius-md)] border border-border bg-surface ${className}`}>
      {hasHead && (
        <header className="flex items-start gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            {label && <p className="eyebrow">{label}</p>}
            {title && <h2 className="text-[15px]">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
          </div>
          {aside}
        </header>
      )}
      <div className={flush ? '' : 'p-4 sm:p-5'}>{children}</div>
    </section>
  )
}
