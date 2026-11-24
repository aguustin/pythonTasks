'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export type PageTab = { key: string; label: string; href: string; count?: number }

/**
 * Pestañas de vista de la barra de página: subrayado de 2 px en --accent-indicator.
 * Si la página no indica la activa (p. ej. desde un layout), se deduce de la ruta.
 * Las pestañas que dependen de parámetros (?vista=…) siempre se pasan con activeTab.
 */
export function PageTabs({ tabs, activeTab, label }: { tabs: PageTab[]; activeTab?: string; label: string }) {
  const pathname = usePathname()
  const active = activeTab ?? tabs.find((t) => t.href === pathname)?.key

  return (
    <nav aria-label={label} className="-my-2 flex h-13 items-stretch gap-1 overflow-x-auto">
      {tabs.map((tab) => {
        const selected = tab.key === active
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
  )
}
