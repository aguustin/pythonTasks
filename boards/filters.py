"""Filtros por query params para listados de tareas."""
from datetime import timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from boards.models import Priority


def _int(value, name):
    try:
        return int(value)
    except (TypeError, ValueError):
        raise ValidationError({name: 'Debe ser un número.'})


def filter_tasks(qs, params, user):
    """
    ?assignee=<id>|me|none   ?priority=low,high   ?due=overdue|today|week|none
    ?column=<id>             ?status=open|done|all    ?q=texto
    """
    assignee = params.get('assignee')
    if assignee == 'me':
        qs = qs.filter(assignees=user)
    elif assignee == 'none':
        qs = qs.filter(assignees__isnull=True)
    elif assignee:
        qs = qs.filter(assignees__id=_int(assignee, 'assignee'))

    priority = params.get('priority')
    if priority:
        values = [p for p in priority.split(',') if p in Priority.values]
        qs = qs.filter(priority__in=values)

    due = params.get('due')
    today = timezone.localdate()
    if due == 'overdue':
        qs = qs.filter(due_date__lt=today, column__is_done=False)
    elif due == 'today':
        qs = qs.filter(due_date=today)
    elif due == 'week':
        qs = qs.filter(due_date__gte=today, due_date__lte=today + timedelta(days=7))
    elif due == 'none':
        qs = qs.filter(due_date__isnull=True)

    column = params.get('column')
    if column:
        qs = qs.filter(column_id=_int(column, 'column'))

    status = params.get('status')
    if status == 'open':
        qs = qs.filter(column__is_done=False)
    elif status == 'done':
        qs = qs.filter(column__is_done=True)

    q = params.get('q', '').strip()
    if q:
        qs = qs.filter(Q(title__icontains=q) | Q(description__icontains=q))

    return qs.distinct()
