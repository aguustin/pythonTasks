"""
Permisos por tablero.

Permiso efectivo de un usuario en un tablero:
  1. Si no es miembro de la organización del tablero → sin acceso.
  2. Propietario o admin de la organización → admin del tablero.
  3. Permiso explícito en el tablero (BoardMember) → ese permiso.
  4. Tablero visible para toda la organización → `board.organization_role`.
  5. Si no → sin acceso.

Capacidades:
  - lector  (viewer): ver tablero y tareas, comentar, mover las tareas que tiene asignadas.
  - editor  (editor): además crear, editar, mover y borrar tareas.
  - admin   (admin):  además editar/borrar el tablero, gestionar columnas y miembros.
"""
from django.db.models import Q
from rest_framework.exceptions import NotFound, PermissionDenied

from boards.models import ROLE_RANK, Board, BoardMember, BoardRole
from workspaces.models import ORG_MANAGER_ROLES, Membership


def visible_boards(user):
    my_memberships = Membership.objects.filter(user=user)
    org_ids = my_memberships.values('organization_id')
    managed_org_ids = my_memberships.filter(role__in=ORG_MANAGER_ROLES).values('organization_id')
    explicit_board_ids = BoardMember.objects.filter(user=user).values('board_id')
    return Board.objects.filter(organization_id__in=org_ids).filter(
        Q(organization_id__in=managed_org_ids)
        | Q(visibility=Board.Visibility.ORGANIZATION)
        | Q(id__in=explicit_board_ids)
    )


def _resolve(org_role, explicit_role, board, visibility=None):
    if org_role is None:
        return None
    if org_role in ORG_MANAGER_ROLES:
        return BoardRole.ADMIN
    if explicit_role:
        return explicit_role
    if (visibility or board.visibility) == Board.Visibility.ORGANIZATION:
        return board.organization_role
    return None


def board_role(user, board):
    org_role = (
        Membership.objects.filter(user=user, organization_id=board.organization_id)
        .values_list('role', flat=True).first()
    )
    if org_role is None:
        return None
    explicit = BoardMember.objects.filter(board=board, user=user).values_list('role', flat=True).first()
    return _resolve(org_role, explicit, board)


class RoleCache:
    """Resuelve el permiso de muchos tableros con 2 consultas (para listados)."""

    def __init__(self, user):
        self.org_roles = dict(Membership.objects.filter(user=user).values_list('organization_id', 'role'))
        self.board_roles = dict(BoardMember.objects.filter(user=user).values_list('board_id', 'role'))

    def role(self, board):
        return _resolve(self.org_roles.get(board.organization_id), self.board_roles.get(board.pk), board)


def has_role(role, minimum):
    return role is not None and ROLE_RANK[role] >= ROLE_RANK[minimum]


MESSAGES = {
    BoardRole.EDITOR: 'Necesitás permiso de editor en este tablero.',
    BoardRole.ADMIN: 'Necesitás permiso de administrador en este tablero.',
}


def require_board_role(user, board, minimum=BoardRole.VIEWER):
    """Devuelve el permiso efectivo. 404 si no tiene acceso, 403 si no le alcanza."""
    role = board_role(user, board)
    if role is None:
        raise NotFound('Tablero no encontrado.')
    if not has_role(role, minimum):
        raise PermissionDenied(MESSAGES.get(minimum, 'No tenés permiso para esto.'))
    return role


def people_with_access(board):
    """
    Personas con acceso efectivo al proyecto y su permiso (para elegir responsables).
    Devuelve [(user, role)] ordenado por nombre. Dos consultas, sin importar la cantidad.
    """
    from accounts.models import User

    org_roles = dict(
        Membership.objects.filter(organization_id=board.organization_id).values_list('user_id', 'role')
    )
    explicit = dict(BoardMember.objects.filter(board=board).values_list('user_id', 'role'))
    users = User.objects.filter(pk__in=org_roles.keys(), is_active=True).order_by('full_name', 'id')
    result = []
    for user in users:
        role = _resolve(org_roles.get(user.pk), explicit.get(user.pk), board)
        if role is not None:
            result.append((user, role))
    return result


ARCHIVED = 'El proyecto está archivado. Restauralo para hacer cambios.'


def require_writable(board):
    """Un proyecto archivado es de solo lectura (lo aplica la API, no solo la interfaz)."""
    if board.archived_at is not None:
        raise PermissionDenied(ARCHIVED)


def access_impact(board, *, visibility=None, remove_user_ids=(), org_role_overrides=None):
    """
    Responsables de tareas del proyecto que quedarían SIN acceso si se aplicara el cambio
    simulado (D18). Sin parámetros, evalúa el estado actual.
    Devuelve [{'user_id': id, 'tasks': n}, ...].
    """
    from django.db.models import Count  # import local: módulo liviano
    from boards.models import Task

    org_roles = dict(
        Membership.objects.filter(organization_id=board.organization_id).values_list('user_id', 'role')
    )
    explicit = dict(BoardMember.objects.filter(board=board).values_list('user_id', 'role'))
    for user_id in remove_user_ids:
        explicit.pop(user_id, None)
    org_roles.update(org_role_overrides or {})

    assignments = (
        Task.assignees.through.objects.filter(task__board=board)
        .values('user_id')
        .annotate(tasks=Count('task_id'))
    )
    return [
        {'user_id': row['user_id'], 'tasks': row['tasks']}
        for row in assignments
        if _resolve(org_roles.get(row['user_id']), explicit.get(row['user_id']), board, visibility) is None
    ]


def get_board_or_404(user, board_id, minimum=BoardRole.VIEWER):
    board = Board.objects.filter(pk=board_id).first()
    if board is None:
        raise NotFound('Tablero no encontrado.')
    role = require_board_role(user, board, minimum)
    return board, role
