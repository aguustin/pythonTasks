"""
Quién recibe cada aviso. Reglas:
- Nunca se avisa a quien hizo la acción.
- Solo a personas con acceso actual al proyecto (si no, el aviso revelaría la tarea).
- Una persona recibe un solo aviso por acción: la mención gana sobre el comentario.
"""
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.utils import timezone

from boards.access import board_role
from notifications.models import Notification

Verb = Notification.Verb


def _excerpt(text, size=140):
    text = ' '.join(text.split())
    return text if len(text) <= size else text[: size - 1] + '…'


def _with_access(board, users):
    return [u for u in users if board_role(u, board) is not None]


def _create(recipients, *, actor, verb, task, data=None):
    board = task.board
    rows = [
        Notification(recipient=u, actor=actor, verb=verb, board=board, task=task,
                     data={'title': task.title, **(data or {})})
        for u in _with_access(board, {u.pk: u for u in recipients if not actor or u.pk != actor.pk}.values())
    ]
    Notification.objects.bulk_create(rows)
    return rows


def watchers(task):
    """Responsables y seguidores de la tarea."""
    return list({u.pk: u for u in [*task.assignees.all(), *task.followers.all()]}.values())


def notify_assigned(task, users, actor):
    """A quienes se suman como responsables."""
    return _create(users, actor=actor, verb=Verb.ASSIGNED, task=task)


def notify_comment(comment, actor, mentioned=()):
    """Menciones primero; el resto de responsables y seguidores recibe "comentó"."""
    task = comment.task
    data = {'excerpt': _excerpt(comment.text), 'comment_id': comment.pk}
    sent = _create(mentioned, actor=actor, verb=Verb.MENTIONED, task=task, data=data)
    already = {n.recipient_id for n in sent}
    others = [u for u in watchers(task) if u.pk not in already]
    return sent + _create(others, actor=actor, verb=Verb.COMMENTED, task=task, data=data)


def notify_mentions(comment, users, actor):
    """Menciones nuevas al editar un comentario."""
    data = {'excerpt': _excerpt(comment.text), 'comment_id': comment.pk}
    return _create(users, actor=actor, verb=Verb.MENTIONED, task=comment.task, data=data)


def notify_completed(task, actor):
    return _create(watchers(task), actor=actor, verb=Verb.COMPLETED, task=task)


def generate_due_tomorrow(user, organization_id=None):
    """
    "Vence mañana" sin tareas programadas: se genera al consultar los avisos, una sola vez por
    tarea y día (dedupe_key). Solo tareas abiertas asignadas, de proyectos no archivados.
    """
    from boards.access import visible_boards
    from boards.models import Task

    tomorrow = timezone.localdate() + timedelta(days=1)
    boards = visible_boards(user).filter(archived_at__isnull=True)
    if organization_id:
        boards = boards.filter(organization_id=organization_id)
    tasks = Task.objects.filter(
        board__in=boards, assignees=user, column__is_done=False, due_date=tomorrow,
    ).select_related('board')
    for task in tasks:
        key = f'due:{task.pk}:{tomorrow.isoformat()}'
        try:
            with transaction.atomic():
                Notification.objects.get_or_create(
                    recipient=user, dedupe_key=key,
                    defaults={'verb': Verb.DUE_TOMORROW, 'board': task.board, 'task': task,
                              'data': {'title': task.title, 'due_date': tomorrow.isoformat()}},
                )
        except IntegrityError:  # dos pedidos a la vez: ya lo creó el otro
            pass
