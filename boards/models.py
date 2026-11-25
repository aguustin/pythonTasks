from django.conf import settings
from django.db import models

from workspaces.models import Organization


class BoardRole(models.TextChoices):
    VIEWER = 'viewer', 'Lector'
    EDITOR = 'editor', 'Editor'
    ADMIN = 'admin', 'Administrador'


ROLE_RANK = {BoardRole.VIEWER: 1, BoardRole.EDITOR: 2, BoardRole.ADMIN: 3}


class Board(models.Model):
    class Visibility(models.TextChoices):
        PRIVATE = 'private', 'Privado'          # solo miembros del tablero (y admins de la organización)
        ORGANIZATION = 'organization', 'Toda la organización'

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='boards')
    title = models.CharField('título', max_length=100)
    description = models.TextField('descripción', blank=True, default='')
    color = models.CharField(max_length=9, blank=True, default='')
    image = models.ImageField(upload_to='boards/', null=True, blank=True)
    visibility = models.CharField(max_length=12, choices=Visibility.choices, default=Visibility.PRIVATE)
    # Permiso que reciben los miembros de la organización cuando el tablero es visible para todos
    # y no tienen un permiso explícito en el tablero.
    organization_role = models.CharField(
        max_length=10, choices=BoardRole.choices, default=BoardRole.EDITOR
    )

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Activo'
        ON_HOLD = 'on_hold', 'En pausa'
        COMPLETED = 'completed', 'Finalizado'

    status = models.CharField('estado', max_length=10, choices=Status.choices, default=Status.ACTIVE)
    start_date = models.DateField('inicio previsto', null=True, blank=True)
    due_date = models.DateField('fin previsto', null=True, blank=True)
    # Archivado: oculto de los listados, solo lectura y restaurable. Independiente del estado.
    archived_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'proyecto'
        verbose_name_plural = 'proyectos'
        ordering = ['-created_at', 'id']

    def __str__(self):
        return self.title

    @property
    def is_archived(self):
        return self.archived_at is not None


