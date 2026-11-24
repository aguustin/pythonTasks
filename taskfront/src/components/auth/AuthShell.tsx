import { Brand } from '@/components/brand/Brand'
import { PRODUCT } from '@/lib/labels'

/**
 * Marco de las pantallas de acceso. La curva de luz (recurso de marca) solo se usa acá,
 * en onboarding y en estados vacíos, con baja opacidad y teñida del azul de Projects.
 */
export function AuthShell({ title, subtitle, children, footer }: {
  title: string
  subtitle?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-bg px-4 py-10">
      {/* Mesa de trabajo (dirección C), desvanecida hacia los bordes, y la curva de luz de la marca. */}
      <div aria-hidden className="mesa pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <LightCurve />
      <div className="relative w-full max-w-[420px]">
        <div className="mb-8 flex justify-center">
          <Brand size={40} showDescriptor />
        </div>
        <main className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 sm:p-8">
          <h1 className="text-[22px]">{title}</h1>
          {subtitle && <p className="mt-1.5 text-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </main>
        {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
        <p className="mt-10 text-center text-xs text-subtle">
          {PRODUCT.family} · {PRODUCT.edition} — por Velatrix
        </p>
      </div>
    </div>
  )
}

function LightCurve() {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.22] dark:opacity-30" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="vx-curve" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3B82F6" stopOpacity="0" />
          <stop offset="0.55" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#60A5FA" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M-50 720 C 300 520, 650 760, 1250 180" fill="none" stroke="url(#vx-curve)" strokeWidth="2" />
      <path d="M-50 770 C 320 600, 700 800, 1250 260" fill="none" stroke="url(#vx-curve)" strokeWidth="1" />
    </svg>
  )
}
