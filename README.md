# TaskManager

A full-stack task management application with Kanban-style boards, real-time drag-and-drop, JWT authentication, and collaborative list sharing.

---

## Tech Stack

**Backend**
- Python 3.12 · Django 5.0 · Django REST Framework
- JWT authentication via `djangorestframework-simplejwt` with custom middleware and token auto-refresh
- bcrypt for password hashing
- PostgreSQL (production via Render) · SQLite (local dev)
- Cloudinary for image storage
- Gunicorn + Docker for deployment

**Frontend**
- Next.js 14 (App Router) · React 18
- Tailwind CSS for styling
- `@dnd-kit/core` for drag-and-drop
- Axios with dual request/response interceptors (auth + token refresh)
- React Context API for global state management

---

## Features

### Authentication & Security
- JWT-based login with 1-hour access tokens and 7-day rotating refresh tokens
- Custom Django middleware validates every protected endpoint at the request level
- Passwords hashed with bcrypt (never stored in plain text)
- Next.js Edge middleware protects frontend routes via a session cookie — no localStorage access at the edge
- Token refresh is transparent: a 401 queues pending requests, refreshes silently, then retries them

### Task Management
- **Kanban board** with three columns: *In Progress*, *Completed*, *Won't do*
- Drag and drop tasks between columns — state persists to the backend instantly
- Create, edit, and delete tasks with title, description, icon, status, and due date
- **Due date badges** with color-coded urgency: overdue (red), due today (yellow), due within 3 days (orange)
- Optimistic UI updates — the interface reflects changes before the server confirms them

### Collaboration
- Share lists with other users by email at creation time or later
- Shared lists appear in a separate "Shared with me" view
- **Comment threads** on individual tasks: post, view, and delete your own comments

### UX & Quality of Life
- Skeleton loaders on the table grid and Kanban board while data fetches
- Global toast notification system — every action (create, update, delete, error) gives feedback
- Confirm-to-delete modal for tasks and lists — no accidental deletions
- Escape key closes the task detail panel
- Hover-reveal delete button on table cards in the grid

---

## Architecture Overview

```
┌─────────────────────────────────┐     ┌──────────────────────────────────┐
│         Next.js Frontend        │     │          Django Backend           │
│                                 │     │                                   │
│  Edge Middleware (route guard)  │     │  JWT Middleware (all endpoints)   │
│  React Context (global state)   │◄───►│  Django REST Framework views      │
│  Axios interceptors (auth/retry)│     │  Custom User model + bcrypt       │
│  @dnd-kit (drag and drop)       │     │  PostgreSQL / SQLite              │
│  Tailwind CSS                   │     │  Cloudinary (image uploads)       │
└─────────────────────────────────┘     └──────────────────────────────────┘
```

### Key design decisions

| Decision | Rationale |
|---|---|
| JWT middleware instead of DRF authentication classes | The project uses a custom User model that doesn't extend `AbstractUser`, making DRF's built-in auth incompatible. Middleware-level validation keeps it framework-agnostic. |
| Session cookie for Next.js Edge middleware | `localStorage` is unavailable in the Edge Runtime. A non-httpOnly cookie set on login allows the middleware to read auth state without exposing the token. |
| Optimistic updates in React Context | Avoids full re-fetches on every mutation — state is updated locally immediately and rolled back only on error. |
| Activation constraint on drag sensor (8px) | Prevents drag from triggering on regular clicks, allowing card buttons (delete, detail) to work normally inside draggable elements. |

---

## Project Structure

```
pythonTasks/
├── management/          # Tasks, tables, comments — models, views, serializers
├── user/                # Custom user model, registration, login
├── tasksManager/        # Django settings, URLs, JWT middleware
├── taskfront/           # Next.js application
│   ├── api/             # Axios instance + all API request functions
│   └── src/app/
│       ├── context/     # UserContext, TasksContext, ToastContext
│       ├── Home/        # Login / register page
│       ├── NavBar/
│       └── Tasktables/
│           ├── page.jsx          # Table grid with skeleton + delete
│           ├── AddNewTable/      # Create list form
│           └── [tableId]/        # Kanban board
├── Dockerfile
└── Docker-compose.yml
```

---

## REST API — Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/get_credentials/` | Login — returns `{ user, tables, tokens }` |
| `POST` | `/create_user/` | Register new user |
| `POST` | `/token/refresh/` | Refresh access token |
| `GET`  | `/get_user_tables/:id/` | Fetch authenticated user's lists |
| `POST` | `/create_tasks_tables/` | Create a new list (with optional image + shared users) |
| `POST` | `/update_tasks_table/` | Rename a list |
| `DELETE` | `/delete_tasks_table/:id/` | Delete a list and all its tasks |
| `GET`  | `/get_one_table/:id/` | Fetch tasks for a specific list |
| `POST` | `/create_task/` | Create task (title, description, icon, state, due date) |
| `POST` | `/update_tasks/` | Update task fields |
| `DELETE` | `/delete_tasks/:id/` | Delete a task |
| `GET`  | `/get_comments/:taskId/` | Fetch comments for a task |
| `POST` | `/create_comment/` | Post a comment (user resolved from JWT) |
| `DELETE` | `/delete_comment/:id/` | Delete own comment (403 if not owner) |
| `POST` | `/share_table/` | Share a list with another user by email |
| `GET`  | `/get_shared_tables/:userId/` | Fetch lists shared with the user |

---

## Running Locally

### Backend

```bash
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate       # Windows
source venv/bin/activate    # macOS / Linux

pip install -r requirements.txt
pip install djangorestframework-simplejwt

# Apply migrations
python manage.py makemigrations
python manage.py migrate

python manage.py runserver
```

> Set `DEBUG=True` and comment out `DATABASE_URL` in `tasksManager/.env` to use SQLite locally.

### Frontend

```bash
cd taskfront
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Docker (full stack)

```bash
docker-compose up --build
```

---

## Deployment

- **Backend**: Dockerized, deployed on [Render](https://render.com) with a managed PostgreSQL database
- **Frontend**: Deployable on [Vercel](https://vercel.com) — set `NEXT_PUBLIC_BACK_URL` to the backend URL
- Images are stored on **Cloudinary** (configured via environment variables)

---

## Environment Variables

**Backend** (`tasksManager/.env`)

```env
SECRET_KEY=...
DEBUG=False
ALLOWED_HOSTS=yourdomain.com
DATABASE_URL=postgresql://...
CORS_ALLOWED_ORIGINS=https://yourfrontend.com
CLOUDINARY_URL=cloudinary://...
```

**Frontend** (`taskfront/.env.local`)

```env
NEXT_PUBLIC_BACK_URL=https://your-backend.onrender.com
```
