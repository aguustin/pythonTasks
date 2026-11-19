# Velatrix One · Projects — Especificación funcional y de UX

> **Etapa 2 — Arquitectura funcional y experiencia de usuario.** Propuesta del 2026-11-19; **revisión 2 del
> 2026-11-19** con las decisiones aprobadas y las condiciones de seguridad. **Todas las decisiones quedaron aprobadas
> el 2026-11-19** (§10); la implementación sigue el orden de §8.5.
> Define *qué* producto se construye. La identidad visual está en [`identidad-projects.md`](identidad-projects.md)
> y la API actual en el [`README.md`](../README.md); este documento no las repite.
> Nada de esto está implementado salvo lo indicado como "existe".

**Índice:** 1. Punto de partida · 2. Arquitectura funcional · 3. Roles y permisos · 4. Navegación y pantallas ·
5. Flujos · 6. Estados de la interfaz · 7. Modelo conceptual de datos · 8. MVP y roadmap ·
9. Criterios de calidad · **9 bis. Seguridad, sesiones y correo** · 10. Decisiones (aprobadas y pendientes)

---

## 1. Punto de partida

### 1.1 Qué existe hoy

| Capa | Estado | Qué se reutiliza |
|---|---|---|
| **Backend** (Django + DRF, API v1) | Completo y testeado (48 tests). Commit `8543c34` | Casi todo: organizaciones, membresías, invitaciones por link, proyectos (`Board`), permisos por proyecto, columnas (máx. 6), tareas con varios responsables, prioridad y vencimiento, mover/reordenar, comentarios, actividad, "Mis tareas" con filtros |
| **Frontend** (`taskfront/`, Next.js 14.2.4) | **Obsoleto**: consume la API vieja, que ya no existe. Estética naranja/clara previa a la marca | Solo patrones: interceptor de Axios con refresh, sistema de toasts, guardia de rutas, `@dnd-kit`. Las pantallas, contextos, íconos PNG y estilos se reemplazan |
| **Identidad** | Definida en `identidad-projects.md` | Completa |

### 1.2 Limitaciones y riesgos técnicos detectados

| # | Hallazgo | Impacto | Propuesta |
|---|---|---|---|
| L1 | Next.js **14.2.4** está afectado por **CVE-2025-29927**: permite saltear el middleware, que es justamente lo que protege las rutas del frontend | Seguridad | **Resuelto en D16:** no se continúa con la 14.2.4; el objetivo es Next.js 16 (§9 bis.1). La autorización nunca depende solo del middleware |
| L2 | Los tokens JWT se guardan en `localStorage`, expuestos ante un XSS | Seguridad | **Resuelto en D17:** cookies httpOnly (§9 bis.2) |
| L3 | **No hay recuperación de contraseña** | Bloqueante para vender el producto | **Resuelto en D11:** entra al MVP con Resend; es requisito del lanzamiento comercial (§9 bis.3) |
| L4 | El frontend usa solo `@dnd-kit/core`; para reordenar dentro de una columna hace falta `@dnd-kit/sortable` | Dependencia | Se agrega al implementar |
| L5 | Al mover una tarea se renumera la columna completa (O(n)) | Rendimiento en columnas grandes | Suficiente hasta ~500 tareas por columna. A futuro, posiciones fraccionarias |
| L6 | `GET /boards/{id}/tasks/` no pagina | Rendimiento en proyectos enormes | Correcto para el MVP. Revisar por encima de ~1.000 tareas abiertas por proyecto |
| L7 | El proyecto no tiene estado, fechas ni archivado; el listado no trae el avance | Faltan datos para el MVP | Cambios de backend listados en 8.4 |

### 1.3 Contradicciones con lo existente (revisar antes de implementar)

| # | Dónde | Contradicción | Propuesta |
|---|---|---|---|
| C1 | `identidad-projects.md` §7 | Usa "Equipo" para los miembros de la organización, pero esta etapa introduce **Equipos** como grupos de personas | La sección de personas se llama **"Integrantes"** y "Equipo" queda reservado a los grupos (decisión **D2**). Ya se corrigió el vocabulario en la identidad |
| C2 | `identidad-projects.md` §7 | Ponía "Actividad" como sección del menú lateral | La actividad vive dentro de cada proyecto y en Inicio; no ocupa lugar en el menú (ver 4.1) |
| C3 | Backend: `Task.assignees` acepta varias personas | El enunciado habla de "un responsable" más "colaboradores" | **Aprobado (D7):** varios responsables, sin "colaboradores" |
| C4 | Backend: un proyecto nuevo es **privado** por defecto | Para equipos chicos es más simple que lo vea toda la organización | **Aprobado (D5):** la interfaz muestra "Toda la organización" como opción inicial visible y siempre envía el acceso en forma explícita. El backend conserva "privado" como valor por defecto seguro para cualquier otro cliente de la API |
| C7 | Backend: `REST_FRAMEWORK` limita intentos **por IP** | Con el BFF de D17, todas las solicitudes llegan desde el servidor de Next.js: todos los usuarios compartirían el mismo límite | El BFF reenvía la IP real del usuario en un encabezado firmado y el backend la usa para limitar (§9 bis.2) |
| C8 | Backend: `CORS_ALLOWED_ORIGINS` permite que el navegador llame directo a la API | Con el BFF, el navegador ya no llama a la API | En producción se cierra el CORS de la API (§9 bis.2) |
| C5 | Backend: cualquier integrante puede crear proyectos | Algunos dueños van a querer restringirlo | Se mantiene en el MVP; ajuste opcional en la Etapa 2 (decisión **D4**) |
| C6 | Backend: `Board.image` (portada) | La identidad usa solo el color del proyecto | No se muestra en el MVP. El campo queda (decisión **D21**) |

---

## 2. Arquitectura funcional

### 2.1 Jerarquía

```
Organización ──┬── Integrantes (con rol en la organización)
               ├── Invitaciones (link)
               ├── Equipos ………………………… Etapa 2: grupos para dar acceso, no contenedores
               └── Proyectos ──┬── Miembros del proyecto (con rol en el proyecto)
                               ├── Columnas (1–6, ordenadas; alguna puede ser "terminada")
                               ├── Tareas ──┬── Responsables (0..n)
                               │            ├── Comentarios
                               │            └── Etiquetas / Checklist / Adjuntos …… Etapa 2
                               └── Actividad
```

**Por qué esta estructura:**
- **Sin "espacio de trabajo".** La organización ya cumple ese papel: aísla datos, personas y facturación. Un nivel más (organización → espacio → proyecto) duplica permisos y navegación sin resolver algo concreto para el público objetivo (comercios, pymes, equipos). Si una empresa necesita separar áreas, puede usar **Equipos** (Etapa 2) o varias organizaciones, porque un usuario ya puede pertenecer a varias.
- **El proyecto es la unidad de trabajo y de permisos.** Todo permiso de tarea se deriva del proyecto; no hay permisos por tarea individual.
- **Equipos como atajo de acceso, no como dueños de proyectos.** Un equipo ("Depósito", "Ventas") sirve para dar acceso a varios proyectos de una vez y para filtrar. Un proyecto pertenece a la organización, no a un equipo. Así, reorganizar equipos no rompe proyectos.
- **El proyecto es la entidad `Board`.** En la interfaz siempre se dice "proyecto", y cada proyecto tiene exactamente un tablero, con sus columnas. No se crea una entidad `Project` aparte: no hay necesidad de varios tableros por proyecto.

### 2.2 Módulos

| Módulo | Responsabilidad | Etapa |
|---|---|---|
| **Cuenta** | Registro, login, recuperación de contraseña, sesiones (cerrar esta o todas), perfil, apariencia | MVP |
| **Correo transaccional** | Recuperación de contraseña, aviso de contraseña cambiada, invitación con email | MVP |
| **Organización** | Crear, cambiar de organización, datos, salir, eliminar | MVP |
| **Integrantes** | Listar, invitar por link, cambiar rol, quitar | MVP |
| **Proyectos** | Crear, editar, acceso, estado, fechas, archivar, eliminar, avance | MVP |
| **Tablero** | Columnas, tareas, mover y reordenar, filtros | MVP |
| **Tareas** | Detalle, campos, responsables, comentarios, historial | MVP |
| **Mis tareas** | Trabajo personal en todas las organizaciones, agrupado por vencimiento | MVP |
| **Inicio** | Panel personal y resumen de la organización | MVP (acotado) |
| **Actividad** | Historial por proyecto y reciente en Inicio | MVP |
| **Notificaciones** (internas) | Aviso de asignaciones, comentarios y menciones dentro de la app y resúmenes por email. **No** incluye el correo transaccional | Etapa 2 |
| **Equipos** | Grupos de integrantes con acceso a proyectos | Etapa 2 |
| **Calendario y lista** | Otras vistas de las mismas tareas | Etapa 2 |
| **Reportes** | Métricas históricas y exportación | Etapa 2–3 |
| **Plantillas y recurrencia** | Proyectos y tareas repetibles | Etapa 2 |

