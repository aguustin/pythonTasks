'use client'

import { Menu, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import type { OrgRole } from '@/lib/labels'

import { Sidebar } from './Sidebar'
import { UserMenu } from './UserMenu'

/**
 * Marco de la aplicación. Escritorio (≥ 1024 px): menú lateral fijo.
 * Tablet y celular: el menú pasa a un cajón que se abre desde el encabezado.
 */
export function AppShell({ user, organizations, activeOrgId, children }: {
  user: { full_name: string; email: string }
  organizations: { id: number; name: string; my_role: OrgRole }[]
  activeOrgId: number
  children: React.ReactNode
}) {
  const pathname = usePathname()
  // El cajón queda abierto solo en la ruta donde se abrió: navegar lo cierra sin efectos extra.
  const [openAt, setOpenAt] = useState<string | null>(null)
  const drawer = openAt === pathname
  const setDrawer = (open: boolean) => setOpenAt(open ? pathname : null)

  // Cerrar con Escape.
  useEffect(() => {
    if (!drawer) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenAt(null)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawer])

  return (
    <div className="min-h-dvh bg-bg">
      <a href="#contenido" className="sr-only z-50 rounded-[var(--radius-sm)] bg-accent px-3 py-2 text-on-accent focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Saltar al contenido
      </a>

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-sidebar-border lg:block">
        <Sidebar organizations={organizations} activeOrgId={activeOrgId} />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button type="button" aria-label="Cerrar menú" onClick={() => setDrawer(false)} className="absolute inset-0 bg-black/50" />
          <div className="relative h-full w-72 max-w-[85vw] border-r border-sidebar-border shadow-[var(--shadow-pop)]">
            <Sidebar organizations={organizations} activeOrgId={activeOrgId} onNavigate={() => setDrawer(false)} />
            <button type="button" onClick={() => setDrawer(false)} aria-label="Cerrar menú"
              className="absolute right-2 top-3 grid size-9 place-items-center rounded-[var(--radius-sm)] text-sidebar-item hover:bg-sidebar-item-hover-bg">
              <X aria-hidden size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-bg/90 px-4 backdrop-blur sm:px-6">
          <button type="button" onClick={() => setDrawer(true)} aria-label="Abrir menú"
            className="grid size-9 place-items-center rounded-[var(--radius-sm)] text-muted hover:bg-surface-2 lg:hidden">
            <Menu aria-hidden size={20} />
          </button>
          <div className="flex-1" />
          <UserMenu fullName={user.full_name} email={user.email} />
        </header>
        <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 py-6 outline-none sm:px-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
