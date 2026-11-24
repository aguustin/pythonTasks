'use client'

import { LogOut } from 'lucide-react'
import { useState } from 'react'

import { leaveOrganization } from '@/app/(workspace)/integrantes/actions'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export function LeaveOrganization({ organization }: { organization: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <LogOut aria-hidden size={16} strokeWidth={1.75} /> Salir de {organization}
      </Button>
      <ConfirmDialog open={open} onClose={() => setOpen(false)} title={`¿Salir de ${organization}?`}
        confirmLabel="Salir" pendingLabel="Saliendo…"
        onConfirm={async () => {
          const res = await leaveOrganization()
          if (!res.ok) return res.error // p. ej. último propietario
        }}>
        <p className="text-muted">
          Vas a dejar de ver sus proyectos y tus tareas asignadas ahí quedan sin responsable.
          Para volver, alguien te tiene que invitar de nuevo.
        </p>
      </ConfirmDialog>
    </>
  )
}