class ProjectFavorite(models.Model):
    """Proyecto marcado como favorito por un usuario (accesos rápidos del menú)."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='favorite_projects')
    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'proyecto favorito'
        verbose_name_plural = 'proyectos favoritos'
        ordering = ['created_at', 'id']
        constraints = [
            models.UniqueConstraint(fields=['user', 'board'], name='unique_project_favorite'),
        ]


class BoardMember(models.Model):
    """Permiso explícito de un usuario en un tablero."""

    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='board_memberships')
    role = models.CharField(max_length=10, choices=BoardRole.choices, default=BoardRole.EDITOR)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'miembro del proyecto'
        verbose_name_plural = 'miembros del proyecto'
        ordering = ['added_at', 'id']
        constraints = [
            models.UniqueConstraint(fields=['board', 'user'], name='unique_board_member'),
        ]

    def __str__(self):
        return f'{self.user} en {self.board} ({self.role})'


DEFAULT_COLUMNS = [
    {'name': 'Pendiente', 'is_done': False},
    {'name': 'En curso', 'is_done': False},
    {'name': 'Hecho', 'is_done': True},
]


class Column(models.Model):
    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name='columns')
    name = models.CharField('nombre', max_length=40)
    color = models.CharField(max_length=9, blank=True, default='')
    position = models.PositiveIntegerField(default=0)
    # Las tareas en una columna "terminada" cuentan como completadas.
    is_done = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'columna'
        verbose_name_plural = 'columnas'
        ordering = ['position', 'id']

    def __str__(self):
        return f'{self.board} / {self.name}'


class Priority(models.TextChoices):
    LOW = 'low', 'Baja'
    MEDIUM = 'medium', 'Media'
    HIGH = 'high', 'Alta'
    URGENT = 'urgent', 'Urgente'


class Label(models.Model):
    """Etiqueta del proyecto ("Proveedor", "Cliente X"…). Color de una paleta fija."""

    class Color(models.TextChoices):
        GRAY = 'gray', 'Gris'
        RED = 'red', 'Rojo'
        ORANGE = 'orange', 'Naranja'
        YELLOW = 'yellow', 'Amarillo'
        GREEN = 'green', 'Verde'
        TEAL = 'teal', 'Turquesa'
        BLUE = 'blue', 'Azul'
        PURPLE = 'purple', 'Violeta'

    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name='labels')
    name = models.CharField('nombre', max_length=30)
    color = models.CharField(max_length=10, choices=Color.choices, default=Color.GRAY)

    class Meta:
        ordering = ['name', 'id']
        constraints = [models.UniqueConstraint(fields=['board', 'name'], name='label_unique_name_per_board')]

    def __str__(self):
        return self.name


class Repeat(models.TextChoices):
    NONE = 'none', 'No se repite'
    DAILY = 'daily', 'Todos los días'
    WEEKDAYS = 'weekdays', 'Días hábiles (lun. a vie.)'
    WEEKLY = 'weekly', 'Todas las semanas'
    MONTHLY = 'monthly', 'Todos los meses'


class Task(models.Model):
    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name='tasks')
    # CASCADE para que borrar un tablero/organización funcione. Borrar una columna con tareas
    # se bloquea en boards.services.delete_column (exige `move_to`).
    column = models.ForeignKey(Column, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField('título', max_length=200)
    description = models.TextField('descripción', blank=True, default='')
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    due_date = models.DateField('fecha límite', null=True, blank=True)
    assignees = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='assigned_tasks', blank=True)
    # Personas que siguen la tarea sin ser responsables: reciben sus novedades (comentarios, terminada).
    followers = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='followed_tasks', blank=True)
    labels = models.ManyToManyField(Label, related_name='tasks', blank=True)
    position = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    # Recurrencia: al terminarla se crea la próxima (una sola vez: next_occurrence lo registra).
    repeat = models.CharField('repetir', max_length=10, choices=Repeat.choices, default=Repeat.NONE)
    next_occurrence = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')

    class Meta:
        verbose_name = 'tarea'
        verbose_name_plural = 'tareas'
        ordering = ['column__position', 'position', 'id']
        indexes = [
            models.Index(fields=['board', 'column', 'position']),
            models.Index(fields=['due_date']),
        ]

    def __str__(self):
        return self.title


class ChecklistItem(models.Model):
    """Ítem simple de una tarea (cubre la mayoría de las "subtareas" sin jerarquías)."""

    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='checklist')
    text = models.CharField('texto', max_length=200)
    done = models.BooleanField(default=False)
    position = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['position', 'id']


class Comment(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='+')
    text = models.TextField()
    # Personas mencionadas con @ (solo con acceso al proyecto). El texto guarda "@Nombre Apellido".
    mentions = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='+', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'comentario'
        verbose_name_plural = 'comentarios'
        ordering = ['created_at', 'id']

    def __str__(self):
        return f'Comentario {self.pk} en tarea {self.task_id}'


class Activity(models.Model):
    """Registro de quién hizo qué en un tablero."""

    class Verb(models.TextChoices):
        BOARD_CREATED = 'board_created', 'Creó el proyecto'
        BOARD_UPDATED = 'board_updated', 'Editó el proyecto'
        BOARD_ARCHIVED = 'board_archived', 'Archivó el proyecto'
        BOARD_RESTORED = 'board_restored', 'Restauró el proyecto'
        ASSIGNEES_REMOVED = 'assignees_removed', 'Quitó responsables sin acceso'
        MEMBER_ADDED = 'member_added', 'Agregó un miembro'
        MEMBER_UPDATED = 'member_updated', 'Cambió el permiso de un miembro'
        MEMBER_REMOVED = 'member_removed', 'Quitó un miembro'
        COLUMN_CREATED = 'column_created', 'Creó una columna'
        COLUMN_UPDATED = 'column_updated', 'Editó una columna'
        COLUMN_DELETED = 'column_deleted', 'Eliminó una columna'
        TASK_CREATED = 'task_created', 'Creó una tarea'
        TASK_UPDATED = 'task_updated', 'Editó una tarea'
        TASK_MOVED = 'task_moved', 'Movió una tarea'
        TASK_DELETED = 'task_deleted', 'Eliminó una tarea'
        COMMENT_ADDED = 'comment_added', 'Comentó una tarea'

    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name='activity')
    task = models.ForeignKey(Task, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+'
    )
    verb = models.CharField(max_length=20, choices=Verb.choices)
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'actividad'
        verbose_name_plural = 'actividad'
        ordering = ['-created_at', '-id']
        indexes = [models.Index(fields=['board', '-created_at'])]

    def __str__(self):
        return f'{self.actor} · {self.get_verb_display()}'
