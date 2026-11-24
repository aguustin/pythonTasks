'use client'

import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import Link from 'next/link'

import { switchOrganization } from '@/app/(workspace)/actions'
import { ROLE_LABELS, type OrgRole } from '@/lib/labels'

import { useDisclosure } from './useDisclosure'

type Org = { id: number; name: string; my_role: OrgRole }

/** Selector de la organización activa (un usuario puede pertenecer a varias). */
export function OrgSwitcher({ organizations, activeId, onSwitch }: { organizations: Org[]; activeId: number; onSwitch?: () => void }) {
  const { open, toggle, close, containerRef, triggerRef } = useDisclosure()
  const active = organizations.find((o) => o.id === activeId) ?? organizations[0]

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-[var(--radius-md)] border border-sidebar-border px-2.5 py-2 text-left hover:bg-sidebar-item-hover-bg"
      >
        <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-sidebar-active-bg font-display text-sm font-semibold text-sidebar-active">
          {active.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-sidebar-item-hover">{active.name}</span>
          <span className="block text-xs text-sidebar-group">{ROLE_LABELS[active.my_role]}</span>
        </span>
        <ChevronsUpDown aria-hidden size={16} className="shrink-0 text-sidebar-item" />
        <span className="sr-only">Cambiar de organización</span>
      </button>

      {open && (
        <div role="menu" aria-label="Organizaciones" className="absolute inset-x-0 top-full z-30 mt-1.5 rounded-[var(--radius-md)] border border-border bg-surface p-1.5 shadow-[var(--shadow-pop)]">
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">Tus organizaciones</p>
          <form action={switchOrganization} onSubmit={() => { close(); onSwitch?.() }}>
            {organizations.map((org) => (
              <button
                key={org.id}
                role="menuitemradio"
                aria-checked={org.id === active.id}
                type="submit"
                name="organization"
                value={org.id}
                className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-sm text-text hover:bg-surface-2"
              >
                <span className="min-w-0 flex-1 truncate">{org.name}</span>
                <span className="text-xs text-subtle">{ROLE_LABELS[org.my_role]}</span>
                {org.id === active.id ? <Check aria-hidden size={16} className="text-accent-text" /> : <span className="w-4" />}
              </button>
            ))}
          </form>
          <div className="my-1.5 border-t border-border" />
          <Link role="menuitem" href="/bienvenida?nueva=1" onClick={() => close()}
            className="flex items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-sm font-medium text-accent-text hover:bg-accent-subtle">
            <Plus aria-hidden size={16} /> Crear organización
          </Link>
        </div>
      )}
    </div>
  )
}
