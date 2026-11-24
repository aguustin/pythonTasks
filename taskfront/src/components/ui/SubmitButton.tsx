'use client'

import { LoaderCircle } from 'lucide-react'
import { useFormStatus } from 'react-dom'

import { buttonClass, type ButtonVariant } from './Button'

/** Botón de envío: muestra el estado dentro del botón y evita el doble envío. */
export function SubmitButton({
  children,
  pendingLabel,
  variant = 'primary',
  className = '',
}: {
  children: React.ReactNode
  pendingLabel: string
  variant?: ButtonVariant
  className?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} aria-disabled={pending} className={buttonClass(variant, className)}>
      {pending && <LoaderCircle aria-hidden size={16} className="animate-spin" />}
      {pending ? pendingLabel : children}
    </button>
  )
}
