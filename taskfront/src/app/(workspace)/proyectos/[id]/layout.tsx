import { AccessBadge, ProgressBar } from '@/components/projects/ProjectBits'
import { DuplicateProject } from '@/components/projects/DuplicateProject'
import { ArchivedBanner } from '@/components/projects/ProjectSettings'
import { PageBar } from '@/components/ui/PageHeader'
import { isLeader } from '@/lib/projects'
import { getProject } from '@/lib/server/projects'

/** Marco de un proyecto: barra con migas, avance, acceso y pestañas de vista. */
export default async function ProjectLayout({ children, params }: LayoutProps<'/proyectos/[id]'>) {
  const project = await getProject(Number((await params).id))
  const base = `/proyectos/${project.id}`
  return (
    <>
      <PageBar
        title={project.title}
        crumbs={[{ label: 'Proyectos', href: '/proyectos' }]}
        tabs={[
          { key: 'tablero', label: 'Tablero', href: base },
          { key: 'actividad', label: 'Actividad', href: `${base}/actividad` },
          ...(isLeader(project) ? [{ key: 'configuracion', label: 'Configuración', href: `${base}/configuracion` }] : []),
        ]}
        actions={
          <>
            <span className="hidden items-center gap-3 md:flex">
              <ProgressBar project={project} width="w-20" showCount />
              <AccessBadge project={project} />
            </span>
            <DuplicateProject projectId={project.id} title={project.title} isLeader={isLeader(project)} />
          </>
        }
      />
      {project.archived_at && <ArchivedBanner projectId={project.id} canRestore={isLeader(project)} />}
      {children}
    </>
  )
}
