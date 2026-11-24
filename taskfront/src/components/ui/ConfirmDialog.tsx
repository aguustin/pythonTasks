'use client'

import { LoaderCircle } from 'lucide-react'
import { useState, useTransition } from 'react'

import { Alert } from './Alert'
import { Button } from './Button'
import { Dialog } from './Dialog'
import { Field } from './Field'

/**
 * Confirmación consistente para toda acción importante o irreversible.
 * `requireText`: para lo más grave (eliminar), hay que escribir el nombre para habilitar el botón.
 * `onConfirm` devuelve un error (string) para mostrarlo sin cerrar, o nada si salió bien.
 */
export function ConfirmDialog({ open, onClose, title, children, confirmLabel, pendingLabel, tone = 'danger', requireText, onConfirm }: {
  open: boolean
  onClose: () => void
  title: string
  children?: React.ReactNode
  confirmLabel: string
  pendingLabel: string
  tone?: 'danger' | 'primary'
  requireText?: string
  onConfirm: () => Promise<string | void>
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const blocked = Boolean(requireText) && typed.trim() !== requireText

  const close = () => {
    setError(null)
    setTyped('')
    onClose()
  }

  const confirm = () =>
    startTransition(async () => {
      setError(null)
      const result = await onConfirm()
      if (typeof result === 'string') setError(result)
      else close()
    })

  return (
    <Dialog
      open={open}
      onClose={close}
      title={title}
      size="sm"
      dismissible={!pending}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={close} disabled={pending}>Cancelar</Button>
          <Button type="button" variant={tone} onClick={confirm} disabled={pending || blocked} aria-disabled={pending || blocked}>
            {pending && <LoaderCircle aria-hidden size={16} className="animate-spin" />}
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        {children}
        {requireText && (
          <Field label={`Escribí "${requireText}" para confirmar`} name="confirm-text" autoComplete="off"
            value={typed} onChange={(e) => setTyped(e.target.value)} />
        )}
        {error && <Alert tone="error">{error}</Alert>}
      </div>
    </Dialog>
  )
}