### 2.3 A — Organización e integrantes

- Un usuario puede pertenecer a **varias organizaciones** (existe). La organización activa se elige con un selector y se recuerda en el dispositivo.
- **Invitación por link** (existe): de un solo uso, vence a los 7 días, puede atarse a un email y define el rol de ingreso. **Si la invitación tiene email, además se envía por correo** (Resend, MVP). Copiar el link sigue disponible siempre, por ejemplo para compartirlo por WhatsApp.
- Al quitar a alguien de la organización se borran sus accesos a proyectos y se lo quita como responsable de sus tareas (existe).
- Siempre tiene que quedar al menos un propietario (existe).

### 2.4 B — Proyectos

| Capacidad | MVP | Notas |
|---|---|---|
| Crear y editar: nombre (obligatorio), descripción, color | Sí | Existe. El color sale de la paleta categórica de la identidad |
| **Alcance de acceso** explícito: "Toda la organización" (puede editar o solo ver) o "Solo miembros del proyecto" (restringido) | Sí | Existe (`visibility` + `organization_role`). Al crear, la opción inicial visible es "Toda la organización" (D5). El alcance se muestra siempre en el encabezado del proyecto y lo cambian el líder, los administradores y el propietario |
| Miembros y su rol en el proyecto | Sí | Existe |
| **Líder(es)** | Sí | Es el rol de proyecto "admin". No hace falta un campo nuevo; un proyecto puede tener varios líderes |
| **Estado del proyecto**: Activo · En pausa · Finalizado | Sí | **Nuevo** (decisión **D6**). Es independiente del archivado |
| **Fechas de inicio y fin** previstas | Sí | **Nuevo**, opcionales. Sirven para mostrar "atrasado" y en la Etapa 2 para el calendario |
| **Avance** = tareas en columnas terminadas sobre el total | Sí | Calculado, no se guarda. **Nuevo** en el listado |
| Prioridad del proyecto | No | No aporta: el estado y las fechas ya ordenan. Se evalúa si alguien lo pide |
| Actividad | Sí | Existe |
| **Archivar y restaurar** | Sí | **Nuevo** (`archived_at`). Un proyecto archivado queda oculto de los listados, en solo lectura y restaurable |
| Eliminar | Sí | Existe. Pide escribir el nombre del proyecto para confirmar |
| Archivos y documentación del proyecto | Etapa 2 | Junto con los adjuntos de tareas |
| Plantillas | Etapa 2 | Empezar por "Duplicar proyecto": copia columnas y, opcionalmente, tareas |

### 2.5 C — Tareas

| Campo | Obligatorio | MVP | Notas |
|---|---|---|---|
| Título | **Sí** | Sí | Hasta 200 caracteres |
| Columna | Sí (automático) | Sí | Si no se elige, va a la primera columna |
| Descripción | No | Sí | Texto con saltos de línea. Formato enriquecido en la Etapa 2 |
| Responsables (0..n) | No | Sí | Existe (D7). Tienen que tener acceso al proyecto |
| Prioridad | No (por defecto "Media") | Sí | Baja · Media · Alta · Urgente |
| Vencimiento | No | Sí | Solo fecha |
| Comentarios | — | Sí | Existe |
| Historial | — | Sí | Existe (actividad filtrada por tarea) |
| Fecha de inicio | No | Etapa 2 | Tiene sentido con calendario y cronograma |
| Etiquetas (por proyecto) | No | Etapa 2 | Clasificación libre: "Proveedor", "Cliente X"… |
| Checklist (ítems simples) | No | Etapa 2 | Cubre la mayoría de los casos de "subtareas" sin la complejidad de una jerarquía |
| Adjuntos | No | Etapa 2 | Requiere almacenamiento y límites por plan |
| Subtareas reales (tareas hijas) | No | Etapa 3 | Solo si el checklist no alcanza |
| Dependencias (bloquea / bloqueada por) | No | Etapa 3 | Útil con el cronograma |

**Crear una tarea tiene que ser rápido:** alcanza con escribir el título en la columna ("+ Agregar tarea") y presionar Enter. El resto se completa después, en el detalle.

### 2.6 D — Columnas y flujo de trabajo

- **Estado = columna.** El estado de una tarea es la columna donde está. La prioridad es otro eje y nunca se representa con columnas.
- **Columnas por defecto:** Pendiente · En curso · Hecho (esta última, "terminada"). Existe.
- **Personalizables por proyecto:** de 1 a 6 columnas; crear, renombrar, reordenar, elegir color y marcar si es "terminada". Existe. Solo las administra el líder del proyecto.
- **Eliminar una columna con tareas** obliga a elegir a qué columna moverlas. Existe.
- **"Terminada"** (`is_done`): las tareas que entran ahí reciben fecha de finalización y cuentan como completadas en el avance y en "Mis tareas". Puede haber más de una columna terminada.
- **"No se hará / Descartada":** en el MVP se modela como una columna terminada más. Distinguir "terminada" de "descartada" en las métricas queda como decisión **D8**.
- **Visual:** el color de la columna aparece solo como punto o barra en su encabezado; el azul de Projects nunca indica un estado (ver identidad, §6).

### 2.7 E — Integrantes y equipos

- **Integrantes (MVP):** son las personas de la organización, con su rol en la organización. Pueden participar en proyectos de tres formas: por ser propietario o administrador (acceso total), por ser agregados al proyecto con un rol, o porque el proyecto es visible para toda la organización.
- **Equipos (Etapa 2):** grupos con nombre. Se puede dar acceso a un proyecto a un equipo completo con un rol, y filtrar "Mis tareas" e Inicio por equipo. El permiso efectivo es el **más alto** entre el directo, el del equipo y el de la organización.
- **Visibilidad de tareas:** quien ve un proyecto ve todas sus tareas. No hay tareas privadas dentro de un proyecto; si algo es privado, va en un proyecto privado.
- **Regla de responsables (D18, aprobada):** *todo responsable de una tarea tiene acceso a su proyecto.* Se valida al asignar (existe) y se mantiene ante **cualquier** cambio que quite acceso, no solo al salir de la organización (existe):
  1. quitar a alguien de un proyecto restringido;
  2. pasar un proyecto de "Toda la organización" a "Solo miembros del proyecto";
  3. bajar a alguien de administrador a integrante cuando su acceso venía de ese rol;
  4. en la Etapa 2, sacarlo de un equipo que le daba el acceso.

  En todos los casos, antes de confirmar, la interfaz avisa: *"Ana y Luis perderán el acceso y dejarán de ser responsables de 7 tareas"*. El cambio queda registrado en la actividad. Las tareas no se borran: solo quedan sin esos responsables.

### 2.8 F — Calendario y planificación

| Vista | Resuelve | Etapa | Por qué |
|---|---|---|---|
| **Mis tareas** agrupada (vencidas · hoy · esta semana · más adelante · sin fecha) | "¿Qué tengo que hacer y qué se me pasó?" | **MVP** | Es el uso diario de cualquier integrante |
| **Filtros de vencimiento** en el tablero (vencidas, hoy, 7 días) | Detectar atrasos dentro de un proyecto | **MVP** | Existe en la API |
| **Indicadores de vencimiento** en las tarjetas | Ver la urgencia sin abrir la tarea | **MVP** | Insignias de la identidad |
| Vista **Lista** del proyecto (tabla ordenable) | Revisar muchas tareas, editar en masa | Etapa 2 | El tablero alcanza para empezar |
| **Calendario** (mes/semana) por proyecto y personal | Planificar por fecha | Etapa 2 | Necesita fecha de inicio para que sea útil |
| **Cronograma** (Gantt) | Planificación con dependencias | Etapa 3 | Alta complejidad; solo con dependencias |

### 2.9 G — Comentarios y colaboración

Projects coordina **alrededor de las tareas**; no es un chat. No habrá mensajes directos, canales ni hilos anidados.

| Mecanismo | Etapa | Detalle |
|---|---|---|
| Comentarios en la tarea (crear, editar el propio, borrar el propio; el líder borra cualquiera) | MVP | Existe |
| Historial de actividad del proyecto y de la tarea | MVP | Existe |
| Actividad reciente de la organización en Inicio | MVP | **Nuevo** endpoint |
| **Notificaciones dentro de la app**: te asignaron, comentaron en una tarea tuya, te mencionaron, vence mañana | Etapa 2 | Bandeja con contador; se marcan como leídas. Ver **D10** |
| **Menciones** `@persona` en comentarios | Etapa 2 | Generan notificación |
| Notificaciones por email (resumen diario) | Etapa 2 | Reutiliza el proveedor de **D11**. Son notificaciones, distintas del correo transaccional del MVP |
| Seguir una tarea sin ser responsable | Etapa 2 | Viene con las notificaciones |
| Adjuntos compartidos | Etapa 2 | Ver 2.5 |

### 2.10 H — Inicio (dashboard)

**Principio:** cada número tiene que llevar a una acción. Si un KPI no lleva a ninguna parte, no se muestra.

