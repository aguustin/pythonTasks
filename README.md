# Velatrix — Gestor de tareas para equipos

Gestor de tareas estilo Kanban para empresas, comercios, kioscos y equipos de trabajo.
Multi-organización, con permisos por tablero, columnas personalizables, responsables,
prioridades, comentarios e historial de actividad.

> **Estado:** MVP completo (backend + frontend), listo para pruebas con usuarios reales. Para lanzarlo
> comercialmente faltan la API key de Resend y el dominio verificado para los correos (D25).

**Velatrix One · Projects** — *Gestión de proyectos y equipos.* Lo que incluye el MVP:

- Cuentas con sesión segura, recuperación de contraseña y cierre de sesiones.
- Organizaciones, integrantes con roles e invitaciones por link (con correo opcional).
- Proyectos con acceso por organización o restringido, favoritos, archivado y configuración.
- Tablero con columnas propias (hasta 6), alta rápida, arrastrar y soltar, "Mover a…", filtros y
  "Solo mis tareas"; detalle de la tarea con responsables, prioridad, vencimiento, comentarios e historial.
- **Mis tareas** e **Inicio** con los mismos criterios (Vencidas · Hoy · Esta semana · Más adelante · Sin fecha),
  marcar como hecha con "Deshacer", resumen de proyectos y carga por integrante.
- Tema claro y oscuro, celular con barra inferior, atajos de teclado y accesibilidad WCAG 2.2 AA.

---

## Stack

**Backend:** Python 3.12 · Django 5.2 LTS · Django REST Framework · SimpleJWT (con blacklist) ·
PostgreSQL (SQLite en local) · Cloudinary (opcional) · Gunicorn + WhiteNoise · Docker

**Frontend:** Next.js 16 (App Router, TypeScript) · React 19 · Tailwind CSS 4 · Lucide · BFF con sesión en
cookie httpOnly cifrada (ver [`taskfront/README.md`](taskfront/README.md))

---

## Conceptos y permisos

```
Usuario ──< Membresía >── Organización ──< Tablero ──< Columna (máx. 6) ──< Tarea ──< Comentario
                 (dueño/admin/miembro)        │                                  │
                                              └──< Miembro del tablero           └── Responsables (varios)
                                                   (admin/editor/lector)
```

- Un usuario puede pertenecer a **varias organizaciones**.
- **Rol en la organización:** `owner` (dueño), `admin`, `member`, `guest` (invitado: persona externa que solo ve
  los proyectos que le comparten, directo o por un equipo; no ve los abiertos a la organización, no crea proyectos
  ni ve la lista de integrantes ni los equipos).
- **Quién crea proyectos (D4):** `organization.project_creation` = `members` (por defecto: cualquiera salvo
  invitados) o `managers` (solo dueño y admins). Aplica también a duplicar. Lo cambian dueño y admins.
- **Equipos:** grupos de integrantes de la organización (los gestionan dueño y admins) que se pueden sumar a un
  proyecto con un permiso.
  - Dueño y admins: son admin de todos los tableros, invitan y gestionan miembros.
  - Los admins solo gestionan miembros comunes; solo un dueño nombra o quita dueños.
  - Siempre tiene que quedar al menos un dueño.
- **Permiso en el tablero** (efectivo):
  1. Dueño/admin de la organización → `admin`.
  2. Si no, el **más alto** entre: el permiso directo en el tablero, el de sus equipos con acceso y, si el tablero
     tiene `visibility=organization` y no es invitado, el `organization_role` del tablero.
  3. Ninguno → sin acceso (la API responde 404, no revela que existe).
  Si alguien pierde el acceso (sale de un equipo, se borra el equipo, se quita el equipo del proyecto, pasa a
  invitado), deja de ser responsable de esas tareas (regla D18).

| Acción | lector | editor | admin |
|---|:-:|:-:|:-:|
| Ver tablero, tareas, actividad | ✓ | ✓ | ✓ |
| Comentar | ✓ | ✓ | ✓ |
| Mover tareas **asignadas a uno mismo** | ✓ | ✓ | ✓ |
| Crear / editar / mover / borrar cualquier tarea | | ✓ | ✓ |
| Editar / borrar tablero, columnas y miembros | | | ✓ |

