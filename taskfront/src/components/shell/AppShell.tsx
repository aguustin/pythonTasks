'use client'

import { Menu, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Brand } from '@/components/brand/Brand'
import { ToastProvider } from '@/components/ui/Toast'
import type { OrgRole } from '@/lib/labels'

import { Sidebar, type SidebarProject } from './Sidebar'

/**
 * Marco de la aplicación. Escritorio (≥ 1024 px): menú lateral fijo de 236 px y cada página
 * con su propia barra (PageBar). Tablet y celular: barra superior compacta y menú en cajón.
 */
export function AppShell({ user, organizations, activeOrgId, projects, moreProjects, children }: {
  user: { full_name: string; email: string }
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

  const sidebarProps = { organizations, activeOrgId, user, projects, moreProjects }

  return (
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
          <main id="contenido" tabIndex={-1} className="outline-none">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
