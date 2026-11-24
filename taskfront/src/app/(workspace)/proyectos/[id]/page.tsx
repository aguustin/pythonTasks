import { Columns3 } from 'lucide-react'
import type { Metadata } from 'next'

import { DayLabel, ProjectStatusBadge } from '@/components/projects/ProjectBits'
import { Avatar } from '@/components/ui/Badges'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageBody } from '@/components/ui/PageHeader'
import { getProject } from '@/lib/server/projects'

export async function generateMetadata({ params }: PageProps<'/proyectos/[id]'>): Promise<Metadata> {
  const project = await getProject(Number((await params).id))
  return { title: project.title }
}

/** S4 — Tablero del proyecto. El tablero en sí llega en el incremento 3.3a. */
export default async function ProjectBoardPage({ params }: PageProps<'/proyectos/[id]'>) {
  const project = await getProject(Number((await params).id))
  return (
    <PageBody className="space-y-4">
      <dl className="flex flex-wrap gap-x-8 gap-y-3 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3 text-[13px]">
        <div><dt className="eyebrow">Estado</dt><dd className="mt-1"><ProjectStatusBadge project={project} /></dd></div>
        <div><dt className="eyebrow">Inicio</dt><dd className="mt-1"><DayLabel iso={project.start_date} /></dd></div>
        <div><dt className="eyebrow">Fin previsto</dt><dd className="mt-1"><DayLabel iso={project.due_date} /></dd></div>
        <div>
          <dt className="eyebrow">Líderes</dt>
          <dd className="mt-1 flex items-center gap-1.5">
            {project.leads.length === 0 ? <span className="text-subtle">—</span> : project.leads.map((l) => (
              <span key={l.id} className="flex items-center gap-1.5"><Avatar name={l.full_name} size={20} /><span>{l.full_name}</span></span>
            ))}
          </dd>
        </div>
        {project.description && <div className="basis-full"><dt className="eyebrow">Descripción</dt><dd className="mt-1 whitespace-pre-line text-muted">{project.description}</dd></div>}
      </dl>
      <EmptyState icon={Columns3} title="El tablero se habilita en el próximo incremento">
        Acá vas a organizar las tareas del proyecto en columnas, arrastrarlas y ver su avance.
      </EmptyState>
    </PageBody>
  )
}
