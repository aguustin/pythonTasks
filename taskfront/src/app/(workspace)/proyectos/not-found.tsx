import { FolderX } from 'lucide-react'

import { LinkButton } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

/** Proyecto inexistente o sin acceso (la API no distingue, a propósito). Dentro de la app. */
export default function ProjectNotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EmptyState icon={FolderX} title="Este proyecto no está disponible"
        action={<LinkButton href="/proyectos">Ver proyectos</LinkButton>}>
        Puede que lo hayan eliminado, que el enlace sea incorrecto o que no tengas acceso. Si lo necesitás, pedile acceso a su líder.
      </EmptyState>
    </div>
  )
}
