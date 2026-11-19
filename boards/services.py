from django.conf import settings
from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from boards.models import DEFAULT_COLUMNS, Activity, Board, BoardMember, BoardRole, Column, Task


def log(board, actor, verb, task=None, **data):
    Activity.objects.create(board=board, actor=actor, verb=verb, task=task, data=data)


# ── Regla de responsables (D18) ──────────────────────────────────────────────

def describe_impact(impact):
    """Agrega nombres al resultado de access_impact, para la vista previa y la actividad."""
    from accounts.models import User

    names = dict(User.objects.filter(pk__in=[i['user_id'] for i in impact]).values_list('pk', 'full_name'))
    return [
        {'user_id': i['user_id'], 'full_name': names.get(i['user_id'], ''), 'tasks': i['tasks']}
        for i in impact
    ]


@transaction.atomic
def prune_assignees(board, actor):
    """
    Invariante: todo responsable tiene acceso al proyecto. Quita de las tareas del proyecto
    a quienes ya no tienen acceso y lo registra en la actividad. Devuelve el impacto aplicado.
    """
    from boards.access import access_impact

    impact = access_impact(board)
    if not impact:
        return []
    user_ids = [i['user_id'] for i in impact]
    Task.assignees.through.objects.filter(task__board=board, user_id__in=user_ids).delete()
    described = describe_impact(impact)
    log(board, actor, Activity.Verb.ASSIGNEES_REMOVED, users=described)
    return described


def org_access_impact(organization_id, user_id, new_org_role):
    """Proyectos de la organización donde `user_id` dejaría de ser responsable si pasara a `new_org_role`
    (None = sale de la organización)."""
    from boards.access import access_impact

    result = []
    for board in Board.objects.filter(organization_id=organization_id):
        lost = [i for i in access_impact(board, org_role_overrides={user_id: new_org_role})
                if i['user_id'] == user_id]
        if lost:
            result.append({'board_id': board.id, 'title': board.title, 'tasks': lost[0]['tasks']})
    return result


def prune_org_assignees(organization_id, actor):
    for board in Board.objects.filter(organization_id=organization_id):
        prune_assignees(board, actor)


# ── Archivado ────────────────────────────────────────────────────────────────

def archive_board(board, actor):
    if board.archived_at is None:
        board.archived_at = timezone.now()
        board.save(update_fields=['archived_at', 'updated_at'])
        log(board, actor, Activity.Verb.BOARD_ARCHIVED, title=board.title)
    return board


def restore_board(board, actor):
    if board.archived_at is not None:
        board.archived_at = None
        board.save(update_fields=['archived_at', 'updated_at'])
        log(board, actor, Activity.Verb.BOARD_RESTORED, title=board.title)
    return board


@transaction.atomic
def create_board(user, organization, **fields):
    board = Board.objects.create(organization=organization, created_by=user, **fields)
    Column.objects.bulk_create(
        Column(board=board, position=i, **col) for i, col in enumerate(DEFAULT_COLUMNS)
    )
    BoardMember.objects.create(board=board, user=user, role=BoardRole.ADMIN)
    log(board, user, Activity.Verb.BOARD_CREATED, title=board.title)
    return board


# ── Columnas ─────────────────────────────────────────────────────────────────

def _reindex_columns(board):
    for i, col in enumerate(Column.objects.filter(board=board).order_by('position', 'id')):
        if col.position != i:
            Column.objects.filter(pk=col.pk).update(position=i)


@transaction.atomic
def create_column(board, actor, **fields):
    Board.objects.select_for_update().filter(pk=board.pk).first()  # serializa altas concurrentes
    count = Column.objects.filter(board=board).count()
    if count >= settings.BOARD_MAX_COLUMNS:
        raise ValidationError(f'Un tablero puede tener como máximo {settings.BOARD_MAX_COLUMNS} columnas.')
    column = Column.objects.create(board=board, position=count, **fields)
    log(board, actor, Activity.Verb.COLUMN_CREATED, name=column.name)
    return column


@transaction.atomic
def update_column(column, actor, **fields):
    was_done = column.is_done
    for key, value in fields.items():
        setattr(column, key, value)
    column.save()
    if was_done != column.is_done:
        Task.objects.filter(column=column).update(
            completed_at=timezone.now() if column.is_done else None
        )
    log(column.board, actor, Activity.Verb.COLUMN_UPDATED, name=column.name)
    return column


@transaction.atomic
def delete_column(column, actor, move_to=None):
    board = column.board
    if Column.objects.filter(board=board).count() <= 1:
        raise ValidationError('El tablero tiene que tener al menos una columna.')
    has_tasks = Task.objects.filter(column=column).exists()
    if has_tasks:
        if move_to is None:
            raise ValidationError(
                'La columna tiene tareas. Indicá en `move_to` a qué columna moverlas.'
            )
        if move_to.board_id != board.id or move_to.pk == column.pk:
            raise ValidationError({'move_to': 'Columna de destino inválida.'})
        start = next_position(move_to)
        for offset, task in enumerate(Task.objects.filter(column=column).order_by('position', 'id')):
            task.column = move_to
            task.position = start + offset
            task.completed_at = (task.completed_at or timezone.now()) if move_to.is_done else None
            task.save(update_fields=['column', 'position', 'completed_at'])
    name = column.name
    column.delete()
    _reindex_columns(board)
    log(board, actor, Activity.Verb.COLUMN_DELETED, name=name)


@transaction.atomic
def reorder_columns(board, ordered_ids):
    current = set(Column.objects.filter(board=board).values_list('id', flat=True))
    if len(ordered_ids) != len(current) or set(ordered_ids) != current:
        raise ValidationError({'order': 'Tenés que enviar todos los IDs de columnas del tablero, sin repetir.'})
    for i, col_id in enumerate(ordered_ids):
        Column.objects.filter(pk=col_id).update(position=i)


# ── Tareas ───────────────────────────────────────────────────────────────────

def _reindex_tasks(column, exclude_id=None):
    qs = Task.objects.filter(column=column).order_by('position', 'id')
    if exclude_id:
        qs = qs.exclude(pk=exclude_id)
    return list(qs)


def next_position(column):
    current_max = Task.objects.filter(column=column).aggregate(m=Max('position'))['m']
    return 0 if current_max is None else current_max + 1


@transaction.atomic
def move_task(task, column, position, actor):
    """Mueve la tarea a `column` en el índice `position` y renumera ambas columnas."""
    source = task.column
    siblings = _reindex_tasks(column, exclude_id=task.pk)
    position = max(0, min(position, len(siblings)))
    siblings.insert(position, task)

    if source.pk != column.pk:
        task.column = column
        if column.is_done and not source.is_done:
            task.completed_at = timezone.now()
        elif not column.is_done:
            task.completed_at = None

    for i, t in enumerate(siblings):
        if t.pk == task.pk:
            t.position = i
            t.save(update_fields=['column', 'position', 'completed_at', 'updated_at'])
        elif t.position != i:
            Task.objects.filter(pk=t.pk).update(position=i)

    if source.pk != column.pk:
        for i, t in enumerate(_reindex_tasks(source)):
            if t.position != i:
                Task.objects.filter(pk=t.pk).update(position=i)
        log(task.board, actor, Activity.Verb.TASK_MOVED, task=task,
            title=task.title, from_column=source.name, to_column=column.name)
    return task
