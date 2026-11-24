'use client'

import { LogOut, UserRound } from 'lucide-react'
import Link from 'next/link'

import { logout } from '@/app/(workspace)/actions'
import { initials } from '@/lib/labels'

import { useDisclosure } from './useDisclosure'

export function UserMenu({ fullName, email }: { fullName: string; email: string }) {
  const { open, toggle, close, containerRef, triggerRef } = useDisclosure()
  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid size-9 place-items-center rounded-full bg-surface-2 text-[13px] font-semibold text-text ring-1 ring-border hover:ring-border-strong"
      >
        <span aria-hidden>{initials(fullName)}</span>
        <span className="sr-only">Menú de {fullName}</span>
      </button>
      {open && (
        <div role="menu" aria-label="Cuenta" className="absolute right-0 top-full z-30 mt-2 w-64 rounded-[var(--radius-md)] border border-border bg-surface p-1.5 shadow-[var(--shadow-pop)]">
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-semibold">{fullName}</p>
            <p className="truncate text-xs text-subtle">{email}</p>
          </div>
          <div className="my-1 border-t border-border" />
          <Link role="menuitem" href="/perfil" onClick={() => close()}
            className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm hover:bg-surface-2">
            <UserRound aria-hidden size={16} strokeWidth={1.75} /> Perfil y apariencia
          </Link>
          <form action={logout}>
            <button role="menuitem" type="submit"
              className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-sm hover:bg-surface-2">
              <LogOut aria-hidden size={16} strokeWidth={1.75} /> Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
