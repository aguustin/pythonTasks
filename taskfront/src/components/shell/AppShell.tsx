'use client'

import { FolderKanban, House, ListChecks, Menu, Plus, X, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Brand } from '@/components/brand/Brand'
import { ToastProvider } from '@/components/ui/Toast'
import type { OrgRole } from '@/lib/labels'

import { getUnreadCount } from '@/app/(workspace)/notificaciones/actions'

import { NewTaskDialog, type WritableProject } from './NewTaskDialog'
import { Sidebar, type SidebarProject } from './Sidebar'

/** Si el foco está en un campo de texto, las teclas son para escribir (no atajos). */
const typing = (el: Element | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

/**
 * Marco de la aplicación. Escritorio (≥ 1024 px): menú lateral fijo de 236 px y cada página
 * con su propia barra (PageBar). Tablet y celular (D20): barra superior compacta, barra
 * inferior con lo de todos los días y el menú completo en un cajón.
 *
 * Atajos globales (fuera de campos de texto y diálogos): N nueva tarea · / buscar o filtrar.
 * En el tablero, además: M mover la tarea enfocada o abierta. Esc cierra lo que esté abierto.
 */
export function AppShell({ user, organizations, activeOrgId, projects, moreProjects, writableProjects, initialUnread, children }: {
  /** Avisos sin leer al cargar; después se actualiza cada minuto y al cambiar de página. */
  initialUnread: number
  user: { full_name: string; email: string }
  /** Proyectos donde la persona puede crear tareas (para "+ Nueva tarea"). */
  writableProjects: WritableProject[]
  organizations: { id: number; name: string; my_role: OrgRole }[]
  activeOrgId: number
  projects: SidebarProject[]
  moreProjects: number
  children: React.ReactNode
}) {
  const pathname = usePathname()
  // El cajón queda abierto solo en la ruta donde se abrió: navegar lo cierra sin efectos extra.
  const [openAt, setOpenAt] = useState<string | null>(null)
  const drawer = openAt === pathname
  const setDrawer = (open: boolean) => setOpenAt(open ? pathname : null)

  useEffect(() => {
    if (!drawer) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenAt(null)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawer])

  // "+ Nueva tarea" global (botón o N) y "/" para ir al buscador de la página, si tiene uno.
  const [newTask, setNewTask] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.defaultPrevented) return
      if (typing(document.activeElement) || document.querySelector('dialog[open], [role=menu]')) return
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault()
        setNewTask(true)
      } else if (e.key === '/') {
        const search = document.querySelector<HTMLInputElement>('[data-shortcut="search"]')
        if (!search) return
        e.preventDefault()
        search.focus()
        search.select()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
  // Contador de avisos: cada minuto y al navegar (el layout no se vuelve a pedir al servidor).
  const [unread, setUnread] = useState(initialUnread)
  useEffect(() => {
    let cancelled = false
    const update = () => getUnreadCount().then((n) => { if (!cancelled) setUnread(n) }).catch(() => {})
    update()
    const timer = setInterval(update, 60_000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [pathname])

  const currentProject = Number(/^\/proyectos\/(\d+)/.exec(pathname)?.[1]) || null

  const sidebarProps = { organizations, activeOrgId, user, projects, moreProjects, unread, onNewTask: () => { setDrawer(false); setNewTask(true) } }

  return (
    // --bottom-bar: alto de la barra inferior (celular). Envuelve también a los avisos, que se
    // dibujan fuera del contenido, para que queden por encima de la barra y no la tapen.
    <div className="[--bottom-bar:calc(3.5rem+env(safe-area-inset-bottom))] lg:[--bottom-bar:0px]">
    <ToastProvider>
      <div className="min-h-dvh bg-bg">
        <a href="#contenido" className="sr-only z-50 rounded-[var(--radius-sm)] bg-accent px-3 py-2 text-on-accent focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
          Saltar al contenido
        </a>

        <aside className="fixed inset-y-0 left-0 z-20 hidden w-[236px] border-r border-sidebar-border lg:block">
          <Sidebar {...sidebarProps} />
        </aside>

        {drawer && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
            <button type="button" aria-label="Cerrar menú" onClick={() => setDrawer(false)} className="absolute inset-0 bg-black/50" />
            <div className="relative h-full w-72 max-w-[85vw] border-r border-sidebar-border shadow-[var(--shadow-pop)]">
              <Sidebar {...sidebarProps} onNavigate={() => setDrawer(false)} />
              <button type="button" onClick={() => setDrawer(false)} aria-label="Cerrar menú"
                className="absolute right-2 top-3 grid size-8 place-items-center rounded-[var(--radius-sm)] text-sidebar-item hover:bg-sidebar-item-hover-bg">
                <X aria-hidden size={18} />
              </button>
            </div>
          </div>
        )}

        <div className="lg:pl-[236px]">
          {/* Solo en pantallas chicas: abre el menú. En escritorio cada página trae su barra. */}
          <div className="flex h-12 items-center gap-3 border-b border-border bg-sidebar px-3 lg:hidden">
            <button type="button" onClick={() => setDrawer(true)} aria-label="Abrir menú"
              className="grid size-9 place-items-center rounded-[var(--radius-sm)] text-sidebar-item hover:bg-sidebar-item-hover-bg">
              <Menu aria-hidden size={20} />
            </button>
            <Brand size={22} editionClass="text-sidebar-edition" />
          </div>
          <main id="contenido" tabIndex={-1} className="pb-[var(--bottom-bar)] outline-none">
            {children}
          </main>
        </div>
        <BottomBar pathname={pathname} unread={unread} onNewTask={() => setNewTask(true)} onMenu={() => setDrawer(true)} />
        {newTask && (
          <NewTaskDialog open onClose={() => setNewTask(false)} projects={writableProjects} defaultProjectId={currentProject} />
        )}
      </div>
    </ToastProvider>
    </div>
  )
}

const BOTTOM: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/inicio', label: 'Inicio', icon: House },
  { href: '/mis-tareas', label: 'Mis tareas', icon: ListChecks },
]