**Panel personal (todos los usuarios, MVP)**
- **Mis vencidas**, **Para hoy** y **Esta semana**: contadores que abren "Mis tareas" ya filtrada.
- **Lo próximo:** las 5–8 tareas más urgentes (vencimiento y prioridad), para marcarlas como hechas o abrirlas.
- **Mis proyectos:** proyectos recientes con su avance.

**Resumen de la organización (propietarios y administradores; los líderes ven solo sus proyectos)**
- **Proyectos activos** con barra de avance, cantidad de vencidas y estado (Activo · En pausa · Atrasado si pasó la fecha de fin).
- **Carga por integrante:** tareas abiertas y vencidas por responsable. Sirve para redistribuir trabajo. Se muestra como lista con números, no como gráfico decorativo.
- **Actividad reciente** de la organización (últimos 10–20 eventos).

**Fuera del MVP:** gráficos de tendencia (completadas por semana) y tiempos de ciclo; van a Reportes (Etapa 2–3).

---

## 3. Roles y permisos

### 3.1 Dos niveles de rol (más uno opcional)

| Nivel | Roles | Existe |
|---|---|---|
| **Organización** | Propietario · Administrador · Integrante · *Invitado (Etapa 2)* | Sí, salvo Invitado |
| **Proyecto** | **Líder** · Editor · Lector | Sí (en la API: `admin` / `editor` / `viewer`) |
| Tarea | Sin roles. Excepción: un lector que es responsable puede mover su propia tarea | Sí |

- "Líder de equipo o proyecto" es un **rol de proyecto**, no de organización. Una misma persona puede ser líder en un proyecto y lectora en otro.
- Propietarios y administradores son **líderes automáticos** en todos los proyectos (existe).
- **Invitado** (Etapa 2): persona externa (un cliente, un proveedor) que solo ve los proyectos a los que la agregan explícitamente, nunca los visibles para toda la organización. No ve la lista de integrantes, solo a los miembros de sus proyectos. No crea proyectos.

### 3.2 Matriz de permisos

✓ permitido · — no permitido · ◐ con condición (ver nota)

| Acción | Propietario | Admin | Líder | Editor | Lector | Invitado (E2) |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| **Organización** | | | | | | |
| Ver la organización y sus integrantes | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Editar datos de la organización | ✓ | ✓ | — | — | — | — |
| Eliminar la organización | ✓ | — | — | — | — | — |
| Invitar integrantes | ✓ | ✓ | — | — | — | — |
| Cambiar roles o quitar integrantes | ✓ | ◐¹ | — | — | — | — |
| Nombrar propietarios | ✓ | — | — | — | — | — |
| Gestionar equipos (E2) | ✓ | ✓ | — | — | — | — |
| **Proyectos** | | | | | | |
| Crear proyectos | ✓ | ✓ | ◐² | ◐² | ◐² | — |
| Ver un proyecto | ✓ | ✓ | ✓ | ✓ | ✓ | ◐³ |
| Editar datos, estado y fechas del proyecto | ✓ | ✓ | ✓ | — | — | — |
| Gestionar miembros y acceso del proyecto | ✓ | ✓ | ✓ | — | — | — |
| Gestionar columnas | ✓ | ✓ | ✓ | — | — | — |
| Archivar o restaurar | ✓ | ✓ | ✓ | — | — | — |
| Eliminar proyecto | ✓ | ✓ | ✓ | — | — | — |
| **Tareas** | | | | | | |
| Crear, editar y eliminar tareas | ✓ | ✓ | ✓ | ✓ | — | ◐³ |
| Asignar responsables | ✓ | ✓ | ✓ | ✓ | — | ◐³ |
| Mover o reordenar cualquier tarea | ✓ | ✓ | ✓ | ✓ | — | ◐³ |
| Mover su propia tarea asignada | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Comentar | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Editar o borrar comentario propio | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Borrar comentarios de otros | ✓ | ✓ | ✓ | — | — | — |
| Ver actividad del proyecto | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

¹ Los administradores gestionan solo a integrantes comunes, no a propietarios ni a otros administradores (existe).
² Hoy cualquier integrante puede crear proyectos y queda como líder del suyo. Restringirlo es opcional (decisión **D4**).
³ El invitado tiene el rol que le den en cada proyecto, como máximo Editor.

"Propietario", "Admin", "Líder", "Editor" y "Lector" combinan los dos niveles: un integrante común tiene en cada proyecto el rol Líder, Editor o Lector que le corresponda.

**Pendiente de confirmar:** D4 (quién crea proyectos), D9 (invitados), D19 (si un editor puede eliminar tareas o solo el líder).

**Dónde se aplican los permisos:** la fuente de verdad es la API (Django), que verifica cada operación (existe, 48 tests). El servidor de Next.js (BFF) verifica la sesión en cada página y en cada acción del servidor antes de llamar a la API. El `proxy` (antes `middleware`) solo redirige por comodidad; **nunca** es la única barrera (§9 bis.2).

---

## 4. Navegación y pantallas

### 4.1 Estructura

```
┌───────────────────────┬──────────────────────────────────────────────────────────────┐
│ [V] Velatrix One      │ Encabezado: título / migas · [+ Nueva tarea] · (🔔 E2) · Avatar│
│     Projects          ├──────────────────────────────────────────────────────────────┤
│ [Organización ▾]      │                                                              │
│                       │                      Contenido                               │
│ ⌂ Inicio              │                                                              │
│ ☑ Mis tareas          │                                                              │
│ ▤ Proyectos           │                                                              │
│   • Proyecto A        │                                                              │
│   • Proyecto B (★)    │                                                              │
│ 👥 Integrantes        │                                                              │
│ (📅 Calendario  E2)   │                                                              │
│ (📊 Reportes    E2)   │                                                              │
│ ───────────────       │                                                              │
│ ⚙ Configuración       │                                                              │
└───────────────────────┴──────────────────────────────────────────────────────────────┘
```

**Menú lateral (MVP):** Inicio · Mis tareas · Proyectos (con los recientes y favoritos debajo) · Integrantes · Configuración, al pie.

**Por qué así:**
- **Inicio y Mis tareas van separados.** Inicio da un resumen de un vistazo; Mis tareas es la lista completa para trabajar. Inicio muestra solo un recorte de Mis tareas, con enlace, para no duplicarla.
- **Calendario y Reportes no aparecen** hasta que existan. Ítems vacíos o "próximamente" restan confianza.
- **Actividad no es una sección propia:** está en cada proyecto (pestaña) y la reciente en Inicio (C2).
- **Equipos** (Etapa 2) entra como pestaña dentro de Integrantes ("Integrantes · Equipos"), no como ítem nuevo del menú.
- La **Configuración** del menú es la de la organización. Perfil y apariencia están en el menú del avatar.

**Encabezado:** título y migas de pan (Proyectos › Nombre), botón global **"+ Nueva tarea"** (pregunta el proyecto si no estás dentro de uno; atajo `N`), notificaciones (Etapa 2), búsqueda global (Etapa 2, atajo `Ctrl/⌘ K`) y avatar (Perfil, Apariencia, Cerrar sesión).

**Selector de organización:** arriba del menú. Lista tus organizaciones con tu rol y tiene "Crear organización". Al cambiar de organización se va a Inicio. "Mis tareas" es la única vista que mezcla organizaciones, y por eso tiene su propio filtro de organización.

**Navegación contextual del proyecto:** encabezado del proyecto (nombre, color, estado, avance, avatares de miembros, botón Compartir) y pestañas **Tablero · Actividad · Configuración**. En la Etapa 2 se suman Lista y Calendario.

**Mobile (< 768 px):** el menú lateral pasa a un cajón y aparece una barra inferior con Inicio · Mis tareas · Proyectos · (+). El tablero muestra una columna a la vez, con desplazamiento horizontal "por página".

### 4.2 Inventario de pantallas

| ID | Pantalla | Etapa | Vistas según contexto |
|---|---|---|---|
| P1 | Iniciar sesión | MVP | — |
| P2 | Crear cuenta | MVP | Con invitación pendiente: email precargado y aviso de a qué organización se une |
| P3 | Recuperar y restablecer contraseña | **MVP — requisito de lanzamiento** | Pedir enlace / nueva contraseña / enlace vencido o usado |
| P4 | Invitación | MVP | Sin sesión / con sesión / inválida (vencida, usada, revocada, para otro email) |
| P5 | Bienvenida (sin organización) | MVP | Crear organización / "Pedí un link de invitación" |
| S1 | Inicio | MVP | Integrante / líder / propietario-admin |
| S2 | Mis tareas | MVP | Todas mis organizaciones / una |
| S3 | Proyectos | MVP | Activos / Archivados |
| S4 | Proyecto · Tablero | MVP | Según rol: líder, editor, lector |
| S5 | Detalle de tarea | MVP | Panel lateral en escritorio / pantalla completa en mobile; edición o solo lectura |
| S6 | Proyecto · Actividad | MVP | — |
| S7 | Proyecto · Configuración | MVP | Solo líder: General · Columnas · Acceso y miembros · Zona peligrosa |
| S8 | Nuevo proyecto | MVP | Diálogo |
| S9 | Integrantes | MVP | Admin (gestiona e invita) / integrante (solo ve) |
| S10 | Configuración de la organización | MVP | Admin / propietario (zona peligrosa) |
| S11 | Perfil y preferencias | MVP | — |
| S12 | Errores: 404, sin acceso, sin conexión | MVP | — |
| E1 | Notificaciones | Etapa 2 | — |
| E2 | Proyecto · Lista y · Calendario; Calendario personal | Etapa 2 | — |
| E3 | Equipos | Etapa 2 | — |
| E4 | Reportes | Etapa 2–3 | — |
| E5 | Búsqueda global | Etapa 2 | — |

