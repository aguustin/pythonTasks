from django.conf import settings
from rest_framework import serializers

from accounts.models import User
from accounts.serializers import UserPublicSerializer
from boards.access import board_role
from boards.models import Activity, Board, BoardMember, BoardRole, Column, Comment, Task
from workspaces.models import Membership


class ColumnSerializer(serializers.ModelSerializer):
    class Meta:
        model = Column
        fields = ['id', 'name', 'color', 'position', 'is_done']
        read_only_fields = ['id', 'position']

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('El nombre es obligatorio.')
        return value


class BoardSerializer(serializers.ModelSerializer):
    created_by = UserPublicSerializer(read_only=True)
    my_role = serializers.SerializerMethodField()
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    # Avance (anotado en la consulta; ver boards.views.with_progress)
    tasks_total = serializers.IntegerField(read_only=True, default=0)
    tasks_done = serializers.IntegerField(read_only=True, default=0)
    tasks_overdue = serializers.IntegerField(read_only=True, default=0)
    is_favorite = serializers.BooleanField(read_only=True, default=False)
    # Líderes: permiso explícito de administrador en el proyecto (los propietarios y
    # administradores de la organización lo son de todos, por eso no se listan acá).
    leads = serializers.SerializerMethodField()

    class Meta:
        model = Board
        fields = [
            'id', 'organization', 'organization_name', 'title', 'description', 'color', 'image',
            'visibility', 'organization_role', 'status', 'start_date', 'due_date', 'archived_at',
            'tasks_total', 'tasks_done', 'tasks_overdue', 'is_favorite', 'leads',
            'created_by', 'created_at', 'updated_at', 'my_role',
        ]
        read_only_fields = ['id', 'archived_at', 'created_by', 'created_at', 'updated_at']

    def validate(self, attrs):
        start = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        due = attrs.get('due_date', getattr(self.instance, 'due_date', None))
        if start and due and due < start:
            raise serializers.ValidationError({'due_date': 'El fin previsto no puede ser anterior al inicio.'})
        return attrs

    def get_leads(self, obj):
        members = getattr(obj, 'lead_members', None)
        if members is None:
            members = obj.members.filter(role=BoardRole.ADMIN).select_related('user')
        return UserPublicSerializer([m.user for m in members], many=True).data

    def get_my_role(self, obj):
        cache = self.context.get('role_cache')
        if cache is not None:
            return cache.role(obj)
        return board_role(self.context['request'].user, obj)

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('El título es obligatorio.')
        return value

    def validate_image(self, value):
        if value and value.size > settings.MAX_UPLOAD_IMAGE_MB * 1024 * 1024:
            raise serializers.ValidationError(f'La imagen no puede pesar más de {settings.MAX_UPLOAD_IMAGE_MB} MB.')
        return value

    def validate_organization(self, value):
        if self.instance is not None and value.pk != self.instance.organization_id:
            raise serializers.ValidationError('No se puede mover un tablero a otra organización.')
        return value


class BoardDetailSerializer(BoardSerializer):
    columns = ColumnSerializer(many=True, read_only=True)

    class Meta(BoardSerializer.Meta):
        fields = BoardSerializer.Meta.fields + ['columns']


class BoardMemberSerializer(serializers.ModelSerializer):
    user = UserPublicSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='user', write_only=True
    )

    class Meta:
        model = BoardMember
        fields = ['id', 'user', 'user_id', 'role', 'added_at']
        read_only_fields = ['id', 'added_at']

    def validate(self, attrs):
        board = self.context['board']
        user = attrs.get('user')
        if self.instance is None:
            if not Membership.objects.filter(organization_id=board.organization_id, user=user).exists():
                raise serializers.ValidationError({'user_id': 'La persona no es integrante de la organización.'})
            if BoardMember.objects.filter(board=board, user=user).exists():
                raise serializers.ValidationError({'user_id': 'El usuario ya es miembro del tablero.'})
        elif user is not None and user.pk != self.instance.user_id:
            raise serializers.ValidationError({'user_id': 'No se puede cambiar el usuario.'})
        return attrs


class TaskSerializer(serializers.ModelSerializer):
    assignees = UserPublicSerializer(many=True, read_only=True)
    assignee_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), many=True, write_only=True, required=False, source='assignees'
    )
    column = serializers.PrimaryKeyRelatedField(queryset=Column.objects.all(), required=False)
    created_by = UserPublicSerializer(read_only=True)
    comments_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Task
        fields = [
            'id', 'board', 'column', 'title', 'description', 'priority', 'due_date',
            'assignees', 'assignee_ids', 'position', 'created_by',
            'created_at', 'updated_at', 'completed_at', 'comments_count',
        ]
        read_only_fields = ['id', 'board', 'position', 'created_by', 'created_at', 'updated_at', 'completed_at']

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('El título es obligatorio.')
        return value

    def validate_column(self, value):
        if self.instance is not None and value.pk != self.instance.column_id:
            raise serializers.ValidationError('Para cambiar de columna usá el endpoint /move/.')
        if value.board_id != self.context['board'].pk:
            raise serializers.ValidationError('La columna no pertenece a este tablero.')
        return value

    def validate_assignee_ids(self, users):
        board = self.context['board']
        unique = list({u.pk: u for u in users}.values())
        for user in unique:
            if board_role(user, board) is None:
                raise serializers.ValidationError(
                    f'{user.full_name or user.email} no tiene acceso a este tablero.'
                )
        return unique


class TaskMoveSerializer(serializers.Serializer):
    column = serializers.PrimaryKeyRelatedField(queryset=Column.objects.all())
    position = serializers.IntegerField(min_value=0, required=False)

    def validate_column(self, value):
        if value.board_id != self.context['task'].board_id:
            raise serializers.ValidationError('La columna no pertenece a este tablero.')
        return value


class TaskSummarySerializer(TaskSerializer):
    """Para 'Mis tareas': agrega datos del tablero y la columna."""

    board_title = serializers.CharField(source='board.title', read_only=True)
    organization = serializers.IntegerField(source='board.organization_id', read_only=True)
    column_name = serializers.CharField(source='column.name', read_only=True)
    is_done = serializers.BooleanField(source='column.is_done', read_only=True)

    class Meta(TaskSerializer.Meta):
        fields = TaskSerializer.Meta.fields + ['board_title', 'organization', 'column_name', 'is_done']


class CommentSerializer(serializers.ModelSerializer):
    author = UserPublicSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'task', 'author', 'text', 'created_at', 'updated_at']
        read_only_fields = ['id', 'task', 'author', 'created_at', 'updated_at']

    def validate_text(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('El comentario no puede estar vacío.')
        return value


class ActivitySerializer(serializers.ModelSerializer):
    actor = UserPublicSerializer(read_only=True)
    verb_display = serializers.CharField(source='get_verb_display', read_only=True)
    board_title = serializers.CharField(source='board.title', read_only=True)

    class Meta:
        model = Activity
        fields = ['id', 'board', 'board_title', 'actor', 'verb', 'verb_display', 'task', 'data', 'created_at']
        read_only_fields = fields


class AccessPreviewSerializer(serializers.Serializer):
    """Cambio de acceso a simular antes de confirmarlo (D18)."""

    visibility = serializers.ChoiceField(choices=Board.Visibility.choices, required=False)
    remove_user_ids = serializers.ListField(child=serializers.IntegerField(), required=False, default=list)
