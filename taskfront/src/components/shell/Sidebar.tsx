'use client'

import { FolderKanban, House, ListChecks, Settings, Users, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Brand } from '@/components/brand/Brand'
import type { OrgRole } from '@/lib/labels'

import { OrgSwitcher } from './OrgSwitcher'

type Item = { href: string; label: string; icon: LucideIcon }

// Calendario y Reportes no aparecen hasta que existan (D13).
const MAIN: Item[] = [
  { href: '/inicio', label: 'Inicio', icon: House },
  { href: '/mis-tareas', label: 'Mis tareas', icon: ListChecks },
  { href: '/proyectos', label: 'Proyectos', icon: FolderKanban },
  { href: '/integrantes', label: 'Integrantes', icon: Users },
]
const FOOTER: Item[] = [{ href: '/configuracion', label: 'Configuración', icon: Settings }]

function NavLink({ item, onNavigate }: { item: Item; onNavigate?: () => void }) {
  const pathname = usePathname()
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={`relative flex h-9 items-center gap-3 rounded-[var(--radius-sm)] px-3 text-sm font-medium transition-colors ${
        active
          ? 'bg-sidebar-active-bg text-sidebar-active before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-sidebar-active-bar'
          : 'text-sidebar-item hover:bg-sidebar-item-hover-bg hover:text-sidebar-item-hover'
      }`}
    >
      <Icon aria-hidden size={18} strokeWidth={1.75} />
      {item.label}
    </Link>
  )
}

export function Sidebar({ organizations, activeOrgId, onNavigate }: {
  organizations: { id: number; name: string; my_role: OrgRole }[]
  activeOrgId: number
  onNavigate?: () => void
}) {
  return (
    <div className="flex h-full flex-col gap-5 bg-sidebar px-3 py-4">
      <Link href="/inicio" onClick={onNavigate} className="px-2" aria-label="Velatrix One · Projects — Inicio">
        <Brand editionClass="text-sidebar-edition" />
      </Link>
      <OrgSwitcher organizations={organizations} activeId={activeOrgId} onSwitch={onNavigate} />
      <nav aria-label="Principal" className="flex flex-1 flex-col">
        <ul className="space-y-0.5">
          {MAIN.map((item) => <li key={item.href}><NavLink item={item} onNavigate={onNavigate} /></li>)}
        </ul>
        <ul className="mt-auto space-y-0.5 border-t border-sidebar-border pt-3">
          {FOOTER.map((item) => <li key={item.href}><NavLink item={item} onNavigate={onNavigate} /></li>)}
        </ul>
      </nav>
    </div>
  )
}
