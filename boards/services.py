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
        if column.is_done and not source.is_done:
            from notifications.services import notify_completed  # evita importación circular
            notify_completed(task, actor)
            spawn_next_occurrence(task, actor)
    return task


# ── Recurrencia ──────────────────────────────────────────────────────────────

def next_due_date(due, today, repeat):
    """
    Próxima fecha de una tarea que se repite: se avanza desde su vencimiento (o desde hoy si no
    tenía) hasta la primera fecha posterior a hoy. Así, si se terminó tarde, no quedan
    repeticiones ya vencidas. Mensual: mismo día del mes, o el último si ese mes es más corto.
    """
    import calendar
    from datetime import timedelta

    from boards.models import Repeat

    def step(d):
        if repeat == Repeat.DAILY:
            return d + timedelta(days=1)
        if repeat == Repeat.WEEKDAYS:
            d += timedelta(days=1)
            while d.weekday() >= 5:  # sábado o domingo
                d += timedelta(days=1)
            return d
        if repeat == Repeat.WEEKLY:
            return d + timedelta(days=7)
        if repeat == Repeat.MONTHLY:
            day = anchor.day
            y, m = (d.year + 1, 1) if d.month == 12 else (d.year, d.month + 1)
            return d.replace(year=y, month=m, day=min(day, calendar.monthrange(y, m)[1]))
        raise ValueError(repeat)

    anchor = due or today
    d = step(anchor)
    while d <= today:
        d = step(d)
    return d


def spawn_next_occurrence(task, actor):
    """Al terminar una tarea que se repite, crea la próxima (una sola vez por tarea)."""
    from boards.models import Repeat

    if task.repeat == Repeat.NONE or task.next_occurrence_id:
        return None
    column = task.board.columns.filter(is_done=False).order_by('position').first()
    if column is None:
        return None
    nxt = Task.objects.create(
        board=task.board, column=column, position=next_position(column), created_by=actor,
        title=task.title, description=task.description, priority=task.priority, repeat=task.repeat,
        due_date=next_due_date(task.due_date, timezone.localdate(), task.repeat),
    )
    nxt.assignees.set(task.assignees.all())
    nxt.followers.set(task.followers.all())
    task.next_occurrence = nxt
    task.save(update_fields=['next_occurrence'])
    log(task.board, actor, Activity.Verb.TASK_CREATED, task=nxt, title=nxt.title, repeated=True)
    return nxt


# ── Duplicar proyecto (plantillas) ───────────────────────────────────────────

@transaction.atomic
def duplicate_board(source, user, *, title, include_tasks=False, include_members=False, keep_dates=False):
    """
    Copia un proyecto como punto de partida (sirve de plantilla, aunque esté archivado).
    - Siempre: descripción, color, acceso, columnas. Quien duplica queda como líder.
    - include_members: solo si quien duplica es líder del original (si no, se ignora).
    - include_tasks: solo las abiertas, sin comentarios ni historial; responsables que no
      tengan acceso al proyecto nuevo se omiten (D18). Fechas solo con keep_dates.
    """
    from boards.access import board_role

    board = Board.objects.create(
        organization=source.organization, created_by=user, title=title, description=source.description,
        color=source.color, visibility=source.visibility, organization_role=source.organization_role,
    )
    columns = {}
    for col in source.columns.order_by('position'):
        columns[col.pk] = Column.objects.create(
            board=board, name=col.name, color=col.color, is_done=col.is_done, position=col.position,
        )
    BoardMember.objects.create(board=board, user=user, role=BoardRole.ADMIN)
    if include_members and board_role(user, source) == BoardRole.ADMIN:
        for m in source.members.exclude(user=user):
            BoardMember.objects.create(board=board, user=m.user, role=m.role)
    if include_tasks:
        for t in source.tasks.filter(column__is_done=False).order_by('column__position', 'position', 'id'):
            copy = Task.objects.create(
                board=board, column=columns[t.column_id], position=t.position, created_by=user,
                title=t.title, description=t.description, priority=t.priority, repeat=t.repeat,
                due_date=t.due_date if keep_dates else None,
            )
            copy.assignees.set([u for u in t.assignees.all() if board_role(u, board) is not None])
    log(board, user, Activity.Verb.BOARD_CREATED, title=board.title, duplicated_from=source.title)
    return board
