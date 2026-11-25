from django.conf import settings
from django.db import models


class Notification(models.Model):
    """Aviso dentro de la app para una persona. Se ve solo mientras tenga acceso al proyecto."""

    class Verb(models.TextChoices):
        ASSIGNED = 'assigned', 'Te asignó una tarea'
        COMMENTED = 'commented', 'Comentó en una tarea'
        MENTIONED = 'mentioned', 'Te mencionó'
        COMPLETED = 'completed', 'Terminó una tarea'
        DUE_TOMORROW = 'due_tomorrow', 'Vence mañana'

    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    verb = models.CharField(max_length=20, choices=Verb.choices)
    board = models.ForeignKey('boards.Board', on_delete=models.CASCADE, related_name='+')
    task = models.ForeignKey('boards.Task', on_delete=models.CASCADE, null=True, blank=True, related_name='+')
    # Copia de lo necesario para mostrarla (título de la tarea, extracto del comentario, fecha).
    data = models.JSONField(default=dict, blank=True)
    # Evita duplicados de los avisos generados automáticamente (p. ej. "vence mañana" una vez por día).
    dedupe_key = models.CharField(max_length=80, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at', '-id']
        indexes = [models.Index(fields=['recipient', 'read_at', '-created_at'])]
        constraints = [
            models.UniqueConstraint(
                fields=['recipient', 'dedupe_key'], condition=~models.Q(dedupe_key=''), name='notification_dedupe',
            ),
        ]

    def __str__(self):
        return f'{self.recipient_id} · {self.verb} · {self.task_id}'
