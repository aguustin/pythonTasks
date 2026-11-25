from datetime import timedelta

from django.db.models import Case, Count, Exists, F, IntegerField, OuterRef, Prefetch, Q, Value, When
from django.utils import timezone
from rest_framework import generics, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import SAFE_METHODS
from rest_framework.response import Response
from rest_framework.views import APIView

from boards import services
from boards.access import (
    RoleCache,
    access_impact,
    get_board_or_404,
    people_with_access,
    has_role,
    require_board_role,
    require_writable,
    visible_boards,
)
from boards.filters import filter_tasks
from notifications import services as notify
from boards.models import (
    Activity, Board, BoardMember, BoardRole, BoardTeam, ChecklistItem, Column, Comment, Label, Priority, ProjectFavorite, Task,
)
from boards.serializers import (
    AccessPreviewSerializer,
    ActivitySerializer,
    BoardDetailSerializer,
    BoardMemberSerializer,
    BoardSerializer,
    BoardTeamSerializer,
    ChecklistItemSerializer,
    ColumnSerializer,
    CommentSerializer,
    LabelSerializer,
    TaskMoveSerializer,
    TaskSerializer,
    TaskSummarySerializer,
)
from workspaces.access import require_can_create_projects, require_membership

# De más urgente a menos urgente (para ordenar "Mis tareas" e Inicio).
PRIORITY_ORDER = [Priority.URGENT, Priority.HIGH, Priority.MEDIUM, Priority.LOW]
PRIORITY_RANK = Case(
    *[When(priority=p, then=Value(i)) for i, p in enumerate(PRIORITY_ORDER)],
    default=Value(len(PRIORITY_ORDER)),
    output_field=IntegerField(),
)


def with_progress(boards, today=None):
    """Anota avance: total de tareas, terminadas y vencidas (sin terminar y con fecha pasada)."""
    today = today or timezone.localdate()
    return boards.annotate(
        tasks_total=Count('tasks', distinct=True),
        tasks_done=Count('tasks', filter=Q(tasks__column__is_done=True), distinct=True),
        tasks_overdue=Count(
            'tasks', filter=Q(tasks__due_date__lt=today, tasks__column__is_done=False), distinct=True
        ),
    )


def tasks_queryset():
    return (
        Task.objects.select_related('column', 'board', 'created_by')
        .prefetch_related('assignees')
        .prefetch_related('labels')
        .annotate(
            comments_count=Count('comments', distinct=True),
            checklist_total=Count('checklist', distinct=True),
            checklist_done=Count('checklist', filter=Q(checklist__done=True), distinct=True),
        )
    )


# ── Tableros ────────────────────────────────────────────────────────────────