- Cada tablero nace con 3 columnas (`Pendiente`, `En curso`, `Hecho`) y admite **hasta 6**.
  Las columnas con `is_done=true` marcan las tareas como completadas (`completed_at`).
- Invitaciones por **link** de un solo uso, vencen a los 7 días. Pueden atarse a un email.

---

## API v1

Base: `/api/v1/` · Autenticación: `Authorization: Bearer <access>` · Errores en español.

### Autenticación
| Método | Ruta | Descripción |
|---|---|---|
| POST | `auth/register/` | `{email, full_name, password, password_confirm}` → `{user, tokens}` |
| POST | `auth/login/` | `{email, password}` → `{user, tokens}` |
| POST | `auth/refresh/` | `{refresh}` → `{access, refresh}` (rota el refresh) |
| POST | `auth/logout/` | `{refresh}` → cierra esta sesión |
| POST | `auth/logout-all/` | Cierra todas las sesiones del usuario (access incluidos, al instante) |
| GET/PATCH | `auth/me/` | Perfil (`full_name` editable) |
| POST | `auth/change-password/` | `{current_password, new_password}` → `{tokens}` nuevos; cierra las demás sesiones y avisa por correo |
| POST | `auth/password-reset/` | `{email}` → 202, siempre la misma respuesta. Envía el enlace si la cuenta existe |
| POST | `auth/password-reset/confirm/` | `{token, new_password, new_password_confirm}`. Un solo uso, vence a los 60 min; cierra todas las sesiones |

**Sesiones:** access de 10 minutos; refresh rotativo que vence tras 7 días sin uso; límite absoluto de 30 días
desde el login. Cada token lleva la versión de sesión del usuario (`sv`): cerrar todas las sesiones o cambiar
la contraseña la incrementa e invalida al instante todo lo emitido antes. El frontend guarda los tokens en el
servidor de Next.js (BFF) dentro de una cookie httpOnly; el navegador nunca los ve (ver
`docs/especificacion-funcional.md` §9 bis).

### Organizaciones
| Método | Ruta | Permiso |
|---|---|---|
| GET/POST | `organizations/` | Mis organizaciones / crear (quedo como dueño) |
| GET/PATCH/DELETE | `organizations/{id}/` | miembro / admin / dueño · PATCH `{name?, project_creation?}` |
| POST | `organizations/{id}/leave/` | miembro |
| GET | `organizations/{id}/members/` | miembro |
| PATCH/DELETE | `organizations/{id}/members/{membership_id}/` | admin (ver reglas) |
| GET | `organizations/{id}/members/{membership_id}/impact/?role=…` o `?remove=true` | admin · vista previa: tareas que la persona dejaría de tener asignadas |
| GET/POST | `organizations/{id}/invitations/` | admin · `{email?, role}` · `?status=pending`. Con email, se envía por correo (`email_sent`) |
| GET/POST | `organizations/{id}/teams/` | integrante (no invitado) / admin · `{name}` → incluye `members` y `projects` |
| PATCH/DELETE | `organizations/{id}/teams/{team_id}/` | admin |
| POST · DELETE | `organizations/{id}/teams/{team_id}/members/` `{user_id}` · `…/members/{user_id}/` | admin |
| GET | `organizations/{id}/home/` | miembro · panel de Inicio: mis contadores, próximas tareas y (propietario/admin/líder) resumen de proyectos y carga por persona |
| GET | `organizations/{id}/reports/?weeks=4\|8\|12\|26&board=` | miembro · completadas y creadas por semana, por persona (completadas, abiertas, vencidas) y totales; solo proyectos que ve |
| GET | `organizations/{id}/reports/completed/?weeks=&board=` | miembro · detalle de completadas del período (para exportar a CSV; máx. 5000) |
| GET | `organizations/{id}/activity/` | miembro · actividad reciente de los proyectos que ve (paginado) |
| DELETE | `organizations/{id}/invitations/{inv_id}/` | admin (revoca) |
| GET | `invitations/{token}/` | **público** — datos para mostrar la invitación |
| POST | `invitations/{token}/` | usuario logueado — aceptar |

El link de invitación es `{FRONTEND_URL}/invitacion/{token}`.

