'use client'

import { ChevronsUpDown, LogOut, UserRound } from 'lucide-react'
import Link from 'next/link'

import { logout } from '@/app/(workspace)/actions'
import { initials } from '@/lib/labels'

import { useDisclosure } from './useDisclosure'

/** Usuario al pie del menú lateral; el menú se abre hacia arriba. */
export function UserMenu({ fullName, email, onNavigate }: { fullName: string; email: string; onNavigate?: () => void }) {
  const { open, toggle, close, containerRef, triggerRef } = useDisclosure()
  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-left hover:bg-sidebar-item-hover-bg"
      >
        <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-[11px] font-semibold text-sidebar-item-hover ring-1 ring-sidebar-border">
          {initials(fullName)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-sidebar-item-hover">{fullName}</span>
          <span className="block truncate text-[11px] text-sidebar-group">{email}</span>
        </span>
        <ChevronsUpDown aria-hidden size={14} className="shrink-0 text-sidebar-group" />
        <span className="sr-only">Menú de la cuenta</span>
      </button>
      {open && (
        <div role="menu" aria-label="Cuenta" className="absolute inset-x-0 bottom-full z-30 mb-1.5 rounded-[var(--radius-md)] border border-border bg-surface p-1.5 shadow-[var(--shadow-pop)]">
          <Link role="menuitem" href="/perfil" onClick={() => { close(); onNavigate?.() }}
            className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] hover:bg-surface-2">
            <UserRound aria-hidden size={16} strokeWidth={1.75} /> Perfil y apariencia
          </Link>
          <form action={logout}>
            <button role="menuitem" type="submit"
              className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-[13px] hover:bg-surface-2">
              <LogOut aria-hidden size={16} strokeWidth={1.75} /> Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
