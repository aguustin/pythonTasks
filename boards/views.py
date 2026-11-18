from django.db.models import Case, Count, F, IntegerField, Value, When
from django.utils import timezone
from rest_framework import generics, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from boards import services
from boards.access import RoleCache, get_board_or_404, has_role, require_board_role, visible_boards
from boards.filters import filter_tasks
from boards.models import Activity, BoardMember, BoardRole, Column, Comment, Priority, Task

# De más urgente a menos urgente (para ordenar "Mis tareas").
PRIORITY_ORDER = [Priority.URGENT, Priority.HIGH, Priority.MEDIUM, Priority.LOW]
from boards.serializers import (
    ActivitySerializer,
    BoardDetailSerializer,
    BoardMemberSerializer,
    BoardSerializer,
    ColumnSerializer,
    CommentSerializer,
    TaskMoveSerializer,
    TaskSerializer,
    TaskSummarySerializer,
)
from workspaces.access import require_membership


def tasks_queryset():
    return (
        Task.objects.select_related('column', 'board', 'created_by')
        .prefetch_related('assignees')
        .annotate(comments_count=Count('comments', distinct=True))
    )


# ── Tableros ────────────────────────────────────────────────────────────────

class BoardViewSet(viewsets.ModelViewSet):
    """
    GET  /boards/?organization=<id>   tableros visibles
    POST /boards/                     crear (cualquier miembro de la organización)
    GET/PATCH/DELETE /boards/<id>/    ver (lector) / editar y borrar (admin)
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
        qs = visible_boards(self.request.user).select_related('organization', 'created_by')
        org = self.request.query_params.get('organization')
        if org:
            qs = qs.filter(organization_id=org)
        if self.action == 'retrieve':
            qs = qs.prefetch_related('columns')
        return qs

    def perform_create(self, serializer):
        org = serializer.validated_data.pop('organization')
        require_membership(self.request.user, org.pk)
        serializer.instance = services.create_board(self.request.user, org, **serializer.validated_data)

    def perform_update(self, serializer):
        require_board_role(self.request.user, serializer.instance, BoardRole.ADMIN)
        board = serializer.save()
        services.log(board, self.request.user, Activity.Verb.BOARD_UPDATED,
                     fields=sorted(serializer.validated_data.keys()))

    def perform_destroy(self, instance):
        require_board_role(self.request.user, instance, BoardRole.ADMIN)
        instance.delete()


class BoardScopedMixin:
    """Carga `self.board` y `self.role` desde la URL (/boards/<board_pk>/...)."""

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        self.board, self.role = get_board_or_404(request.user, kwargs['board_pk'])

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


class BoardActivityView(BoardScopedMixin, generics.ListAPIView):
    """GET /boards/<board_pk>/activity/ — historial paginado, más reciente primero."""

    serializer_class = ActivitySerializer

    def get_queryset(self):
        return Activity.objects.filter(board=self.board).select_related('actor')


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
        serializer.instance = tasks_queryset().get(pk=task.pk)


class TaskViewSet(
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """GET/PATCH/DELETE /tasks/<id>/  ·  POST /tasks/<id>/move/"""

    serializer_class = TaskSerializer
    http_method_names = ['get', 'patch', 'delete', 'post']

    def get_queryset(self):
        return tasks_queryset().filter(board__in=visible_boards(self.request.user))

    def get_object(self):
        task = super().get_object()
        self.role = require_board_role(self.request.user, task.board)
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
        serializer.save()
        services.log(self._task.board, request.user, Activity.Verb.TASK_UPDATED, task=self._task,
                     title=self._task.title, fields=sorted(serializer.validated_data.keys()))
        return Response(self.get_serializer(tasks_queryset().get(pk=self._task.pk)).data)

    def perform_destroy(self, instance):
        self._require(instance, BoardRole.EDITOR)
        board, title = instance.board, instance.title
        instance.delete()
        services.log(board, self.request.user, Activity.Verb.TASK_DELETED, title=title)

    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        """
        Mover a otra columna o reordenar. Editores pueden mover cualquier tarea;
        un lector solo puede mover las tareas que tiene asignadas.
        """
        task = self.get_object()
        if not has_role(self.role, BoardRole.EDITOR):
            if not task.assignees.filter(pk=request.user.pk).exists():
                raise PermissionDenied('Solo podés mover tareas que tenés asignadas.')
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
        qs = tasks_queryset().filter(assignees=user, board__in=visible_boards(user))
        org = params.get('organization')
        if org:
            qs = qs.filter(board__organization_id=org)
        params.pop('assignee', None)
        priority_rank = Case(
            *[When(priority=p, then=Value(i)) for i, p in enumerate(PRIORITY_ORDER)],
            default=Value(len(PRIORITY_ORDER)),
            output_field=IntegerField(),
        )
        return (
            filter_tasks(qs, params, user)
            .annotate(priority_rank=priority_rank)
            .order_by(F('due_date').asc(nulls_last=True), 'priority_rank', 'id')
        )


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

    def get_queryset(self):
        return Comment.objects.filter(task=self.task).select_related('author')

    def perform_create(self, serializer):
        comment = serializer.save(task=self.task, author=self.request.user)
        services.log(self.task.board, self.request.user, Activity.Verb.COMMENT_ADDED,
                     task=self.task, title=self.task.title, comment_id=comment.pk)


class CommentViewSet(mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """PATCH (solo autor) / DELETE (autor o admin del tablero) /comments/<id>/"""

    serializer_class = CommentSerializer
    http_method_names = ['patch', 'delete']

    def get_queryset(self):
        return Comment.objects.filter(task__board__in=visible_boards(self.request.user)).select_related('task__board')

    def perform_update(self, serializer):
        if serializer.instance.author_id != self.request.user.pk:
            raise PermissionDenied('Solo el autor puede editar el comentario.')
        serializer.save()

    def perform_destroy(self, instance):
        if instance.author_id != self.request.user.pk:
            require_board_role(self.request.user, instance.task.board, BoardRole.ADMIN)
        instance.delete()
