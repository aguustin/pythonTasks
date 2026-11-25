import type { Metadata } from 'next'

import { getProject } from '@/lib/server/projects'

import { ProjectView } from '../project-view'

export async function generateMetadata({ params }: PageProps<'/proyectos/[id]/lista'>): Promise<Metadata> {
  const project = await getProject(Number((await params).id))
  return { title: `Lista · ${project.title}` }
}

/** Vista Lista del proyecto: mismas tareas, filtros y panel que el tablero. */
export default function ProjectListaPage({ params, searchParams }: PageProps<'/proyectos/[id]/lista'>) {
  return <ProjectView params={params} searchParams={searchParams} view="list" />
}