class BoardViewSet(viewsets.ModelViewSet):
    """
    GET  /boards/?organization=<id>[&archived=true]   proyectos visibles (sin archivados por defecto)
    POST /boards/                     crear (cualquier miembro de la organización)
    GET/PATCH/DELETE /boards/<id>/    ver (lector) / editar y borrar (líder = admin)
    GET  /boards/<id>/people/                         personas con acceso y su permiso (lector)
    POST /boards/<id>/duplicate/                      copiar como punto de partida (plantilla)
    POST /boards/<id>/archive/ · /restore/            archivar / restaurar (líder)
    POST|DELETE /boards/<id>/favorite/                marcar / desmarcar favorito (lector)
    POST /boards/<id>/access-preview/                 a quién dejaría sin acceso un cambio (líder)
    """

    parser_classes = [JSONParser, MultiPartParser, FormParser]
    pagination_class = None
    http_method_names = ['get', 'post', 'patch', 'delete']

    def get_serializer_class(self):
        return BoardDetailSerializer if self.action == 'retrieve' else BoardSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        if self.action == 'list':
            ctx['role_cache'] = RoleCache(self.request.user)
        return ctx

    def get_queryset(self):
        user = self.request.user
        qs = with_progress(visible_boards(user)).select_related('organization', 'created_by').annotate(
            is_favorite=Exists(ProjectFavorite.objects.filter(board=OuterRef('pk'), user=user))
        ).prefetch_related(Prefetch(
            'members',
            queryset=BoardMember.objects.filter(role=BoardRole.ADMIN).select_related('user'),
            to_attr='lead_members',
        ))
        org = self.request.query_params.get('organization')
        if org:
            qs = qs.filter(organization_id=org)
        if self.action == 'list':
            archived = self.request.query_params.get('archived') == 'true'
            qs = qs.filter(archived_at__isnull=not archived)
        if self.action == 'retrieve':
            qs = qs.prefetch_related('columns')
        return qs

    def _fresh(self, board):
        return self.get_queryset().get(pk=board.pk)

    def perform_create(self, serializer):
        org = serializer.validated_data.pop('organization')
        require_can_create_projects(self.request.user, org.pk)  # D4
        board = services.create_board(self.request.user, org, **serializer.validated_data)
        serializer.instance = self._fresh(board)

    def perform_update(self, serializer):
        board = serializer.instance
        require_board_role(self.request.user, board, BoardRole.ADMIN)
        require_writable(board)
        old_visibility = board.visibility
        board = serializer.save()
        services.log(board, self.request.user, Activity.Verb.BOARD_UPDATED,
                     fields=sorted(serializer.validated_data.keys()))
        if board.visibility != old_visibility:
            services.prune_assignees(board, self.request.user)  # D18
        serializer.instance = self._fresh(board)

    def perform_destroy(self, instance):
        require_board_role(self.request.user, instance, BoardRole.ADMIN)
        instance.delete()

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        board = self.get_object()
        require_board_role(request.user, board, BoardRole.ADMIN)
        services.archive_board(board, request.user)
        return Response(BoardSerializer(self._fresh(board), context=self.get_serializer_context()).data)

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        board = self.get_object()
        require_board_role(request.user, board, BoardRole.ADMIN)
        services.restore_board(board, request.user)
        return Response(BoardSerializer(self._fresh(board), context=self.get_serializer_context()).data)

    @action(detail=True, methods=['post', 'delete'])
    def favorite(self, request, pk=None):
        board = self.get_object()
        if request.method == 'POST':
            ProjectFavorite.objects.get_or_create(user=request.user, board=board)
        else:
            ProjectFavorite.objects.filter(user=request.user, board=board).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """
        POST /boards/<id>/duplicate/ {title, include_tasks?, include_members?, keep_dates?}
        Cualquiera que vea el proyecto y pueda crear proyectos en la organización (D4).
        """
        source = self.get_object()
        require_can_create_projects(request.user, source.organization_id)
        title = str(request.data.get('title', '')).strip()
        if not title:
            raise ValidationError({'title': 'Poné un nombre para el proyecto.'})
        flag = lambda key: request.data.get(key) in (True, 'true', '1', 1)  # noqa: E731
        board = services.duplicate_board(
            source, request.user, title=title[:100], include_tasks=flag('include_tasks'),
            include_members=flag('include_members'), keep_dates=flag('keep_dates'),
        )
        return Response({'id': board.pk}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def people(self, request, pk=None):
        """Personas con acceso al proyecto y su permiso efectivo (lector o más)."""
        board = self.get_object()
        return Response([
            {'id': u.pk, 'email': u.email, 'full_name': u.full_name, 'role': role}
            for u, role in people_with_access(board)
        ])

    @action(detail=True, methods=['post'], url_path='access-preview')
    def access_preview(self, request, pk=None):
        """No cambia nada: informa qué responsables perderían el acceso (para avisar antes)."""
        board = self.get_object()
        require_board_role(request.user, board, BoardRole.ADMIN)
        serializer = AccessPreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        affected = services.describe_impact(access_impact(
            board,
            visibility=serializer.validated_data.get('visibility'),
            remove_user_ids=serializer.validated_data['remove_user_ids'],
        ))
        return Response({'affected': affected, 'tasks': sum(a['tasks'] for a in affected)})


class BoardScopedMixin:
    """Carga `self.board` y `self.role` desde la URL (/boards/<board_pk>/...)."""

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        self.board, self.role = get_board_or_404(request.user, kwargs['board_pk'])
        if request.method not in SAFE_METHODS:
            require_writable(self.board)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['board'] = getattr(self, 'board', None)
        return ctx

    def require(self, minimum):
        if not has_role(self.role, minimum):
            require_board_role(self.request.user, self.board, minimum)  # lanza 403 con mensaje


# ── Miembros del tablero ─────────────────────────────────────────────────────

class BoardMemberViewSet(BoardScopedMixin, viewsets.ModelViewSet):
    serializer_class = BoardMemberSerializer
    pagination_class = None
    http_method_names = ['get', 'post', 'patch', 'delete']

    def get_queryset(self):
        return BoardMember.objects.filter(board=self.board).select_related('user')

    def perform_create(self, serializer):
        self.require(BoardRole.ADMIN)
        member = serializer.save(board=self.board)
        services.log(self.board, self.request.user, Activity.Verb.MEMBER_ADDED,
                     user=member.user.full_name, role=member.role)

    def perform_update(self, serializer):
        self.require(BoardRole.ADMIN)
        member = serializer.save()
        services.log(self.board, self.request.user, Activity.Verb.MEMBER_UPDATED,
                     user=member.user.full_name, role=member.role)

    def perform_destroy(self, instance):
        self.require(BoardRole.ADMIN)
        name = instance.user.full_name
        instance.delete()
        services.log(self.board, self.request.user, Activity.Verb.MEMBER_REMOVED, user=name)
        services.prune_assignees(self.board, self.request.user)  # D18


class BoardActivityView(BoardScopedMixin, generics.ListAPIView):
    """GET /boards/<board_pk>/activity/ — historial paginado, más reciente primero."""

    serializer_class = ActivitySerializer

    def get_queryset(self):
        qs = Activity.objects.filter(board=self.board).select_related('actor', 'board')
        task = self.request.query_params.get('task')
        if task:
            if not task.isdigit():
                raise ValidationError({'task': 'Debe ser un número.'})
            qs = qs.filter(task_id=task)
        return qs


# ── Columnas ────────────────────────────────────────────────────────────────

class ColumnViewSet(BoardScopedMixin, viewsets.ModelViewSet):
    """Máximo 6 columnas por tablero. Solo admins del tablero las gestionan."""

    serializer_class = ColumnSerializer
    pagination_class = None
    http_method_names = ['get', 'post', 'patch', 'delete']

    def get_queryset(self):
        return Column.objects.filter(board=self.board)

    def perform_create(self, serializer):
        self.require(BoardRole.ADMIN)
        serializer.instance = services.create_column(self.board, self.request.user, **serializer.validated_data)

    def perform_update(self, serializer):
        self.require(BoardRole.ADMIN)
        services.update_column(serializer.instance, self.request.user, **serializer.validated_data)

    def destroy(self, request, *args, **kwargs):
        self.require(BoardRole.ADMIN)
        column = self.get_object()
        move_to = None
        move_to_id = request.query_params.get('move_to') or request.data.get('move_to')
        if move_to_id:
            move_to = Column.objects.filter(pk=move_to_id, board=self.board).first()
            if move_to is None:
                raise ValidationError({'move_to': 'Columna de destino inválida.'})
        services.delete_column(column, request.user, move_to=move_to)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'])
    def reorder(self, request, board_pk=None):
        self.require(BoardRole.ADMIN)
        order = request.data.get('order')
        if not isinstance(order, list) or not all(isinstance(i, int) for i in order):
            raise ValidationError({'order': 'Enviá una lista de IDs de columnas.'})
        services.reorder_columns(self.board, order)
        return Response(ColumnSerializer(self.get_queryset(), many=True).data)


# ── Equipos con acceso al proyecto ─────────────────────────────────────────

class BoardTeamViewSet(BoardScopedMixin, viewsets.ModelViewSet):
    """
    GET (lector) / POST {team_id, role} (líder) /boards/<id>/teams/
    PATCH {role} / DELETE (líder) /boards/<id>/teams/<access_id>/
    Quitar a un equipo saca el acceso de quienes solo lo tenían por él (y sus asignaciones, D18).
    """

    pagination_class = None
    http_method_names = ['get', 'post', 'patch', 'delete']

    def get_serializer_class(self):
        return BoardTeamSerializer

    def get_queryset(self):
        return BoardTeam.objects.filter(board=self.board).select_related('team').prefetch_related('team__members__user')

    def perform_create(self, serializer):
        self.require(BoardRole.ADMIN)
        access = serializer.save(board=self.board)
        services.log(self.board, self.request.user, Activity.Verb.MEMBER_ADDED,
                     user=f'el equipo {access.team.name}', role=access.role)

    def perform_update(self, serializer):
        self.require(BoardRole.ADMIN)
        access = serializer.save()
        services.log(self.board, self.request.user, Activity.Verb.MEMBER_UPDATED,
                     user=f'el equipo {access.team.name}', role=access.role)
        services.prune_assignees(self.board, self.request.user)  # bajar de rol no quita acceso, pero por las dudas

    def perform_destroy(self, instance):
        self.require(BoardRole.ADMIN)
        name = instance.team.name
        instance.delete()
        services.log(self.board, self.request.user, Activity.Verb.MEMBER_REMOVED, user=f'el equipo {name}')
        services.prune_assignees(self.board, self.request.user)  # D18


# ── Etiquetas ───────────────────────────────────────────────────────────────

class LabelViewSet(BoardScopedMixin, viewsets.ModelViewSet):
    """Etiquetas del proyecto: ver (lector), crear (editor), renombrar o borrar (líder)."""

    serializer_class = LabelSerializer
    pagination_class = None
    http_method_names = ['get', 'post', 'patch', 'delete']

    def get_queryset(self):
        return Label.objects.filter(board=self.board)

    def perform_create(self, serializer):
        self.require(BoardRole.EDITOR)
        serializer.save(board=self.board)

    def perform_update(self, serializer):
        self.require(BoardRole.ADMIN)
        serializer.save()

    def perform_destroy(self, instance):
        self.require(BoardRole.ADMIN)
        instance.delete()


# ── Tareas ──────────────────────────────────────────────────────────────────

class BoardTaskListView(BoardScopedMixin, generics.ListCreateAPIView):
    """GET/POST /boards/<board_pk>/tasks/ — todas las tareas del tablero (sin paginar)."""

    serializer_class = TaskSerializer
    pagination_class = None

    def get_queryset(self):
        qs = tasks_queryset().filter(board=self.board)
        return filter_tasks(qs, self.request.query_params, self.request.user)

    def perform_create(self, serializer):
        self.require(BoardRole.EDITOR)
        column = serializer.validated_data.pop('column', None) or self.board.columns.order_by('position').first()
        assignees = serializer.validated_data.pop('assignees', [])
        task = Task.objects.create(
            board=self.board,
            column=column,
            position=services.next_position(column),
            created_by=self.request.user,
            **serializer.validated_data,
        )
        if column.is_done:
            task.completed_at = timezone.now()
            task.save(update_fields=['completed_at'])
        task.assignees.set(assignees)
        services.log(self.board, self.request.user, Activity.Verb.TASK_CREATED, task=task, title=task.title)
        notify.notify_assigned(task, assignees, self.request.user)
        serializer.instance = tasks_queryset().get(pk=task.pk)


class TaskViewSet(
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """
    GET/PATCH/DELETE /tasks/<id>/  ·  POST /tasks/<id>/move/
    POST /tasks/<id>/complete/  a la primera columna de terminadas (devuelve `previous` para deshacer)
    POST /tasks/<id>/reopen/    a la primera columna sin terminar, al final
    """

    serializer_class = TaskSerializer
    http_method_names = ['get', 'patch', 'delete', 'post']

    def get_queryset(self):
        return tasks_queryset().filter(board__in=visible_boards(self.request.user))

    def get_object(self):
        task = super().get_object()
        self.role = require_board_role(self.request.user, task.board)
        if self.request.method not in SAFE_METHODS:
            require_writable(task.board)
        return task

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        if getattr(self, '_task', None) is not None:
            ctx['board'] = self._task.board
        return ctx

    def _require(self, task, minimum):
        if not has_role(self.role, minimum):
            require_board_role(self.request.user, task.board, minimum)

    def update(self, request, *args, **kwargs):
        self._task = self.get_object()
        self._require(self._task, BoardRole.EDITOR)
        serializer = self.get_serializer(self._task, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        before = set(self._task.assignees.values_list('pk', flat=True))
        serializer.save()
        if 'assignees' in serializer.validated_data:
            added = [u for u in serializer.validated_data['assignees'] if u.pk not in before]
            notify.notify_assigned(self._task, added, request.user)
        services.log(self._task.board, request.user, Activity.Verb.TASK_UPDATED, task=self._task,
                     title=self._task.title, fields=sorted(serializer.validated_data.keys()))
        return Response(self.get_serializer(tasks_queryset().get(pk=self._task.pk)).data)

    def perform_destroy(self, instance):
        self._require(instance, BoardRole.EDITOR)
        board, title = instance.board, instance.title
        instance.delete()
        services.log(board, self.request.user, Activity.Verb.TASK_DELETED, title=title)

    def _require_movable(self, task):
        """Editores mueven cualquier tarea; un lector, solo las que tiene asignadas."""
        if not has_role(self.role, BoardRole.EDITOR):
            if not task.assignees.filter(pk=self.request.user.pk).exists():
                raise PermissionDenied('Solo podés mover tareas que tenés asignadas.')

    def _moved(self, task, **extra):
        self._task = task
        data = self.get_serializer(tasks_queryset().get(pk=task.pk)).data
        return Response({**data, **extra})

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Marcar como hecha. `previous` permite deshacer moviéndola exactamente adonde estaba."""
        task = self.get_object()
        self._require_movable(task)
        previous = {'column': task.column_id, 'position': task.position}
        if task.column.is_done:
            return self._moved(task, previous=None)
        done = task.board.columns.filter(is_done=True).order_by('position').first()
        if done is None:
            raise ValidationError('El proyecto no tiene una columna de terminadas. Pedile al líder que marque una.')
        services.move_task(task, done, 10**6, request.user)
        return self._moved(task, previous=previous)

    @action(detail=True, methods=['post'])
    def reopen(self, request, pk=None):
        """Reabrir: vuelve a la primera columna sin terminar, al final."""
        task = self.get_object()
        self._require_movable(task)
        if not task.column.is_done:
            return self._moved(task)
        target = task.board.columns.filter(is_done=False).order_by('position').first()
        if target is None:
            raise ValidationError('El proyecto no tiene columnas sin terminar.')
        services.move_task(task, target, 10**6, request.user)
        return self._moved(task)

    @action(detail=True, methods=['get', 'post', 'delete'])
    def follow(self, request, pk=None):
        """Seguir una tarea (cualquiera con acceso): recibir sus comentarios y cuando se termina."""
        task = self.get_object()
        if request.method == 'POST':
            task.followers.add(request.user)
        elif request.method == 'DELETE':
            task.followers.remove(request.user)
        return Response({'following': task.followers.filter(pk=request.user.pk).exists()})

    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        """Mover a otra columna o reordenar (ver _require_movable)."""
        task = self.get_object()
        self._require_movable(task)
        serializer = TaskMoveSerializer(data=request.data, context={'task': task})
        serializer.is_valid(raise_exception=True)
        column = serializer.validated_data['column']
        position = serializer.validated_data.get('position', 10**6)  # por defecto: al final
        services.move_task(task, column, position, request.user)
        self._task = task
        return Response(self.get_serializer(tasks_queryset().get(pk=task.pk)).data)


class MyTasksView(generics.ListAPIView):
    """
    GET /my-tasks/ — tareas asignadas al usuario en todos sus tableros.
    Por defecto solo las abiertas (?status=all para todas). Filtro extra: ?organization=<id>
    """

    serializer_class = TaskSummarySerializer

    def get_queryset(self):
        user = self.request.user
        params = self.request.query_params.copy()
        params.setdefault('status', 'open')
        qs = tasks_queryset().filter(
            assignees=user, board__in=visible_boards(user), board__archived_at__isnull=True
        )
        org = params.get('organization')
        if org:
            qs = qs.filter(board__organization_id=org)
        params.pop('assignee', None)
        return (
            filter_tasks(qs, params, user)
            .annotate(priority_rank=PRIORITY_RANK)
            .order_by(F('due_date').asc(nulls_last=True), 'priority_rank', 'id')
        )


# ── Checklist ───────────────────────────────────────────────────────────────

def _checklist_task(user, task_id, write):
    task = Task.objects.select_related('board').filter(pk=task_id, board__in=visible_boards(user)).first()
    if task is None:
        raise NotFound('Tarea no encontrada.')
    role = require_board_role(user, task.board)
    if write:
        require_writable(task.board)
    return task, role


class TaskChecklistView(generics.ListCreateAPIView):
    """GET (lector) / POST (editor) /tasks/<task_pk>/checklist/."""

    serializer_class = ChecklistItemSerializer
    pagination_class = None

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        self.task, self.role = _checklist_task(request.user, kwargs['task_pk'], request.method not in SAFE_METHODS)

    def get_queryset(self):
        return ChecklistItem.objects.filter(task=self.task)

    def perform_create(self, serializer):
        if not has_role(self.role, BoardRole.EDITOR):
            require_board_role(self.request.user, self.task.board, BoardRole.EDITOR)
        last = ChecklistItem.objects.filter(task=self.task).order_by('-position').first()
        serializer.save(task=self.task, position=(last.position + 1) if last else 0)


class ChecklistItemViewSet(mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """
    PATCH/DELETE /checklist/<id>/. Editores, todo. Un lector responsable de la tarea solo puede
    tildar o destildar (como mover sus tareas asignadas).
    """

    serializer_class = ChecklistItemSerializer
    http_method_names = ['patch', 'delete']

    def get_queryset(self):
        return ChecklistItem.objects.filter(task__board__in=visible_boards(self.request.user)).select_related('task__board')

    def perform_update(self, serializer):
        item = serializer.instance
        _, role = _checklist_task(self.request.user, item.task_id, write=True)
        only_done = set(serializer.validated_data) <= {'done'}
        assigned = item.task.assignees.filter(pk=self.request.user.pk).exists()
        if not has_role(role, BoardRole.EDITOR) and not (only_done and assigned):
            require_board_role(self.request.user, item.task.board, BoardRole.EDITOR)
        serializer.save()

    def perform_destroy(self, instance):
        _, role = _checklist_task(self.request.user, instance.task_id, write=True)
        if not has_role(role, BoardRole.EDITOR):
            require_board_role(self.request.user, instance.task.board, BoardRole.EDITOR)
        instance.delete()


# ── Comentarios ─────────────────────────────────────────────────────────────

class TaskCommentListView(generics.ListCreateAPIView):
    """GET/POST /tasks/<task_pk>/comments/ — cualquiera con acceso al tablero puede comentar."""

    serializer_class = CommentSerializer

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        self.task = Task.objects.select_related('board').filter(pk=kwargs['task_pk']).first()
        if self.task is None:
            raise NotFound('Tarea no encontrada.')
        require_board_role(request.user, self.task.board)
        if request.method not in SAFE_METHODS:
            require_writable(self.task.board)

    def get_queryset(self):
        return Comment.objects.filter(task=self.task).select_related('author').prefetch_related('mentions')

    def perform_create(self, serializer):
        comment = serializer.save(task=self.task, author=self.request.user)
        services.log(self.task.board, self.request.user, Activity.Verb.COMMENT_ADDED,
                     task=self.task, title=self.task.title, comment_id=comment.pk)
        notify.notify_comment(comment, self.request.user, mentioned=list(comment.mentions.all()))


class CommentViewSet(mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """PATCH (solo autor) / DELETE (autor o admin del tablero) /comments/<id>/"""

    serializer_class = CommentSerializer
    http_method_names = ['patch', 'delete']

    def get_queryset(self):
        return Comment.objects.filter(task__board__in=visible_boards(self.request.user)).select_related('task__board')

    def perform_update(self, serializer):
        require_writable(serializer.instance.task.board)
        if serializer.instance.author_id != self.request.user.pk:
            raise PermissionDenied('Solo el autor puede editar el comentario.')
        before = set(serializer.instance.mentions.values_list('pk', flat=True))
        comment = serializer.save()
        added = [u for u in comment.mentions.all() if u.pk not in before]
        notify.notify_mentions(comment, added, self.request.user)

    def perform_destroy(self, instance):
        require_writable(instance.task.board)
        if instance.author_id != self.request.user.pk:
            require_board_role(self.request.user, instance.task.board, BoardRole.ADMIN)
        instance.delete()


# ── Inicio y actividad de la organización ───────────────────────────────────

class HomeView(APIView):
    """
    GET /organizations/<org_pk>/home/ — panel de Inicio de la organización activa.

    - `my`: mis tareas abiertas, vencidas, para hoy y de los próximos 7 días.
    - `next_tasks`: las 8 más urgentes (vencimiento y prioridad).
    - `overview` (null si no corresponde): para propietarios y administradores, todos los
      proyectos activos o en pausa; para líderes, solo los que lideran. Incluye la carga
      de trabajo por responsable en esos proyectos.
    """

    NEXT_TASKS = 8

    def get(self, request, org_pk):
        user = request.user
        membership = require_membership(user, org_pk)
        today = timezone.localdate()
        boards = visible_boards(user).filter(organization_id=org_pk, archived_at__isnull=True)

        mine = Task.objects.filter(board__in=boards, assignees=user, column__is_done=False)
        my = mine.aggregate(
            open=Count('id', distinct=True),
            overdue=Count('id', filter=Q(due_date__lt=today), distinct=True),
            today=Count('id', filter=Q(due_date=today), distinct=True),
            # Mismos grupos que "Mis tareas": hoy va aparte, la semana es de mañana a 7 días.
            week=Count('id', filter=Q(due_date__gt=today, due_date__lte=today + timedelta(days=7)), distinct=True),
        )
        next_tasks = (
            tasks_queryset().filter(pk__in=mine.values('pk'))
            .annotate(priority_rank=PRIORITY_RANK)
            .order_by(F('due_date').asc(nulls_last=True), 'priority_rank', 'id')[: self.NEXT_TASKS]
        )

        return Response({
            'my': my,
            'next_tasks': TaskSummarySerializer(next_tasks, many=True, context={'request': request}).data,
            'overview': self._overview(user, membership, boards, today),
        })

    def _overview(self, user, membership, boards, today):
        if not membership.is_manager:
            led = BoardMember.objects.filter(user=user, role=BoardRole.ADMIN).values('board_id')
            boards = boards.filter(pk__in=led)
            if not boards.exists():
                return None
        projects = with_progress(
            boards.filter(status__in=[Board.Status.ACTIVE, Board.Status.ON_HOLD]), today
        ).order_by('due_date', 'title')

        open_assignments = Task.assignees.through.objects.filter(
            task__board__in=projects.values('pk'), task__column__is_done=False
        )
        load = (
            open_assignments.values('user_id', 'user__full_name')
            .annotate(open=Count('task_id'), overdue=Count('task_id', filter=Q(task__due_date__lt=today)))
            .order_by('-overdue', '-open', 'user__full_name')
        )
        return {
            'projects': [
                {
                    'id': p.id, 'title': p.title, 'color': p.color, 'status': p.status,
                    'due_date': p.due_date, 'tasks_total': p.tasks_total, 'tasks_done': p.tasks_done,
                    'tasks_overdue': p.tasks_overdue,
                    'is_late': bool(p.due_date and p.due_date < today and p.status != Board.Status.COMPLETED),
                }
                for p in projects
            ],
            'workload': [
                {'user_id': row['user_id'], 'full_name': row['user__full_name'],
                 'open': row['open'], 'overdue': row['overdue']}
                for row in load
            ],
        }


class OrganizationActivityView(generics.ListAPIView):
    """GET /organizations/<org_pk>/activity/ — actividad reciente de los proyectos que el usuario ve."""

    serializer_class = ActivitySerializer

    def get_queryset(self):
        org_pk = self.kwargs['org_pk']
        require_membership(self.request.user, org_pk)
        boards = visible_boards(self.request.user).filter(organization_id=org_pk)
        return Activity.objects.filter(board__in=boards).select_related('actor', 'board')
