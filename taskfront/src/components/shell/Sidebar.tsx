'use client'

import { Bell, FolderKanban, House, ListChecks, Plus, Search, Settings, Star, Users, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Brand } from '@/components/brand/Brand'
import type { OrgRole } from '@/lib/labels'
import { colorVars } from '@/lib/palette'
import { progress } from '@/lib/projects'

import { OrgSwitcher } from './OrgSwitcher'
import { UserMenu } from './UserMenu'

type Item = { href: string; label: string; icon: LucideIcon; exact?: boolean; badge?: number }

export type SidebarProject = { id: number; title: string; color: string; tasks_done: number; tasks_total: number; is_favorite: boolean }

/**
 * Menú lateral (dirección C · "Mesa de planificación"):
 * Mi trabajo arriba, Proyectos como navegación principal, equipo y configuración al pie.
 * Calendario y Reportes no aparecen hasta que existan (D13).
 */
const MY_WORK: Item[] = [
  { href: '/inicio', label: 'Inicio', icon: House },
  { href: '/mis-tareas', label: 'Mis tareas', icon: ListChecks },
  { href: '/notificaciones', label: 'Notificaciones', icon: Bell },
]
const FOOTER: Item[] = [
  { href: '/integrantes', label: 'Integrantes', icon: Users },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
]

function NavLink({ item, onNavigate }: { item: Item; onNavigate?: () => void }) {
  const pathname = usePathname()
  const active = pathname === item.href || (!item.exact && pathname.startsWith(`${item.href}/`))
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
      {Boolean(item.badge) && (
        <span className="ml-auto rounded-full bg-accent px-1.5 font-mono text-[10px] leading-4 text-on-accent">
          {item.badge! > 99 ? '99+' : item.badge}<span className="sr-only"> sin leer</span>
        </span>
      )}
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

/** Un proyecto en el menú: su color, su nombre y su avance (dirección C). */
function ProjectLink({ project, onNavigate }: { project: SidebarProject; onNavigate?: () => void }) {
  const pathname = usePathname()
  const href = `/proyectos/${project.id}`
  const active = pathname === href || pathname.startsWith(`${href}/`)
  const pct = progress(project)
  return (
    <Link href={href} onClick={onNavigate} aria-current={active ? 'page' : undefined}
      className={`relative flex h-8 items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 text-[13px] transition-colors ${
        active
          ? 'bg-sidebar-active-bg font-medium text-sidebar-active before:absolute before:-left-3 before:inset-y-1.5 before:w-0.5 before:rounded-full before:bg-sidebar-active-bar'
          : 'text-sidebar-item hover:bg-sidebar-item-hover-bg hover:text-sidebar-item-hover'
      }`}>
      <span aria-hidden style={colorVars(project.color)} className="size-2.5 shrink-0 rounded-[3px] bg-[var(--pc)] dark:bg-[var(--pc-dark)]" />
      <span className="min-w-0 flex-1 truncate">{project.title}</span>
      {project.is_favorite && <Star aria-label="Favorito" size={11} strokeWidth={2} className="shrink-0 text-warning" fill="currentColor" />}
      <span aria-label={`Avance ${pct}%`} className="h-[3px] w-8 shrink-0 overflow-hidden rounded-full bg-surface-2">
        <span className="block h-full rounded-full bg-accent-indicator" style={{ width: `${pct}%` }} />
      </span>
    </Link>
  )
}

export function Sidebar({ organizations, activeOrgId, user, projects, moreProjects, onNavigate, onNewTask, onSearch, unread }: {
  organizations: { id: number; name: string; my_role: OrgRole }[]
  activeOrgId: number
  user: { full_name: string; email: string }
  projects: SidebarProject[]
  moreProjects: number
  onNavigate?: () => void
  onNewTask: () => void
  onSearch: () => void
  /** Avisos sin leer (contador de Notificaciones). */
  unread: number
}) {
  return (
    <div className="flex h-full flex-col bg-sidebar px-3 pb-3 pt-4">
      <Link href="/inicio" onClick={onNavigate} className="mb-3 px-1" aria-label="Velatrix One · Projects — Inicio">
        <Brand size={24} editionClass="text-sidebar-edition" />
      </Link>
      <OrgSwitcher organizations={organizations} activeId={activeOrgId} onSwitch={onNavigate} />
      <button type="button" onClick={onNewTask} aria-keyshortcuts="N"
        className="mt-3 flex h-8 w-full items-center gap-2 rounded-[var(--radius-sm)] bg-accent px-2.5 text-[13px] font-semibold text-on-accent hover:bg-accent-hover">
        <Plus aria-hidden size={16} /> Nueva tarea
        <kbd className="ml-auto rounded border border-white/30 px-1.5 font-mono text-[10px] font-normal opacity-80">N</kbd>
      </button>
      <button type="button" onClick={onSearch} aria-keyshortcuts="Control+K Meta+K"
        className="mt-1.5 flex h-8 w-full items-center gap-2 rounded-[var(--radius-sm)] border border-sidebar-border px-2.5 text-[13px] text-sidebar-item hover:bg-sidebar-item-hover-bg hover:text-sidebar-item-hover">
        <Search aria-hidden size={15} /> Buscar
        <kbd className="ml-auto rounded border border-sidebar-border px-1.5 font-mono text-[10px]">Ctrl K</kbd>
      </button>

      <nav aria-label="Principal" className="flex min-h-0 flex-1 flex-col">
        <Group label="Mi trabajo">
          {MY_WORK.map((item) => (
            <li key={item.href}>
              <NavLink item={item.href === '/notificaciones' ? { ...item, badge: unread } : item} onNavigate={onNavigate} />
            </li>
          ))}
        </Group>
        <Group label="Proyectos">
          {projects.map((p) => <li key={p.id}><ProjectLink project={p} onNavigate={onNavigate} /></li>)}
          <li>
            <NavLink item={{ href: '/proyectos', label: moreProjects ? `Todos los proyectos (+${moreProjects})` : 'Todos los proyectos', icon: FolderKanban, exact: true }} onNavigate={onNavigate} />
          </li>
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