### 4.3 Especificación de pantallas (MVP)

**P1 · Iniciar sesión.** *Objetivo:* entrar. *Usuario:* cualquiera. *Información:* email y contraseña, "¿Olvidaste tu contraseña?", "Crear cuenta". *Acciones:* iniciar sesión. *Componentes:* formulario, curva de luz azul de fondo (identidad). *Relaciones:* lleva a P5 si no tiene organizaciones, a la invitación pendiente si vino de un link, o a S1.

**P2 · Crear cuenta.** Nombre, email, contraseña y confirmación. Validación en línea con las reglas del backend (mínimo 8 caracteres, no común, no numérica). Al terminar inicia sesión directamente.

**P3 · Recuperar contraseña.** Email → "Si existe una cuenta con ese email, te enviamos un enlace. Revisá también el correo no deseado." (mismo mensaje exista o no la cuenta) → el correo (Resend) trae un enlace de un solo uso que vence a los 60 minutos → nueva contraseña con las reglas de siempre → se cierran **todas** las sesiones abiertas de la cuenta → "Contraseña actualizada" → login. Además llega un correo de aviso: "Tu contraseña se cambió". *Enlace inválido, vencido o usado:* "Este enlace ya no es válido" con botón para pedir uno nuevo. Detalle técnico en §9 bis.3.

**P4 · Invitación.** Muestra el nombre de la organización, quién invita y el rol. *Sin sesión:* botones "Crear cuenta" e "Iniciar sesión"; el token se conserva y se acepta al terminar. *Con sesión:* "Unirme a {organización}". *Inválida:* explica el motivo y sugiere pedir un nuevo link.

**P5 · Bienvenida.** Para quien no pertenece a ninguna organización: "Crear mi organización" (solo el nombre) o "Tengo un link de invitación".

**S1 · Inicio.** *Objetivo:* saber en 5 segundos qué requiere atención. *Información y componentes:* ver 2.10 (tarjetas de cifras en Space Grotesk, lista "Lo próximo", tarjetas de proyecto con barra de avance, lista de carga por integrante, actividad reciente). *Acciones:* abrir una tarea, marcarla como hecha (la mueve a la primera columna terminada), ir a un proyecto, nueva tarea. *Relaciones:* S2, S4, S5.

**S2 · Mis tareas.** *Objetivo:* trabajar la lista personal. *Usuario:* todos. *Información:* tareas donde soy responsable, agrupadas en Vencidas · Hoy · Esta semana · Más adelante · Sin fecha, con proyecto, organización, prioridad y columna. *Acciones:* abrir, marcar como hecha, cambiar el vencimiento, filtros (organización, proyecto, prioridad, "incluir terminadas"). *Componentes:* lista agrupada, filtros, `StatusBadge`, insignia de prioridad. *Endpoint:* existe (`/my-tasks/`).

**S3 · Proyectos.** *Objetivo:* encontrar y crear proyectos. *Información:* tarjetas o lista con nombre, color, estado, avance, vencidas, líderes y fecha de fin. *Acciones:* crear (S8), abrir, marcar favorito, filtrar (estado, "en los que participo"), alternar Activos/Archivados. *Vacío:* "Creá tu primer proyecto" con el botón principal.

**S4 · Proyecto · Tablero.** *Objetivo:* organizar y mover el trabajo. *Información:* columnas de ancho fijo (296 px) con desplazamiento horizontal, tareas con título, prioridad, vencimiento, responsables y cantidad de comentarios. *Acciones:* agregar tarea en una columna (título y Enter), arrastrar entre columnas y dentro de la misma, **"Mover a…"** desde el menú de la tarjeta o con el teclado (alternativa al arrastre, obligatoria por WCAG 2.2, 2.5.7), filtros (responsable, prioridad, vencimiento, texto) con "Solo mis tareas". *Según rol:* el lector ve sin controles de edición y solo arrastra sus tareas asignadas; el líder ve además "+ Columna" mientras haya menos de 6. *Relaciones:* S5, S6, S7.

**S5 · Detalle de tarea.** *Objetivo:* ver y editar todo de una tarea sin perder el tablero. *Información:* título (editable en el lugar), columna (selector equivalente a "Mover a"), responsables, prioridad, vencimiento, descripción, comentarios e historial (pestaña o sección colapsable). *Acciones:* editar con guardado automático por campo, comentar, eliminar (con confirmación), copiar enlace. *Componentes:* panel lateral de 400–480 px que se cierra con Esc; tiene URL propia (`/proyectos/{id}?tarea={id}`) para compartir. En mobile ocupa toda la pantalla.

**S6 · Proyecto · Actividad.** Lista cronológica paginada de la actividad del proyecto (quién, qué, cuándo), con filtro por persona. Existe en la API.

**S7 · Proyecto · Configuración** (solo líderes).
- *General:* nombre, descripción, color, estado y fechas.
- *Columnas:* lista reordenable (máx. 6) con nombre, color y "terminada"; eliminar pide destino si la columna tiene tareas.
- *Acceso y miembros:* alcance de acceso ("Toda la organización", que puede editar o solo ver, o "Solo miembros del proyecto") y miembros con su rol. Restringir el acceso o quitar a un miembro muestra antes el aviso de la regla de responsables (§2.7).
- *Zona peligrosa:* archivar o eliminar (con confirmación por nombre).

**S8 · Nuevo proyecto** (diálogo). Nombre (obligatorio), color y **¿Quién puede acceder?**, con dos opciones visibles (no escondidas en un menú):
- **Toda la organización** (seleccionada al abrir), con una segunda elección: "pueden editar" (inicial) o "solo pueden ver".
- **Solo miembros del proyecto**, que habilita agregar personas en el mismo diálogo.

Debajo, una línea dice en palabras el resultado ("Las 12 personas de Kiosco Centro van a poder ver y editar este proyecto"). Opcional: descripción y fechas. Crea las 3 columnas por defecto y abre el tablero vacío con un mensaje para agregar la primera tarea. El alcance se muestra después como insignia en el encabezado del proyecto (ícono `globe` o `lock` y texto).

**S9 · Integrantes.** Tabla con nombre, email, rol y fecha de ingreso. *Admin:* "Invitar" (diálogo: rol y email opcional → genera el link y ofrece botón de copiar; si se cargó un email, también lo envía por correo e indica "Invitación enviada a …"), cambiar rol, quitar (con confirmación que explica que pierde accesos y asignaciones), y una pestaña de invitaciones pendientes para revocarlas. *Integrante:* solo lectura. *Cualquiera:* "Salir de la organización".

**S10 · Configuración de la organización.** Nombre. *Zona peligrosa (propietario):* eliminar la organización, confirmando por nombre y avisando que se borran todos los proyectos.

**S11 · Perfil y preferencias.** Nombre, email (solo lectura), cambiar contraseña (al cambiarla se cierran las demás sesiones y llega el correo de aviso), apariencia (Claro / Oscuro / Automático, guardada en `velatrix.projects.theme`), **cerrar sesión en este dispositivo** y **cerrar sesión en todos los dispositivos**.

**S12 · Errores.** 404 ("No encontramos lo que buscás"), sin acceso (ver 6) y sin conexión (aviso no bloqueante con reintento).

---

## 5. Flujos principales

> Formato: **Entrada → Pasos → Validaciones / errores → Resultado.** Los estados genéricos (cargando, error de red) se rigen por la sección 6.

**F1 · Registro e inicio de sesión.** *Entrada:* P1/P2, o un link de invitación. *Pasos:* completar formulario → enviar. *Validaciones:* email válido y no registrado; contraseña según reglas; las dos coinciden. *Errores:* "Ya existe una cuenta con este email" (con enlace a iniciar sesión), "Email o contraseña incorrectos" (genérico, no revela si el email existe), demasiados intentos (límite de 10 por minuto por IP real del usuario, C7: "Esperá un momento y volvé a intentar"). *Resultado:* el servidor de Next.js guarda la sesión en una cookie httpOnly (§9 bis.2); el navegador nunca ve los tokens → invitación pendiente, P5 o S1.

