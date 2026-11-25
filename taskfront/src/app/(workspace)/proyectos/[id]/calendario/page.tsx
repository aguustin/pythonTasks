import type { Metadata } from 'next'

import { getProject } from '@/lib/server/projects'

import { ProjectView } from '../project-view'

export async function generateMetadata({ params }: PageProps<'/proyectos/[id]/calendario'>): Promise<Metadata> {
  const project = await getProject(Number((await params).id))
  return { title: `Calendario · ${project.title}` }
}

/** Vista Calendario del proyecto: mismas tareas, filtros y panel que el tablero. */
export default function ProjectCalendarioPage({ params, searchParams }: PageProps<'/proyectos/[id]/calendario'>) {
  return <ProjectView params={params} searchParams={searchParams} view="calendar" />
}
