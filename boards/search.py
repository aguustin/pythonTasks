"""Búsqueda global (Ctrl/⌘ K): proyectos y tareas que la persona puede ver en una organización."""
from django.db.models import Case, IntegerField, Q, Value, When
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from boards.access import visible_boards
from boards.models import Task
from workspaces.access import require_membership

MAX_PROJECTS = 5
MAX_TASKS = 12


class SearchView(APIView):
    """
    GET /search/?organization=<id>&q=texto  (mínimo 2 caracteres)
    Solo proyectos visibles y no archivados. Tareas abiertas primero, luego por actualización.
    """

    def get(self, request):
        org = request.query_params.get('organization', '')
        if not org.isdigit():
            raise ValidationError({'organization': 'Indicá la organización.'})
        require_membership(request.user, int(org))
        q = ' '.join(request.query_params.get('q', '').split())[:100]
        if len(q) < 2:
            return Response({'projects': [], 'tasks': []})

        boards = visible_boards(request.user).filter(organization_id=org, archived_at__isnull=True)
        projects = (
            boards.filter(Q(title__icontains=q) | Q(description__icontains=q))
            .annotate(rank=Case(When(title__istartswith=q, then=Value(0)), When(title__icontains=q, then=Value(1)),
                                default=Value(2), output_field=IntegerField()))
            .order_by('rank', 'title')[:MAX_PROJECTS]
        )
        tasks = (
            Task.objects.filter(board__in=boards)
            .filter(Q(title__icontains=q) | Q(description__icontains=q))
            .select_related('board', 'column')
            .annotate(rank=Case(When(title__icontains=q, then=Value(0)), default=Value(1), output_field=IntegerField()))
            .order_by('column__is_done', 'rank', '-updated_at')[:MAX_TASKS]
        )
        return Response({
            'projects': [{'id': b.pk, 'title': b.title, 'color': b.color} for b in projects],
            'tasks': [
                {'id': t.pk, 'title': t.title, 'board': t.board_id, 'board_title': t.board.title,
                 'board_color': t.board.color, 'column_name': t.column.name, 'is_done': t.column.is_done,
                 'due_date': t.due_date}
                for t in tasks
            ],
        })
