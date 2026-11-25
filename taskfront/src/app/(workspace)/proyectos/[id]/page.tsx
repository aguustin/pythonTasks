import type { Metadata } from 'next'

import { getProject } from '@/lib/server/projects'

import { ProjectView } from './project-view'

export async function generateMetadata({ params }: PageProps<'/proyectos/[id]'>): Promise<Metadata> {
  const project = await getProject(Number((await params).id))
  return { title: project.title }
}

/** S4 — Tablero del proyecto. Con ?tarea=<id> se abre además el detalle (S5). */
export default function ProjectBoardPage({ params, searchParams }: PageProps<'/proyectos/[id]'>) {
  return <ProjectView params={params} searchParams={searchParams} view="board" />
}
