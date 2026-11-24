import Image from 'next/image'

import { PRODUCT } from '@/lib/labels'

/**
 * Marca del producto. Ícono oficial de Velatrix sin modificar; el logotipo NO se recrea con
 * tipografías: el nombre va en texto plano (Space Grotesk) hasta tener los SVG oficiales.
 * "Projects" en el azul de la edición (token --sidebar-edition / --accent-text según contexto).
 */
export function Brand({ size = 32, showDescriptor = false, editionClass = 'text-accent-text' }: {
  size?: number
  showDescriptor?: boolean
  editionClass?: string
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Image src="/brand/velatrix-icon.png" alt="" width={size} height={size} priority unoptimized className="shrink-0 rounded-[22%]" />
      <span className="flex flex-col leading-tight">
        <span className="font-display text-[15px] font-semibold">
          {PRODUCT.family} <span className={editionClass}>· {PRODUCT.edition}</span>
        </span>
        {showDescriptor && <span className="text-xs text-subtle">{PRODUCT.descriptor}</span>}
      </span>
    </span>
  )
}
