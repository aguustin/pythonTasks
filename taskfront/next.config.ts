import type { NextConfig } from 'next'

const isProd = process.env.NODE_ENV === 'production'

// Encabezados de seguridad comunes. La CSP con nonce se arma por solicitud en src/proxy.ts.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }] : []),
]

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // El token de recuperación viaja en la URL: que no se filtre por Referer.
      { source: '/restablecer-contrasena/:token*', headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }] },
    ]
  },
}

export default nextConfig
