import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import { headers } from 'next/headers'

import { ThemeSync } from '@/components/theme/ThemeSync'
import { PRODUCT } from '@/lib/labels'
import { THEME_BOOT_SCRIPT } from '@/lib/theme'

import './globals.css'

// next/font descarga las fuentes al compilar y las sirve desde el propio sitio (sin CDN en runtime).
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk', display: 'swap' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono', display: 'swap' })

export const metadata: Metadata = {
  title: { default: `${PRODUCT.family} · ${PRODUCT.edition}`, template: `%s · ${PRODUCT.edition}` },
  description: PRODUCT.descriptor,
  icons: { icon: '/brand/velatrix-icon.png', apple: '/brand/velatrix-icon.png' },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8FAFC' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0B0D' },
  ],
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Nonce por solicitud (src/proxy.ts) para el script de tema en línea.
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return (
    <html
      lang="es"
      data-theme="light"
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <ThemeSync />
        {children}
      </body>
    </html>
  )
}
