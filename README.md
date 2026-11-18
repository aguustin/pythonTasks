# Velatrix — Gestor de tareas para equipos

Gestor de tareas estilo Kanban para empresas, comercios, kioscos y equipos de trabajo.
Multi-organización, con permisos por tablero, columnas personalizables, responsables,
prioridades, comentarios e historial de actividad.

> **Estado:** el backend (API v1) está completo y testeado. El frontend (`taskfront/`)
> todavía usa la API vieja y se va a rehacer siguiendo el branding de Velatrix.

---

## Stack

**Backend:** Python 3.12 · Django 5.2 LTS · Django REST Framework · SimpleJWT (con blacklist) ·
PostgreSQL (SQLite en local) · Cloudinary (opcional) · Gunicorn + WhiteNoise · Docker

**Frontend:** Next.js 14 · React 18 · Tailwind CSS · @dnd-kit · Axios

---

## Conceptos y permisos

```
Usuario ──< Membresía >── Organización ──< Tablero ──< Columna (máx. 6) ──< Tarea ──< Comentario
                 (dueño/admin/miembro)        │                                  │
                                              └──< Miembro del tablero           └── Responsables (varios)
                                                   (admin/editor/lector)
```

- Un usuario puede pertenecer a **varias organizaciones**.
- **Rol en la organización:** `owner` (dueño), `admin`, `member`.
  - Dueño y admins: son admin de todos los tableros, invitan y gestionan miembros.
  - Los admins solo gestionan miembros comunes; solo un dueño nombra o quita dueños.
  - Siempre tiene que quedar al menos un dueño.
- **Permiso en el tablero** (efectivo):
  1. Dueño/admin de la organización → `admin`.
  2. Permiso explícito en el tablero → ese permiso.
  3. Tablero con `visibility=organization` → `organization_role` del tablero.
  4. Si no → sin acceso (la API responde 404, no revela que existe).

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
| POST | `auth/logout/` | `{refresh}` → invalida el refresh token |
| GET/PATCH | `auth/me/` | Perfil (`full_name` editable) |
| POST | `auth/change-password/` | `{current_password, new_password}` |

### Organizaciones
| Método | Ruta | Permiso |
|---|---|---|
| GET/POST | `organizations/` | Mis organizaciones / crear (quedo como dueño) |
| GET/PATCH/DELETE | `organizations/{id}/` | miembro / admin / dueño |
| POST | `organizations/{id}/leave/` | miembro |
| GET | `organizations/{id}/members/` | miembro |
| PATCH/DELETE | `organizations/{id}/members/{membership_id}/` | admin (ver reglas) |
| GET/POST | `organizations/{id}/invitations/` | admin · `{email?, role}` · `?status=pending` |
| DELETE | `organizations/{id}/invitations/{inv_id}/` | admin (revoca) |
| GET | `invitations/{token}/` | **público** — datos para mostrar la invitación |
| POST | `invitations/{token}/` | usuario logueado — aceptar |

El link de invitación es `{FRONTEND_URL}/invitacion/{token}`.

### Tableros, columnas y tareas
| Método | Ruta | Permiso |
|---|---|---|
| GET | `boards/?organization={id}` | tableros visibles (incluye `my_role`) |
| POST | `boards/` | miembro de la org · JSON o multipart (`image`) |
| GET | `boards/{id}/` | lector (incluye `columns`) |
| PATCH/DELETE | `boards/{id}/` | admin |
| GET/POST | `boards/{id}/members/` | lector / admin · `{user_id, role}` |
| PATCH/DELETE | `boards/{id}/members/{member_id}/` | admin |
| GET/POST | `boards/{id}/columns/` | lector / admin (máx. 6) |
| PATCH | `boards/{id}/columns/{col_id}/` | admin · `{name, color, is_done}` |
| DELETE | `boards/{id}/columns/{col_id}/?move_to={col_id}` | admin (`move_to` obligatorio si tiene tareas) |
| POST | `boards/{id}/columns/reorder/` | admin · `{order: [ids]}` |
| GET/POST | `boards/{id}/tasks/` | lector / editor |
| GET | `boards/{id}/activity/` | lector (paginado) |
| GET/PATCH/DELETE | `tasks/{id}/` | lector / editor / editor |
| POST | `tasks/{id}/move/` | editor, o lector asignado · `{column, position?}` |
| GET/POST | `tasks/{id}/comments/` | lector |
| PATCH/DELETE | `comments/{id}/` | autor / autor o admin |
| GET | `my-tasks/` | mis tareas asignadas, en todas mis organizaciones |

**Tarea:** `title`, `description`, `priority` (`low`/`medium`/`high`/`urgent`), `due_date`,
`column`, `assignee_ids` (escritura) / `assignees` (lectura). Para cambiar de columna se usa `move/`.

**Filtros** (`boards/{id}/tasks/` y `my-tasks/`): `assignee=<id>|me|none`, `priority=high,urgent`,
`due=overdue|today|week|none`, `status=open|done|all`, `column=<id>`, `q=texto`.
En `my-tasks/` además `organization=<id>`; por defecto `status=open`.

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

Frontend: `cd taskfront && npm install && npm run dev` (pendiente de migrar a la API v1).

---

## Variables de entorno

Ver [`.env.example`](.env.example). En producción son obligatorias `SECRET_KEY`, `ALLOWED_HOSTS`,
`DATABASE_URL`, `CORS_ALLOWED_ORIGINS` y `FRONTEND_URL`. Sin `SECRET_KEY` la app no arranca.
Si no se configura Cloudinary (`CLOUD_NAME`, `CLOUD_API_KEY`, `CLOUD_API_SECRET`) las imágenes
se guardan en disco.

## Despliegue

- **Backend:** imagen Docker (gunicorn, aplica migraciones al iniciar). Pensado para Render
  con PostgreSQL administrado. Respeta `PORT` y `WEB_CONCURRENCY`.
- **Frontend:** Vercel, con `NEXT_PUBLIC_BACK_URL` apuntando al backend.
