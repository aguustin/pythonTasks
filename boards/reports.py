"""
Reportes básicos de la organización (Etapa 2): completadas por semana y por persona.

Alcance: solo los proyectos que la persona ve (visible_boards), incluidos los archivados,
porque la historia sigue contando. Una tarea cuenta como completada en la semana de su
`completed_at`; si se reabrió, deja de contar (el reporte refleja el estado actual).
"""
from collections import Counter
from datetime import datetime, time, timedelta

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from boards.access import visible_boards
from boards.models import Task
from workspaces.access import require_membership

WEEK_OPTIONS = (4, 8, 12, 26)
EXPORT_LIMIT = 5000


def _params(request, org_pk):
    try:
        weeks = int(request.query_params.get('weeks', 8))
    except ValueError:
        weeks = 0
    if weeks not in WEEK_OPTIONS:
        raise ValidationError({'weeks': f'Elegí uno de: {", ".join(map(str, WEEK_OPTIONS))}.'})
    boards = visible_boards(request.user).filter(organization_id=org_pk)
    board = request.query_params.get('board')
    if board:
        if not board.isdigit() or not boards.filter(pk=int(board)).exists():
            raise ValidationError({'board': 'Proyecto inválido.'})
        boards = boards.filter(pk=int(board))
    today = timezone.localdate()
    start = today - timedelta(days=today.weekday()) - timedelta(weeks=weeks - 1)  # lunes
    return boards, today, start, weeks


def _local_start(day):
    """Medianoche local del día (para comparar con DateTimeFields)."""
    return timezone.make_aware(datetime.combine(day, time.min))


class ReportView(APIView):
    """
    GET /organizations/<org_pk>/reports/?weeks=8&board=<id>

    - `weeks`: por semana (lunes a domingo), completadas y creadas.
    - `people`: por responsable, completadas en el período, abiertas y vencidas hoy.
    - `totals`: completadas y creadas en el período; abiertas y vencidas hoy.
    - `boards`: proyectos que entran en el reporte (para el filtro).
    """

    def get(self, request, org_pk):
        require_membership(request.user, org_pk)
        boards, today, start, weeks = _params(request, org_pk)
        all_boards = visible_boards(request.user).filter(organization_id=org_pk).order_by('title')
        since = _local_start(start)
        tasks = Task.objects.filter(board__in=boards)

        week_starts = [start + timedelta(weeks=i) for i in range(weeks)]
        done_by_week, created_by_week = Counter(), Counter()
        for stamp in tasks.filter(completed_at__gte=since, column__is_done=True).values_list('completed_at', flat=True):
            d = timezone.localdate(stamp)
            done_by_week[d - timedelta(days=d.weekday())] += 1
        for stamp in tasks.filter(created_at__gte=since).values_list('created_at', flat=True):
            d = timezone.localdate(stamp)
            created_by_week[d - timedelta(days=d.weekday())] += 1

        open_tasks = tasks.filter(column__is_done=False)
        rows = (
            Task.assignees.through.objects.filter(task__board__in=boards)
            .values('user_id', 'user__full_name', 'user__email')
            .annotate(
                completed=Count('task', filter=Q(task__column__is_done=True, task__completed_at__gte=since), distinct=True),
                open=Count('task', filter=Q(task__column__is_done=False), distinct=True),
                overdue=Count('task', filter=Q(task__column__is_done=False, task__due_date__lt=today), distinct=True),
            )
        )
        people = sorted(
            ({'id': r['user_id'], 'full_name': r['user__full_name'] or r['user__email'],
              'completed': r['completed'], 'open': r['open'], 'overdue': r['overdue']}
             for r in rows if r['completed'] or r['open']),
            key=lambda p: (-p['completed'], -p['open'], p['full_name'].lower()),
        )
        unassigned = tasks.filter(assignees__isnull=True).aggregate(
            completed=Count('id', filter=Q(column__is_done=True, completed_at__gte=since)),
            open=Count('id', filter=Q(column__is_done=False)),
            overdue=Count('id', filter=Q(column__is_done=False, due_date__lt=today)),
        )

        return Response({
            'from': start.isoformat(),
            'to': today.isoformat(),
            'weeks': [{'start': w.isoformat(), 'completed': done_by_week[w], 'created': created_by_week[w]}
                      for w in week_starts],
            'people': people,
            'unassigned': unassigned,
            'totals': {
                'completed': sum(done_by_week.values()),
                'created': sum(created_by_week.values()),
                'open': open_tasks.count(),
                'overdue': open_tasks.filter(due_date__lt=today).count(),
            },
            'boards': [{'id': b.pk, 'title': b.title, 'archived': b.archived_at is not None} for b in all_boards],
        })


class ReportCompletedView(APIView):
    """GET /organizations/<org_pk>/reports/completed/?weeks=&board= — detalle para exportar (CSV)."""

    def get(self, request, org_pk):
        require_membership(request.user, org_pk)
        boards, _today, start, _weeks = _params(request, org_pk)
        tasks = (
            Task.objects.filter(board__in=boards, column__is_done=True, completed_at__gte=_local_start(start))
            .select_related('board').prefetch_related('assignees')
            .order_by('-completed_at', 'id')[:EXPORT_LIMIT]
        )
        return Response([{
            'id': t.pk,
            'title': t.title,
            'project': t.board.title,
            'priority': t.priority,
            'assignees': [u.full_name or u.email for u in t.assignees.all()],
            'created_at': t.created_at.isoformat(),
            'completed_at': t.completed_at.isoformat(),
            'due_date': t.due_date.isoformat() if t.due_date else None,
        } for t in tasks])
