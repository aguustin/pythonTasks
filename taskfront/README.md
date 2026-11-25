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

## Cómo funciona el tablero

- **Estabilidad primero:** mover, crear y editar se ven al instante y se envían a la API **de a una, en orden**
  (una cola). Lo que se ve es siempre "lo confirmado + lo pendiente": si la API rechaza un cambio, solo ese se
  descarta y se avisa. Al vaciarse la cola se refresca con la verdad del servidor.
- Los filtros solo ocultan tarjetas: las posiciones se calculan sobre la columna completa.
- El panel de la tarea tiene URL propia (`?tarea=id`). Abrirlo no vuelve a renderizar el tablero en el servidor:
  la URL cambia en el navegador y comentarios e historial se piden aparte.
- "Deshacer" se ofrece solo donde la operación se revierte exactamente (marcar como hecha vuelve a la misma
  columna y posición). Eliminar no tiene "Deshacer": pide confirmación.

## Atajos de teclado

Fuera de campos de texto y diálogos: **N** nueva tarea · **/** ir al buscador del tablero · **M** mover la
tarea enfocada (o, con el panel abierto, ir al selector de columna) · **Esc** cierra panel, menú o diálogo.
Arrastrar con teclado: foco en el asa de la tarjeta, espacio para tomar, flechas, espacio para soltar.

## Rendimiento (proyecto de 500 tareas)

Medido en una máquina de desarrollo con carga: el tablero carga en 1,3–1,9 s, el filtro responde en ~0,5 s y el
panel abre con comentarios en ~0,5 s. Arrastrar funciona y persiste bien, pero con 500 tarjetas cada movimiento
del puntero cuesta ~90 ms (dnd-kit re-renderiza todas las tarjetas; el contenido de cada una está memorizado para
que sea liviano). Con 100 tareas el arrastre es fluido. Si hiciera falta más, el paso siguiente es virtualizar las
columnas largas.

## Estructura

```
src/
  proxy.ts                    CSP, renovación de sesión, redirecciones
  app/
    (auth)/                   iniciar-sesion, crear-cuenta, recuperar-contrasena, restablecer-contrasena/[token]
    invitacion/[token]/       aceptar invitación (con o sin sesión)
    bienvenida/               crear la primera organización
    (workspace)/              app con menú lateral (y barra inferior en celular): inicio, mis-tareas,
                              proyectos/[id] (tablero, actividad, configuracion), integrantes, configuracion, perfil
    sesion-terminada/         borra la cookie si la API rechazó la sesión durante un render
  components/                 ui, auth, shell (menú, barra inferior, Nueva tarea), board (tablero y panel),
                              mywork (Inicio y Mis tareas), projects, members, theme, brand
  lib/                        sesión, cliente de la API, reglas compartidas (tasks, mywork, activity), tema, textos
```

## Producción

`docker build -t velatrix-projects-web .` — imagen con salida `standalone`. Variables: `API_URL`,
`SESSION_SECRET` (≥ 32 caracteres), `BFF_SHARED_SECRET`. Sin `SESSION_SECRET` el servidor no arranca.