### Tableros, columnas y tareas
| Método | Ruta | Permiso |
|---|---|---|
| GET | `boards/?organization={id}[&archived=true]` | proyectos visibles, sin archivados por defecto. Incluye `my_role`, `is_favorite`, `tasks_total`, `tasks_done`, `tasks_overdue` y `leads` (líderes explícitos) |
| POST | `boards/` | miembro de la org · JSON o multipart (`image`) |
| GET | `boards/{id}/` | lector (incluye `columns`) |
| PATCH/DELETE | `boards/{id}/` | admin. `status` (`active`/`on_hold`/`completed`), `start_date`, `due_date`. Archivado = solo lectura |
| POST | `boards/{id}/archive/` · `boards/{id}/restore/` | admin |
| POST | `boards/{id}/duplicate/` | lector e integrante de la org · `{title, include_tasks?, include_members?, keep_dates?}` → `{id}`. Plantillas: copia columnas y acceso; tareas abiertas opcionales; miembros solo si duplica un líder; responsables sin acceso se omiten |
| POST/DELETE | `boards/{id}/favorite/` | lector · favorito personal |
| POST | `boards/{id}/access-preview/` | admin · `{visibility?, remove_user_ids?}` → responsables que perderían el acceso (no cambia nada) |
| GET/POST | `boards/{id}/members/` | lector / admin · `{user_id, role}` |
| PATCH/DELETE | `boards/{id}/members/{member_id}/` | admin |
| GET/POST | `boards/{id}/columns/` | lector / admin (máx. 6) |
| PATCH | `boards/{id}/columns/{col_id}/` | admin · `{name, color, is_done}` |
| DELETE | `boards/{id}/columns/{col_id}/?move_to={col_id}` | admin (`move_to` obligatorio si tiene tareas) |
| POST | `boards/{id}/columns/reorder/` | admin · `{order: [ids]}` |
| GET/POST | `boards/{id}/teams/` | lector / admin · `{team_id, role}` (equipo de la misma organización) |
| PATCH/DELETE | `boards/{id}/teams/{access_id}/` | admin · `{role}` |
| GET/POST | `boards/{id}/labels/` | lector / editor · `{name, color}` (`gray`/`red`/`orange`/`yellow`/`green`/`teal`/`blue`/`purple`), nombre único por proyecto |
| PATCH/DELETE | `boards/{id}/labels/{label_id}/` | admin |
| GET/POST | `tasks/{id}/checklist/` | lector / editor · `{text}` |
| PATCH/DELETE | `checklist/{id}/` | editor (un lector responsable puede cambiar solo `done`) / editor |
| GET/POST | `boards/{id}/tasks/` | lector / editor |
| GET | `boards/{id}/activity/[?task={id}]` | lector (paginado) |
| GET/PATCH/DELETE | `tasks/{id}/` | lector / editor / editor |
| POST | `tasks/{id}/move/` | editor, o lector asignado · `{column, position?}` |
| POST | `tasks/{id}/complete/` | editor, o lector asignado · a la primera columna de terminadas. Devuelve `previous: {column, position}` para deshacer con `move/` |
| POST | `tasks/{id}/reopen/` | editor, o lector asignado · a la primera columna sin terminar, al final |
| GET/POST/DELETE | `tasks/{id}/follow/` | lector · seguir la tarea → `{following}`. Quien la sigue recibe sus comentarios y cuando se termina |
| GET | `boards/{id}/people/` | lector · personas con acceso al proyecto y su permiso efectivo (para elegir responsables) |
| GET/POST | `tasks/{id}/comments/` | lector |
| PATCH/DELETE | `comments/{id}/` | autor / autor o admin. Comentarios: `{text, mention_ids?}`; solo cuentan las personas con acceso cuyo `@Nombre` está en el texto |
| GET | `notifications/?organization={id}[&unread=true]` | mis avisos (paginado) en proyectos que hoy puedo ver |
| GET | `notifications/unread-count/?organization={id}` | `{count}` |
| POST | `notifications/{id}/read/` · `notifications/read-all/?organization={id}` | marcar como leídos |
| GET | `search/?organization={id}&q=texto` | miembro · búsqueda global (mín. 2 letras): proyectos (5) y tareas (12) de proyectos visibles y no archivados; tareas abiertas primero |
| GET | `my-tasks/` | mis tareas asignadas, en todas mis organizaciones (incluye `board_title`, `board_color`, `column_name`, `is_done`) |

