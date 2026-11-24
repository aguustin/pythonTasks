'use client'

import { FolderKanban, House, ListChecks, Settings, Users, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Brand } from '@/components/brand/Brand'
import type { OrgRole } from '@/lib/labels'

import { OrgSwitcher } from './OrgSwitcher'
import { UserMenu } from './UserMenu'

type Item = { href: string; label: string; icon: LucideIcon }

/**
 * Menú lateral (dirección C · "Mesa de planificación"):
 * Mi trabajo arriba, Proyectos como navegación principal, equipo y configuración al pie.
 * Calendario y Reportes no aparecen hasta que existan (D13).
 */
const MY_WORK: Item[] = [
  { href: '/inicio', label: 'Inicio', icon: House },
  { href: '/mis-tareas', label: 'Mis tareas', icon: ListChecks },
]
const FOOTER: Item[] = [
  { href: '/integrantes', label: 'Integrantes', icon: Users },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
]

function NavLink({ item, onNavigate }: { item: Item; onNavigate?: () => void }) {
  const pathname = usePathname()
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={`relative flex h-8 items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 text-[13px] font-medium transition-colors ${
        active
          ? 'bg-sidebar-active-bg text-sidebar-active before:absolute before:-left-3 before:inset-y-1.5 before:w-0.5 before:rounded-full before:bg-sidebar-active-bar'
          : 'text-sidebar-item hover:bg-sidebar-item-hover-bg hover:text-sidebar-item-hover'
      }`}
    >
      <Icon aria-hidden size={16} strokeWidth={1.75} />
      {item.label}
    </Link>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow px-2.5 pb-1.5 pt-4">{label}</p>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  )
}

export function Sidebar({ organizations, activeOrgId, user, onNavigate }: {
  organizations: { id: number; name: string; my_role: OrgRole }[]
  activeOrgId: number
  user: { full_name: string; email: string }
  onNavigate?: () => void
}) {
  return (
    <div className="flex h-full flex-col bg-sidebar px-3 pb-3 pt-4">
      <Link href="/inicio" onClick={onNavigate} className="mb-3 px-1" aria-label="Velatrix One · Projects — Inicio">
        <Brand size={24} editionClass="text-sidebar-edition" />
      </Link>
      <OrgSwitcher organizations={organizations} activeId={activeOrgId} onSwitch={onNavigate} />

      <nav aria-label="Principal" className="flex min-h-0 flex-1 flex-col">
        <Group label="Mi trabajo">
          {MY_WORK.map((item) => <li key={item.href}><NavLink item={item} onNavigate={onNavigate} /></li>)}
        </Group>
        <Group label="Proyectos">
          {/* La lista de proyectos con su avance se suma en el incremento 3.2. */}
          <li><NavLink item={{ href: '/proyectos', label: 'Todos los proyectos', icon: FolderKanban }} onNavigate={onNavigate} /></li>
        </Group>
        <ul className="mt-auto space-y-0.5 border-t border-sidebar-border pt-3">
          {FOOTER.map((item) => <li key={item.href}><NavLink item={item} onNavigate={onNavigate} /></li>)}
        </ul>
      </nav>
      <div className="mt-2 border-t border-sidebar-border pt-2">
        <UserMenu fullName={user.full_name} email={user.email} onNavigate={onNavigate} />
      </div>
    </div>
  )
}