**F1 bis · Recuperar la contraseña.** *Entrada:* P1 › "¿Olvidaste tu contraseña?". *Pasos:* email → mensaje neutro → correo con enlace → nueva contraseña y confirmación → login. *Validaciones:* reglas de contraseña; token válido, no vencido (60 min) y no usado. *Errores:* enlace inválido, vencido o usado (ofrece pedir otro); demasiadas solicitudes (límite por IP y por email). *Efectos:* el token se marca como usado, se invalidan los demás tokens pendientes de esa cuenta, se cierran todas sus sesiones y se envía el aviso "Tu contraseña se cambió". *Resultado:* acceso recuperado sin intervención de soporte.

**F2 · Crear una organización.** *Entrada:* P5 o el selector de organización. *Pasos:* nombre → Crear. *Validación:* nombre no vacío. *Resultado:* quedás como propietario; se abre S1 con una guía de primeros pasos ("Creá un proyecto", "Invitá a tu equipo") que se puede cerrar.

**F3 · Incorporar integrantes.** *Entrada:* S9 › Invitar, o la guía de primeros pasos. *Pasos:* elegir rol (Integrante por defecto; Admin) → email opcional → Generar link → si hay email, se envía el correo de invitación; en todos los casos se puede copiar el link para compartirlo por WhatsApp u otro medio → la persona abre el link (F1 si no tiene cuenta) → "Unirme". *Error de envío:* si el correo falla, la invitación igual queda creada y se muestra "No pudimos enviar el correo; copiá el link y compartilo". *Errores:* la persona ya es integrante; link vencido, usado o revocado; email distinto al indicado. *Resultado:* aparece en Integrantes y queda en el registro de la invitación (aceptada por, cuándo).

**F4 · Crear un equipo** *(Etapa 2).* S9 › Equipos › Nuevo equipo → nombre → agregar integrantes → (opcional) dar acceso a proyectos con un rol. *Resultado:* los integrantes del equipo obtienen ese acceso; quitar a alguien del equipo le quita el acceso que venía por el equipo, no el directo.

**F5 · Crear un proyecto.** *Entrada:* S3 › Nuevo proyecto, o la guía. *Pasos:* nombre → color → acceso ("Toda la organización" ya elegida y visible; o "Solo miembros del proyecto" + personas) → Crear. *Validación:* nombre no vacío. *Resultado:* se abre S4 con Pendiente · En curso · Hecho y vos como líder. **Son 3 pasos como máximo.**

**F6 · Configuración inicial del proyecto.** *Entrada:* S4 (botón "Personalizar columnas" en el estado vacío) o S7. *Pasos:* renombrar, agregar (hasta 6), reordenar y marcar "terminada" → agregar miembros con su rol. *Errores:* límite de 6 columnas ("Un proyecto puede tener hasta 6 columnas"); eliminar la última columna; eliminar una columna con tareas sin elegir destino. *Resultado:* el tablero refleja el flujo del equipo.

**F7 · Crear tareas.** *Entrada:* "+ Agregar tarea" al pie de una columna (rápido), "+ Nueva tarea" global, o la tecla `N`. *Pasos (rápido):* escribir el título → Enter → el campo queda listo para la siguiente tarea. *Pasos (global):* proyecto → título → opcionales. *Validación:* título no vacío. *Errores:* sin permiso (el lector no ve el botón); columna de otro proyecto (no puede pasar en la interfaz). *Resultado:* la tarea aparece al final de la columna.

**F8 · Asignar responsables.** *Entrada:* S5 › Responsables, o el menú de la tarjeta. *Pasos:* buscar entre las personas con acceso al proyecto → marcar una o varias. *Validación:* solo personas con acceso; si alguien no tiene acceso, se ofrece "Agregar al proyecto" (solo al líder). *Resultado:* la tarea aparece en "Mis tareas" de esas personas (y en la Etapa 2 les llega una notificación).

**F9 · Mover tareas entre columnas.** *Entrada:* S4. *Pasos:* arrastrar y soltar, o "Mover a…" (menú, teclado o el selector de columna del detalle). *Comportamiento:* la interfaz se actualiza enseguida (optimista); si la API rechaza el cambio, la tarjeta vuelve a su lugar y se muestra un error. *Estados:* al entrar en una columna terminada la tarea se registra como completada; al salir, deja de estarlo. *Permisos:* el editor mueve cualquier tarea; el lector solo las suyas. *Resultado:* posición persistida y evento en la actividad.

**F10 · Seguimiento de avances.** *Entrada:* S1 (resumen) o S3/S4 (encabezado del proyecto). *Información:* avance (completadas sobre total), vencidas, carga por persona, estado y fecha de fin. *Acción:* entrar al detalle filtrado ("ver vencidas de este proyecto"). *Resultado:* el líder detecta atrasos y redistribuye trabajo con F8.

**F11 · Consultar tareas personales.** *Entrada:* S2 o las cifras de S1. *Pasos:* revisar los grupos → abrir o marcar como hecha → filtrar por organización. *Resultado:* lista priorizada sin entrar a cada proyecto.

**F12 · Consultar vencimientos.** *Entrada:* "Mis vencidas" o "Para hoy" en S1, el grupo "Vencidas" en S2, o el filtro de vencimiento en S4. *Regla:* una tarea está **vencida** si su fecha es anterior a hoy (en la zona horaria de la organización) y no está en una columna terminada. *Resultado:* lista accionable.

**F13 · Comentarios y colaboración.** *Entrada:* S5 › Comentarios. *Pasos:* escribir → Enviar (Ctrl/⌘ + Enter). *Validación:* texto no vacío. *Permisos:* cualquiera con acceso comenta; cada uno edita o borra lo suyo; el líder borra cualquiera. *Resultado:* el comentario aparece al instante y queda en la actividad. En la Etapa 2 se suman menciones y notificaciones.

**F14 · Finalizar y archivar un proyecto.** *Entrada:* S7 › General (estado) y Zona peligrosa. *Pasos:* estado "Finalizado" (sigue visible y editable) → cuando ya no se usa, **Archivar** → confirmar. *Comportamiento:* un proyecto archivado sale de los listados, del menú, de Mis tareas y de Inicio; queda en Proyectos › Archivados en solo lectura; el líder o un admin puede restaurarlo. *Eliminar:* solo desde Zona peligrosa, escribiendo el nombre. Es irreversible. *Resultado:* listados limpios sin perder el historial.

---

## 6. Estados y comportamiento de la interfaz

| Estado | Criterio |
|---|---|
| **Cargando** | Esqueletos con la forma del contenido real (no spinners de pantalla completa). Las acciones muestran el estado dentro del botón, que se deshabilita para evitar doble envío. Tras 10 s: "Esto está tardando más de lo normal" con reintento |
| **Sin información** (vacío inicial) | Explica qué va ahí y ofrece **una** acción principal. Ej.: "Todavía no hay proyectos — Crear proyecto". Puede usar la curva de luz o las partículas en baja opacidad (identidad). Si el usuario no tiene permiso para la acción, se explica a quién pedírsela |
| **Sin resultados** (por filtros o búsqueda) | "No hay tareas con estos filtros" + "Limpiar filtros". Nunca el mismo mensaje que el vacío inicial |
| **Error** | Mensaje en español y en lenguaje humano, que dice qué pasó y qué hacer, y con reintento. Los errores de validación aparecen junto al campo (borde y halo rojos con ícono). Los errores generales aparecen como aviso en la vista. Nunca se muestran códigos ni trazas |
| **Operación exitosa** | Si el resultado se ve en pantalla (la tarjeta se movió), no hace falta aviso. Toast breve solo para acciones sin reflejo visible o destructivas ("Proyecto archivado — **Deshacer**") |
| **Acceso denegado** | La API responde 404 si no tenés acceso, para no revelar que el recurso existe. La interfaz muestra "No encontramos este proyecto o no tenés acceso" con enlace a Proyectos. Lo que tu rol no permite **no se muestra** (no se muestran botones deshabilitados sin explicación) |
| **Archivado** | Franja neutra (gris con ícono `archive`) arriba: "Proyecto archivado · Solo lectura" y "Restaurar" si tenés permiso. Sin controles de edición |
| **Eliminado** | Si se abre un enlace a algo eliminado, se trata como 404. Si se elimina mientras otra persona lo mira, su siguiente acción recibe "Este elemento ya no existe" y vuelve al nivel superior |
| **Sesión vencida o revocada** | El servidor la renueva solo, sin que el usuario lo note. Si no se puede (inactividad, límite absoluto, cierre en todos los dispositivos, contraseña cambiada) vuelve al login con "Tu sesión terminó, iniciá sesión de nuevo", conservando la URL para regresar |
| **Sin conexión** | Aviso no bloqueante. Las acciones fallidas se revierten (ver F9) |

**Reglas de color (identidad):**
- El azul solo marca acción, selección o foco.
- Los avisos informativos van en gris con ícono `info`.
- No existe el estado "Confirmado".
- Los estados de negocio usan los colores funcionales con ícono y texto.

---

## 7. Modelo conceptual de datos

### 7.1 Diagrama