/** Barra inferior en celular y tablet (D20): lo de todos los días a un toque. */
function BottomBar({ pathname, unread, onNewTask, onMenu }: { pathname: string; unread: number; onNewTask: () => void; onMenu: () => void }) {
  const item = 'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium'
  const link = (href: string, label: string, Icon: LucideIcon) => {
    const active = pathname === href || pathname.startsWith(`${href}/`)
    return (
      <Link key={href} href={href} aria-current={active ? 'page' : undefined}
        className={`${item} ${active ? 'text-accent-text' : 'text-muted hover:text-text'}`}>
        <Icon aria-hidden size={20} strokeWidth={active ? 2.25 : 1.75} />
        <span className="truncate">{label}</span>
      </Link>
    )
  }
  return (
    <nav aria-label="Navegación rápida"
      className="fixed inset-x-0 bottom-0 z-30 flex h-[var(--bottom-bar)] items-stretch border-t border-border bg-surface px-1 pb-[env(safe-area-inset-bottom)] lg:hidden">
      {BOTTOM.map((b) => link(b.href, b.label, b.icon))}
      <div className={item}>
        <button type="button" onClick={onNewTask} aria-label="Nueva tarea" aria-keyshortcuts="N"
          className="grid size-10 place-items-center rounded-full bg-accent text-on-accent hover:bg-accent-hover">
          <Plus aria-hidden size={22} />
        </button>
      </div>
      {link('/proyectos', 'Proyectos', FolderKanban)}
      <button type="button" onClick={onMenu} aria-label={unread ? `Abrir menú completo (${unread} avisos sin leer)` : 'Abrir menú completo'}
        className={`${item} relative text-muted hover:text-text`}>
        <Menu aria-hidden size={20} strokeWidth={1.75} />
        {unread > 0 && <span aria-hidden className="absolute right-[calc(50%-14px)] top-2 size-2 rounded-full bg-accent" />}
        <span>Menú</span>
      </button>
    </nav>
  )
}
