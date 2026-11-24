# Velatrix One · Projects — frontend

Next.js 16 (App Router, TypeScript, Tailwind CSS 4) que funciona como **BFF**: el navegador solo habla con
este servidor; este servidor habla con la API de Django. Identidad visual: [`../docs/identidad-projects.md`](../docs/identidad-projects.md).
Especificación: [`../docs/especificacion-funcional.md`](../docs/especificacion-funcional.md).

## Desarrollo

```bash
cp .env.example .env.local   # completar SESSION_SECRET (y BFF_SHARED_SECRET igual que en el backend)
npm install
npm run dev                  # http://localhost:3000 — con la API corriendo en :8000
```

Scripts: `npm run lint` · `npm run typecheck` · `npm test` (unitarios de `src/lib`) · `npm run build`.
Requiere Node.js 20.9 o superior.

## Sesión y seguridad

| Pieza | Dónde | Qué hace |
|---|---|---|
| Cookie de sesión | `src/lib/session/codec.ts` | Access y refresh cifrados con AES-256-GCM (`SESSION_SECRET`). `HttpOnly`, `SameSite=Lax`, `Secure` + prefijo `__Host-` en producción |
| Capa de datos | `src/lib/server/dal.ts` | Única puerta hacia la API. Verifica la sesión en el servidor en cada página (`apiRead`) y acción (`apiAction`) |
| Proxy | `src/proxy.ts` | CSP con nonce por solicitud; renueva la sesión antes de que venza el access token; redirecciones de comodidad. **No** es la barrera de seguridad |
| Cliente de la API | `src/lib/server/django.ts` | Envía el secreto del BFF y la IP real del usuario (límites de intentos). Comparte renovaciones simultáneas para no cerrar la sesión por carreras |
| Mutaciones | Server Actions (`src/app/**/actions.ts`) | POST con verificación de `Origin` integrada de Next.js (CSRF) |

Los permisos los aplica la API en cada operación; el frontend solo oculta lo que el rol no permite.

## Estructura

```
src/
  proxy.ts                    CSP, renovación de sesión, redirecciones
  app/
    (auth)/                   iniciar-sesion, crear-cuenta, recuperar-contrasena, restablecer-contrasena/[token]
    invitacion/[token]/       aceptar invitación (con o sin sesión)
    bienvenida/               crear la primera organización
    (workspace)/              app con menú lateral: inicio, mis-tareas, proyectos, integrantes, configuracion, perfil
    sesion-terminada/         borra la cookie si la API rechazó la sesión durante un render
  components/                 ui, auth, shell (menú, selector de organización), theme, brand
  lib/                        sesión, cliente de la API, errores, formularios, tema, textos
```

## Producción

`docker build -t velatrix-projects-web .` — imagen con salida `standalone`. Variables: `API_URL`,
`SESSION_SECRET` (≥ 32 caracteres), `BFF_SHARED_SECRET`. Sin `SESSION_SECRET` el servidor no arranca.