```
User ─┬─< Membership >─── Organization ──< Invitation
      │     (rol org)          │
      │                        ├──< Team ──< TeamMember >── User                 (E2)
      │                        │      └──< ProjectTeamAccess >── Board           (E2)
      │                        └──< Board ("proyecto")
      ├─< BoardMember >───────────────┤  (rol proyecto)
      │                               ├──< Column ──< Task
      │                               ├──< Label                                 (E2)
      │                               └──< Activity
      ├─< TaskAssignee >── Task ──┬──< Comment
      │                           ├──< ChecklistItem                             (E2)
      │                           ├──< Attachment                                (E2)
      │                           ├──< TaskLabel >── Label                       (E2)
      │                           └──< TaskDependency                            (E3)
      ├─< Notification                                                           (E2)
      └─< ProjectFavorite >── Board                                              (MVP, nuevo)
```

### 7.2 Entidades

| Entidad | Estado | Responsabilidad | Datos principales | Relaciones y cardinalidad |
|---|---|---|---|---|
| **User** | Existe | Identidad y login | email (único), full_name, password | N Membership, N BoardMember, N TaskAssignee |
| **Organization** | Existe | Inquilino: aísla datos y personas | name, created_by | 1..N Membership (≥1 propietario), N Board, N Invitation |
| **Membership** | Existe | Rol de un usuario en una organización | role (owner/admin/member; E2: guest) | único por (org, user) |
| **Invitation** | Existe | Link de ingreso | token, email?, role, expires_at, accepted/revoked | N:1 Organization |
| *Workspace* | **No se crea** | — | — | La organización cumple el rol (ver 2.1) |
| **Team** | E2 | Grupo de integrantes para dar acceso | name | N:1 Organization, N:M User (TeamMember), N:M Board con rol (ProjectTeamAccess) |
| **Board** (proyecto) | Existe, se amplía | Unidad de trabajo y de permisos | title, description, color, visibility, organization_role · **nuevos:** status, start_date, due_date, archived_at | N:1 Organization, 1..6 Column, N Task, N BoardMember |
| **BoardMember** | Existe | Rol explícito en el proyecto | role (admin = Líder / editor / viewer) | único por (board, user) |
| **ProjectFavorite** | **Nuevo MVP** | Accesos rápidos del menú | — | único por (user, board) |
| **Column** | Existe | Estado del flujo | name, color, position, is_done | N:1 Board, 1..6 por Board |
| **Task** | Existe, se amplía en E2 | Unidad de trabajo | title, description, priority, due_date, position, completed_at · E2: start_date | N:1 Board, N:1 Column (de su mismo Board), N:M User (responsables) |
| **Comment** | Existe | Conversación sobre la tarea | text, author | N:1 Task |
| **Activity** | Existe | Historial auditable | verb, data, actor, task? | N:1 Board |
| **Label** / **TaskLabel** | E2 | Clasificación libre por proyecto | name, color | Label N:1 Board; N:M Task |
| **ChecklistItem** | E2 | Pasos simples dentro de una tarea | text, done, position | N:1 Task |
| **Attachment** | E2 | Archivos | file, name, size, uploaded_by | N:1 Task (o Board) |
| **Notification** | E2 | Avisos personales | type, actor, target, read_at | N:1 User; se genera desde eventos de Activity |
| **PasswordResetToken** | **Nuevo MVP** | Recuperación de contraseña | `token_hash` (SHA-256, nunca el token en claro), expires_at, used_at, requested_ip | N:1 User. Un solo uso; al crear uno nuevo o cambiar la contraseña se invalidan los pendientes |
| *OutstandingToken / BlacklistedToken* | Existe (SimpleJWT) | Revocación de sesiones | jti, expiración | N:1 User. Permite "cerrar todas las sesiones" |
| **TaskDependency** | E3 | Bloqueos entre tareas | blocking_task, blocked_task | N:M Task, sin ciclos, dentro de la misma organización |
| **Subtask** | E3 (si hace falta) | Jerarquía | `Task.parent` | 1 nivel como máximo |

### 7.3 Integridad

- **Aislamiento entre organizaciones:** todo acceso se resuelve desde la membresía del usuario (existe, 48 tests). Toda entidad nueva tiene que colgar de Organization o de Board y pasar por los mismos chequeos.
- **Coherencia:** la columna de una tarea pertenece a su mismo proyecto (validado). Los responsables tienen que tener acceso al proyecto (validado), y al perderlo se los quita. Hoy eso existe solo para la salida de la organización; **falta** aplicarlo en los demás casos de pérdida de acceso de §2.7 (D18).
- **Archivado:** un proyecto archivado rechaza escrituras (lo hace el backend, no solo la interfaz).
- **Borrado:** eliminar un proyecto elimina todo lo que contiene (existe). Eliminar a un usuario conserva su autoría como "Usuario eliminado" (Activity y Comment usan `SET_NULL` o `CASCADE`: revisar al implementar la baja de cuenta).

### 7.4 Escalabilidad

| Riesgo | Cuándo aparece | Mitigación |
|---|---|---|
| Renumerar posiciones al mover tareas | Columnas con cientos de tareas | Posiciones fraccionarias |
| Tablero sin paginar | Más de ~1.000 tareas abiertas | Cargar por columna, archivar terminadas viejas |
| Avance y contadores calculados al vuelo | Muchos proyectos en Inicio | Agregaciones en una sola consulta; contadores cacheados después |
| Crecimiento de Activity | Uso intensivo | Índice existente (board, fecha); política de retención en E3 |
| Envío de notificaciones | E2 | Generación asíncrona (cola) |

---

## 8. MVP y roadmap

### 8.1 Etapa 1 — MVP

Objetivo: que un equipo organice proyectos, distribuya tareas y siga el avance, todos los días.

| Funcionalidad | Problema que resuelve | Por qué en el MVP | Depende de | Complejidad | Backend |
|---|---|---|---|---|---|
| Cuenta: registro, login, perfil, apariencia | Acceso | Base | — | Baja | Existe |
| **Recuperación de contraseña** | Usuarios bloqueados | **Requisito para el lanzamiento comercial** | Resend (D11) | Media | **Falta** |
| **Sesiones con cookies httpOnly (BFF)** | Robo de sesión por XSS | Condición de seguridad aprobada (D17) | Next.js 16 | Media | **Falta** (ajustes menores) |
| Cerrar esta sesión / todas las sesiones | Dispositivo perdido o compartido | Revocación exigida por D17 | BFF | Baja | Parcial (existe el cierre de una) |
| **Correo transaccional**: recuperación, contraseña cambiada, invitación con email | Comunicación esencial | Sin esto, la recuperación no funciona | Resend (D11), dominio verificado | Media | **Falta** |
| Organizaciones (crear, cambiar, salir) | Multi-empresa | Base del modelo | — | Baja | Existe |
| Integrantes e invitación por link | Sumar al equipo | Sin equipo no hay colaboración | — | Baja | Existe |
| Proyectos: crear, editar, acceso, miembros | Organizar el trabajo | Núcleo | — | Media | Existe |
| Proyecto: estado, fechas, archivar/restaurar | Seguimiento y orden | Flujo F14, avance y atrasos | — | Baja | **Falta** |
| Avance y vencidas en el listado de proyectos | Ver el estado de un vistazo | Promesa de "control" | — | Baja | **Falta** |
| Favoritos de proyecto | Acceso rápido | Uso diario con varios proyectos | — | Baja | **Falta** |
| Tablero: columnas (1–6), tareas, arrastrar, "Mover a" | Flujo de trabajo | Núcleo | — | Alta (interfaz) | Existe |
| Tareas: título, descripción, responsables, prioridad, vencimiento | Distribuir responsabilidades | Núcleo | — | Media | Existe |
| Filtros del tablero y "solo mis tareas" | Encontrar trabajo | Proyectos con muchas tareas | — | Baja | Existe |
| Comentarios | Coordinar sobre la tarea | Colaboración mínima | — | Baja | Existe |
| Actividad por proyecto y por tarea | Saber qué pasó | Control y confianza | — | Baja | Existe (falta el filtro por tarea) |
| Mis tareas (agrupada por vencimiento) | Trabajo personal | Uso diario | — | Media | Existe |
| Inicio: panel personal y resumen de la organización | Atención inmediata | Promesa de "visibilidad" | Avance, carga | Media | **Falta** (endpoint de resumen y de actividad reciente) |
| Responsive y accesibilidad | Uso en mostrador, celular o PC | Público objetivo | — | Media | — |

### 8.2 Etapa 2 — Evolución