**Regla de responsables:** todo responsable tiene acceso al proyecto. Si alguien pierde el acceso (sale del
proyecto, el proyecto pasa a privado, baja de rol en la organización), deja de ser responsable de esas tareas y
queda registrado en la actividad (`assignees_removed`). Las vistas previas sirven para avisar antes de confirmar.

**Tarea:** `title`, `description`, `priority` (`low`/`medium`/`high`/`urgent`), `start_date` (opcional, no posterior
al vencimiento), `due_date`,
`column`, `assignee_ids` (escritura) / `assignees` (lectura), `label_ids` / `labels` (del mismo proyecto),
`checklist_total` y `checklist_done` (lectura), `repeat` (`none`/`daily`/`weekdays`/`weekly`/`monthly`).
Para cambiar de columna se usa `move/`.

**Recurrencia:** al pasar a una columna de terminadas, una tarea que se repite crea la próxima (misma información y
responsables) en la primera columna sin terminar, con la siguiente fecha posterior a hoy. Se crea una sola vez por
tarea, aunque se reabra y se vuelva a terminar. Sin tareas programadas en el servidor.

**Filtros** (`boards/{id}/tasks/` y `my-tasks/`): `assignee=<id>|me|none`, `priority=high,urgent`,
`due=overdue|today|week|none`, `status=open|done|all`, `column=<id>`, `q=texto`.
En `my-tasks/` además `organization=<id>` y, dentro de ella, `team=<id>`; por defecto `status=open`.
`organizations/{id}/home/` y `organizations/{id}/activity/` también aceptan `team=<id>`: solo cuentan los
proyectos a los que ese equipo tiene acceso (los invitados reciben 403; un equipo de otra organización, 400).

**Avisos (notificaciones):** te asignaron · comentaron en una tarea tuya o que seguís · te mencionaron · se terminó
una tarea tuya o que seguís · vence mañana. Nunca se avisa a quien hizo la acción ni a quien no tiene acceso al
proyecto; la mención reemplaza al aviso de comentario. "Vence mañana" se genera al consultar los avisos (una vez por
tarea y día), sin tareas programadas.

**Inicio y Mis tareas usan los mismos grupos:** vencidas (antes de hoy) · hoy · esta semana (de mañana a 7 días)
· más adelante · sin fecha; solo tareas abiertas de proyectos no archivados. Los contadores de
`organizations/{id}/home/` (`overdue`, `today`, `week`) cuentan exactamente esos grupos.

Otros: `GET /health/` (chequeo de vida) · `/admin/` (panel de Django).

---

## Desarrollo local

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows
source .venv/bin/activate       # macOS / Linux

pip install -r requirements.txt
cp .env.example .env            # y poner DEBUG=True para usar SQLite
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Tests: `python manage.py test tests`

Con Docker (backend + PostgreSQL): `docker compose -f Docker-compose.yml up --build`

Frontend: `cd taskfront && cp .env.example .env.local && npm install && npm run dev` (ver [`taskfront/README.md`](taskfront/README.md)).

---

## Variables de entorno

Ver [`.env.example`](.env.example). En producción son obligatorias `SECRET_KEY`, `ALLOWED_HOSTS`,
`DATABASE_URL`, `FRONTEND_URL`, `BFF_SHARED_SECRET`, `RESEND_API_KEY` y `EMAIL_FROM` (con dominio verificado
en Resend). Sin `SECRET_KEY` la app no arranca. `CORS_ALLOWED_ORIGINS` queda vacío: con el BFF el navegador no
llama a la API.
Si no se configura Cloudinary (`CLOUD_NAME`, `CLOUD_API_KEY`, `CLOUD_API_SECRET`) las imágenes
se guardan en disco.

## Despliegue

- **Backend:** imagen Docker (gunicorn, aplica migraciones al iniciar). Pensado para Render
  con PostgreSQL administrado. Respeta `PORT` y `WEB_CONCURRENCY`.
- **Frontend:** Vercel o Docker (`taskfront/Dockerfile`), con `API_URL`, `SESSION_SECRET` y `BFF_SHARED_SECRET`.
  El navegador nunca llama a la API directamente.
