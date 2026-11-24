import { LinkButton } from '@/components/ui/Button'
import { AuthShell } from '@/components/auth/AuthShell'

export default function NotFound() {
  return (
    <AuthShell title="No encontramos lo que buscás" subtitle="Puede que el enlace sea incorrecto o que no tengas acceso.">
      <LinkButton href="/inicio" className="w-full">Ir al inicio</LinkButton>
    </AuthShell>
  )
}