| Funcionalidad | Problema | Por qué ahora y no antes | Depende de | Complejidad |
|---|---|---|---|---|
| Notificaciones internas en la app + menciones (D10) | Enterarse sin revisar todo | Primer pedido esperable tras el MVP | Activity | Media |
| Notificaciones por email (resumen diario, "te asignaron") | Alcance fuera de la app | Reutiliza Resend del MVP; es notificación, no transaccional | D11, notificaciones internas | Media |
| Equipos | Dar acceso a grupos | Hace falta cuando crece la cantidad de personas | — | Media |
| Invitados externos | Clientes y proveedores | Requiere afinar la visibilidad | Equipos opcional | Media |
| Etiquetas | Clasificar | Útil, no imprescindible | — | Baja |
| Checklist en tareas | Pasos dentro de una tarea | Cubre las "subtareas" simples | — | Baja |
| Adjuntos | Documentación | Costos de almacenamiento y límites por plan | Storage | Media |
| Vista Lista del proyecto | Revisar y editar en masa | Mejora la productividad | — | Media |
| Calendario (proyecto y personal) + fecha de inicio | Planificar por fecha | Con fechas cargadas aporta valor | start_date | Media |
| **Tareas recurrentes** | Rutinas: apertura y cierre de caja, reposición | Pedido explícito para después del MVP | Tarea programada | Media |
| Duplicar proyecto / plantillas simples | Repetir estructuras | Ahorra configuración | — | Baja |
| Reportes básicos (completadas por semana, por persona) | Medir | Requiere historia acumulada | Activity | Media |
| Búsqueda global | Encontrar rápido | Útil con muchos proyectos | — | Media |
| Restringir quién crea proyectos (D4) | Control del dueño | Ajuste fino | — | Baja |
| Descripción con formato | Textos largos | Mejora, no bloquea | — | Baja |

### 8.3 Etapa 3 — Avanzado

| Funcionalidad | Problema | Complejidad |
|---|---|---|
| Cronograma (Gantt) + dependencias | Planificación encadenada | Alta |
| Subtareas reales | Trabajo jerárquico | Media |
| Campos personalizados por proyecto | Necesidades de cada rubro | Alta |
| Reportes avanzados y exportación (CSV/PDF) | Gestión y auditoría | Media |
| Automatizaciones ("al mover a Hecho, notificar a…") | Trabajo repetitivo | Alta |
| Integraciones (calendario externo, email entrante, webhooks) | Ecosistema | Alta |
| Auditoría de la organización y retención | Empresas medianas | Media |
| SSO y políticas de seguridad | Empresas | Alta |
| Planes, límites y facturación | Monetización | Alta (decisión comercial) |

### 8.4 Cambios de backend necesarios para el MVP

> **Estado (2026-11-19): implementados los puntos 1–11** y cubiertos por tests. El punto 12 es configuración de
> despliegue (`CORS_ALLOWED_ORIGINS` vacío en producción). Pendiente para el lanzamiento: API key de Resend y
> dominio verificado (D25).

**Proyectos y tablero**
1. `Board`: `status` (active / on_hold / completed), `start_date`, `due_date`, `archived_at` (excluido de los listados por defecto; escrituras bloqueadas si está archivado).
2. Listado de proyectos con `tasks_total`, `tasks_done` y `tasks_overdue`.
3. `ProjectFavorite` y su endpoint.
4. Endpoint de **resumen de Inicio**: mis contadores; proyectos activos con avance; carga por integrante (según rol).
5. Endpoint de **actividad reciente de la organización** y filtro de actividad por tarea.
6. D18: aplicar la regla de responsables en todos los casos de pérdida de acceso (§2.7), con un endpoint de "vista previa" que devuelva a quiénes afectaría el cambio, para mostrar el aviso antes de confirmar.

**Cuenta, sesiones y correo (D11, D17)**

7. **Recuperación de contraseña:** modelo `PasswordResetToken` (hash), endpoints de solicitud (respuesta siempre neutra, límite de intentos) y de confirmación; cierra todas las sesiones al usarlo.
8. **Servicio de correo** con Resend: configuración propia de Projects (`RESEND_API_KEY`, `EMAIL_FROM`), plantillas propias en el repositorio (HTML + texto plano, en español y con la identidad azul), envío fuera del ciclo de la solicitud y registro de fallos. Correos: recuperación, contraseña cambiada, invitación.
9. **Revocación:** "cerrar todas las sesiones" (pone en la lista negra todos los refresh tokens del usuario) y aplicarlo también al cambiar la contraseña.
10. **Duración de sesión:** access token de 10 minutos; refresh rotativo con 7 días de inactividad y límite absoluto (D24).
11. **IP real para los límites de intentos:** confiar en el encabezado de IP del cliente **solo** si viene del BFF (con un secreto compartido entre servidores, D23) y usarla en los límites.
12. **Producción:** cerrar el CORS de la API cuando el navegador ya no la llama (C8).

> El backend **no** pasa a manejar cookies: con el BFF (D23) sigue siendo una API con tokens Bearer. Eso además la deja lista para una futura app móvil.

### 8.5 Orden sugerido de implementación del MVP

1. Ajustes de backend (8.4), empezando por cuenta, sesiones y correo.
2. Base del frontend en Next.js 16: BFF y sesión con cookies httpOnly, tokens de la identidad, temas, layout y autenticación (P1–P5, incluida la recuperación de contraseña).
3. Organización e integrantes (S9, S10, selector).
4. Proyectos y tablero (S3, S4, S5, S7, S8).
5. Mis tareas e Inicio (S1, S2).
6. Actividad, estados vacíos y de error, accesibilidad y responsive.

---

## 9. Criterios de calidad

| Criterio | Cómo se cumple |
|---|---|
| **Responsive** | Desde 360 px. Escritorio: menú lateral fijo. Tablet: menú colapsable. Mobile: cajón, barra inferior y tablero de una columna por vez con desplazamiento por página |
| **WCAG 2.2 AA** | Contrastes verificados en la identidad. Nada depende solo del color. Áreas táctiles de 36 px o más. Alternativa al arrastre ("Mover a…", criterio 2.5.7). El foco no queda oculto por paneles fijos (2.4.11) |
| **Teclado** | Todo es operable con Tab y Enter. Atajos: `N` nueva tarea, `/` filtrar, `Esc` cerrar el panel, flechas para moverse entre tarjetas, `M` "Mover a…". Hay un enlace "Saltar al contenido" |
| **Foco visible** | Anillo de 2 px `--focus-ring` con separación, en todo elemento interactivo |
| **Estados** | Sección 6 en todas las pantallas, sin excepciones |
| **Errores comprensibles** | En español, con causa y acción. La API ya devuelve los mensajes en español |
| **Consistencia** | Mismos componentes base del sistema Velatrix One; mismo patrón de diálogo, confirmación y deshacer |
| **Rendimiento** | El tablero carga una vez y aplica los cambios en forma optimista. Listas largas virtualizadas (más de 100 tarjetas por columna). Objetivo: interacción de arrastre por debajo de 100 ms de respuesta visual |
| **Escalabilidad** | Ver 7.4 |
| **Seguridad y aislamiento** | Permisos en la API (no solo en la interfaz); respuesta 404 sin revelar que existe; límite de intentos en login, recuperación e invitaciones; dependencias actualizadas; sesiones y correo según §9 bis |

---

## 9 bis. Seguridad, sesiones y correo

### 9 bis.1 Next.js (D16, aprobada)

**Decisión: Next.js 16.** Verificado en la política de soporte oficial (2026-11-19):
- **16.x está en Active LTS.**
- **15.x está en Maintenance LTS** y solo recibe parches de seguridad **hasta el 31-01-2027**.

Elegir la 15 obligaría a migrar otra vez en pocos meses. No se continúa con la 14.2.4.

**Compatibilidad evaluada.** Como el frontend se reconstruye, no hay código que migrar. Lo que condiciona la implementación:

| Cambio de Next.js 16 | Efecto en Projects |
|---|---|
| Node.js ≥ 20.9 · TypeScript ≥ 5.1 · React 19.2 | Hay que fijar Node 20.9+ (o 22 LTS) en Vercel y en local. El frontend nuevo se escribe en TypeScript |
| `middleware` pasa a llamarse **`proxy`** y corre en Node.js | Solo para redirecciones de comodidad (sin sesión → login). No es una barrera de seguridad |
| `cookies()`, `headers()`, `params` y `searchParams` son solo asíncronos | Patrón obligatorio en la capa de sesión y en las páginas |
| Turbopack por defecto; se elimina `next lint` | ESLint se ejecuta con su propia CLI (configuración "flat") |
| Navegadores: Chrome/Edge/Firefox 111+, Safari 16.4+ | Aceptable para el público objetivo |
| `@dnd-kit`, Axios y Tailwind | Sin incompatibilidades conocidas con React 19. Se verifican las versiones exactas al instalar |

**Plan B:** Next.js 15 solo si aparece un bloqueo concreto al implementar, y con fecha de migración a la 16 antes del 31-01-2027.

### 9 bis.2 Sesiones con cookies httpOnly (D17 y D23, aprobadas)

**El problema.** El frontend (Vercel) y la API (Render) están en dominios distintos. Una cookie que pone la API no viaja con las solicitudes del frontend sin `SameSite=None`, y los navegadores bloquean cada vez más esas cookies "de terceros". Hay dos formas de resolverlo:

| | **A. BFF (recomendada)** | B. Cookies puestas por la API |
|---|---|---|
| Cómo funciona | El navegador solo habla con el servidor de Next.js. Next.js guarda la sesión en **su propia** cookie httpOnly y llama a Django con `Authorization: Bearer` | Django pone la cookie y el navegador llama a la API directo |
| Requisito de dominios | Ninguno | Frontend y API bajo el mismo dominio propio (`app.` y `api.` de un mismo dominio) |
| Cookies | Del mismo sitio: `SameSite=Lax` sin conflictos | `SameSite=Lax` entre subdominios, con el dominio de la cookie compartido |
| CSRF | Next.js valida el `Origin` en Server Actions; las rutas propias lo validan explícitamente | Hay que activar el CSRF de Django (token doble) |
| Cambios en Django | Menores (§8.4, puntos 9–12) | Mayores: autenticación por cookie, CSRF, CORS con credenciales |
| Futura app móvil | Usa la misma API con Bearer | Requiere un segundo mecanismo |
| Costo | Un salto extra por solicitud (lo compensa la interfaz optimista) | — |

**Diseño con BFF**

| Aspecto | Definición |
|---|---|
| Cookie | `__Host-vx-projects-session` en producción: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, sin `Domain`. En desarrollo (http://localhost) se usa otro nombre y sin `Secure` |
| Contenido | Access y refresh token **cifrados y autenticados** con un secreto del servidor (`SESSION_SECRET`). El navegador no puede leerlos ni alterarlos |
| Expiración | Access: 10 minutos. Refresh rotativo: se renueva con el uso y vence tras **7 días sin actividad**. Límite absoluto de sesión: **30 días** (D24). La cookie vence junto con el refresh |
| Renovación | La hace el servidor, sin que el usuario lo note. La rotación invalida el refresh anterior (lista negra, existe) |
| Revocación | **Cerrar sesión** (blacklist del refresh + borrar la cookie); **cerrar todas las sesiones** (blacklist de todos los refresh del usuario); automática al **cambiar o recuperar la contraseña** |
| CSRF | Mutaciones solo por POST, PUT, PATCH o DELETE. Server Actions con la verificación de origen integrada de Next.js. Rutas propias rechazan solicitudes cuyo `Origin` no sea el del sitio. `SameSite=Lax` como segunda barrera. La API de Django no usa cookies, así que no necesita CSRF |
| Verificación en el servidor | Una única **capa de acceso a datos** del BFF: cada página, Server Action y ruta lee la sesión, la valida y recién entonces llama a la API. El `proxy` solo redirige. La API vuelve a verificar permisos en cada operación (defensa en profundidad) |
| Datos al cliente | Solo lo que la pantalla necesita. Nunca tokens ni secretos (variables sin `NEXT_PUBLIC_`) |
| Encabezados | CSP restrictiva, `frame-ancestors 'none'`, `Referrer-Policy: strict-origin-when-cross-origin`, HSTS en producción |
| IP real y límites | El BFF reenvía la IP del usuario en un encabezado y se identifica ante la API con un secreto compartido. Django solo confía en esa IP si el secreto es válido (C7) |
| CORS | Con el BFF, la API no necesita CORS para el navegador. Se cierra en producción (C8) |

### 9 bis.3 Recuperación de contraseña y correo (D11, aprobada)

**Tokens de recuperación**
- 32 bytes aleatorios criptográficamente seguros. Se guarda **solo su hash SHA-256** (`PasswordResetToken`), nunca el token en claro.
- **Un solo uso** (`used_at`) y vencimiento a los **60 minutos**.
- Pedir uno nuevo invalida los pendientes; cambiar la contraseña invalida todos.
- La solicitud **siempre** responde lo mismo, exista o no la cuenta, y tarda lo mismo: el envío se hace fuera de la solicitud.
- Límite de intentos por IP y por email.
- Al usarlo, se cierran todas las sesiones de la cuenta y se envía el aviso "Tu contraseña se cambió".
- El enlace usa el dominio del frontend (`FRONTEND_URL`). La página de restablecimiento no carga recursos externos y usa `Referrer-Policy: no-referrer`, para que el token no se filtre.

**Correo con Resend**
- Se reutiliza la **experiencia** del sitio institucional (`C:\velatrix`, `notificador-resend.ts`), pero **no** su configuración. Projects tiene su propia API key, su propio remitente y sus propias plantillas.
- Configuración por variables de entorno (`RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`). Las credenciales nunca se versionan.
- Requisito de lanzamiento: **dominio de envío verificado** (SPF y DKIM, idealmente DMARC). Ver D25.
- Plantillas en el repositorio de Projects, en español, en HTML y en texto plano, con la identidad de Projects (azul, logo con la regla de marca) y pie "por Velatrix".
- El backend envía los correos (es quien conoce usuarios y tokens), fuera del ciclo de la solicitud, con reintento ante fallos temporales y registro del error sin datos sensibles.

| Correo transaccional (MVP) | Disparador |
|---|---|
| Restablecer contraseña | Solicitud de recuperación |
| Tu contraseña se cambió | Recuperación o cambio de contraseña |
| Invitación a {organización} | Invitación creada con email |

Las **notificaciones** (asignaciones, comentarios, menciones, resúmenes) son otro sistema y llegan en la Etapa 2 (D10).

---

## 10. Decisiones

### 10.1 Aprobadas (2026-11-19)

| ID | Decisión | Detalle |
|---|---|---|
| **D1** | Sin espacios de trabajo | Organización → Proyecto → Columnas → Tareas |
| **D3** | Equipos en la Etapa 2 | En el MVP, "Integrantes" son las personas de la organización |
| **D5** | Acceso de proyectos nuevos | "Toda la organización" como opción inicial visible. Siempre es posible elegir acceso restringido. El alcance es explícito y modificable según permisos (S8, S7) |
| **D7** | Varios responsables por tarea | Se aprovecha el backend actual; sin "colaboradores" |
| **D10** | Notificaciones internas en la Etapa 2 | Separadas del correo transaccional (MVP) |
| **D11** | Resend como proveedor de correo | Configuración, credenciales y plantillas propias de Projects (§9 bis.3) |
| **D16** | Next.js 16 (Active LTS) | Next.js 15 solo como plan B (§9 bis.1) |
| **D17** | Sesiones con cookies httpOnly | Secure en producción, SameSite, CSRF, expiración y revocación (§9 bis.2) |
| — | Recuperación de contraseña en el MVP | Requisito para el lanzamiento comercial; tokens con hash, vencimiento y un solo uso (§9 bis.3) |
| — | Autorización no dependiente del middleware | Verificación en el servidor (BFF) y en la API en cada operación |

### 10.2 Aprobadas en la revisión final (2026-11-19)

Todas con la recomendación propuesta. No quedan decisiones pendientes para el MVP.

**Derivadas de D17 y D18**

| ID | Decisión | Recomendación | Alternativas | Impacto |
|---|---|---|---|---|
| **D18** | Responsables que pierden acceso a un proyecto | Regla general: todo responsable tiene acceso. Ante cualquier pérdida de acceso (§2.7) se lo quita de sus tareas, con aviso previo y registro en la actividad | Mantener la asignación aunque no vea el proyecto (rompe "Mis tareas" y la carga por persona) | Bajo |
| **D23** | Arquitectura de sesión | **BFF**: Next.js guarda la sesión y llama a Django con Bearer | Cookies puestas por Django, con frontend y API en subdominios de un mismo dominio | Alto: define la autenticación del frontend |
| **D24** | Duración de la sesión | Access 10 min · 7 días de inactividad · límite absoluto 30 días | Sin límite absoluto (más cómodo, menos seguro); o límites más cortos | Bajo |
| **D25** | Dominio propio para Projects | Definirlo antes del lanzamiento (para el correo verificado y la cookie `__Host-`). Para desarrollo alcanzan los dominios de Vercel y Render | Lanzar sin dominio propio (el correo verificado sigue siendo necesario) | Medio: bloquea el envío de correo en producción |
| **D26** | Verificación del email al registrarse | Etapa 2, sin bloquear el uso | En el MVP, obligatoria antes de usar la app (más fricción, menos cuentas falsas) | Bajo |

**Recomendaciones de la revisión 1**

| ID | Decisión | Recomendación |
|---|---|---|
| D2 | Nombres | "Integrantes" para personas; "Equipos" para grupos (E2) |
| D4 | Quién crea proyectos | Cualquier integrante; ajuste opcional en la Etapa 2 |
| D6 | Estado del proyecto | Activo · En pausa · Finalizado, con el archivado aparte |
| D8 | Columnas "descartadas" | MVP: solo "terminada" |
| D9 | Invitados externos | Etapa 2 |
| D12 | Inicio y Mis tareas | Secciones separadas |
| D13 | Calendario y Reportes | Fuera del menú hasta existir |
| D14 | Fecha de inicio de tarea, etiquetas, checklist, adjuntos | Etapa 2 |
| D15 | Prioridad de proyecto | No se incluye |
| D19 | ¿El editor elimina tareas? | Sí (como hoy) |
| D20 | Mobile | Responsive completo, tablero de una columna por vez |
| D21 | Imagen de portada | No se muestra en el MVP |

