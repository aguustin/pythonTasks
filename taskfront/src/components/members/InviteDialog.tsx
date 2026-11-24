'use client'

import { LoaderCircle, UserPlus } from 'lucide-react'
import { useState, useTransition } from 'react'

import { createInvitation, type InvitationCreated } from '@/app/(workspace)/integrantes/actions'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { CopyField } from '@/components/ui/CopyField'
import { Dialog } from '@/components/ui/Dialog'
import { Field } from '@/components/ui/Field'
import { Select } from '@/components/ui/Select'
import { ROLE_LABELS, type OrgRole } from '@/lib/labels'
import { invitableRoles } from '@/lib/permissions'

/** S9 · Invitar: se genera un link de un solo uso; si hay email, además se envía por correo. */
export function InviteButton({ myRole, organization }: { myRole: OrgRole; organization: string }) {
  const [open, setOpen] = useState(false)
  const [created, setCreated] = useState<InvitationCreated | null>(null)
  const [error, setError] = useState<{ message?: string; email?: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const roles = invitableRoles(myRole)
  if (roles.length === 0) return null

  const close = () => {
    setOpen(false)
    setCreated(null)
    setError(null)
  }

  const submit = (form: FormData) =>
    startTransition(async () => {
      setError(null)
      const res = await createInvitation({ role: String(form.get('role')), email: String(form.get('email') ?? '') })
      if (res.ok) setCreated(res.data)
      else setError({ message: res.fields?.email ? undefined : res.error, email: res.fields?.email })
    })

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <UserPlus aria-hidden size={18} strokeWidth={1.75} /> Invitar
      </Button>
      <Dialog
        open={open}
        onClose={close}
        dismissible={!pending}
        title={created ? 'Invitación lista' : `Invitar a ${organization}`}
        description={created ? undefined : 'Generamos un link de un solo uso que vence en 7 días.'}
        footer={created ? (
          <>
            <Button type="button" variant="secondary" onClick={() => setCreated(null)}>Invitar a otra persona</Button>
            <Button type="button" onClick={close}>Listo</Button>
          </>
        ) : undefined}
      >
        {created ? (
          <div className="space-y-4">
            {created.emailSent === true && <Alert tone="success">Le enviamos la invitación a <strong>{created.email}</strong>. También podés compartir el link.</Alert>}
            {created.emailSent === false && <Alert tone="warning">No pudimos enviar el correo a {created.email}. Copiá el link y compartilo.</Alert>}
            {created.emailSent === null && <Alert tone="info">Compartí el link por WhatsApp, correo o donde prefieras. Cualquier persona con el link podrá unirse una sola vez.</Alert>}
            <CopyField label="Link de invitación" value={created.url} />
            <p className="text-[13px] text-subtle">Rol: {ROLE_LABELS[created.role]}. Podés revocarlo desde «Invitaciones pendientes».</p>
          </div>
        ) : (
          <form action={submit} className="space-y-4" noValidate>
            {error?.message && <Alert tone="error">{error.message}</Alert>}
            <Select label="Rol" name="role" defaultValue="member"
              hint="Los administradores pueden invitar y gestionar integrantes; los integrantes trabajan en los proyectos.">
              {roles.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
            </Select>
            <Field label="Email (opcional)" name="email" type="email" autoComplete="off" error={error?.email}
              hint="Si lo completás, le enviamos el link por correo y solo esa persona podrá usarlo." />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={close} disabled={pending}>Cancelar</Button>
              <Button type="submit" disabled={pending}>
                {pending && <LoaderCircle aria-hidden size={16} className="animate-spin" />}
                {pending ? 'Generando…' : 'Generar invitación'}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  )
}
