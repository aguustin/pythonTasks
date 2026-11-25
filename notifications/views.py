from django.utils import timezone
from rest_framework import generics, serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.serializers import UserPublicSerializer
from boards.access import visible_boards
from notifications.models import Notification
from notifications.services import generate_due_tomorrow
from workspaces.access import require_membership


class NotificationSerializer(serializers.ModelSerializer):
    actor = UserPublicSerializer(read_only=True)
    board_title = serializers.CharField(source='board.title', read_only=True)
    board_color = serializers.CharField(source='board.color', read_only=True)
    organization = serializers.IntegerField(source='board.organization_id', read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'verb', 'actor', 'board', 'board_title', 'board_color', 'organization', 'task', 'data',
                  'created_at', 'read_at']


def mine(request):
    """
    Avisos de la persona en proyectos que hoy puede ver (si perdió el acceso, dejan de mostrarse).
    `?organization=<id>` limita a una organización.
    """
    user = request.user
    org = request.query_params.get('organization')
    boards = visible_boards(user)
    if org:
        if not org.isdigit():
            raise serializers.ValidationError({'organization': 'Debe ser un número.'})
        require_membership(user, int(org))
        boards = boards.filter(organization_id=org)
    return Notification.objects.filter(recipient=user, board__in=boards)


class NotificationListView(generics.ListAPIView):
    """GET /notifications/?organization=<id>[&unread=true] — más recientes primero (paginado)."""

    serializer_class = NotificationSerializer

    def get_queryset(self):
        org = self.request.query_params.get('organization')
        generate_due_tomorrow(self.request.user, int(org) if org and org.isdigit() else None)
        qs = mine(self.request).select_related('actor', 'board')
        if self.request.query_params.get('unread') == 'true':
            qs = qs.filter(read_at__isnull=True)
        return qs


class UnreadCountView(APIView):
    """GET /notifications/unread-count/?organization=<id> → {count}."""

    def get(self, request):
        org = request.query_params.get('organization')
        generate_due_tomorrow(request.user, int(org) if org and org.isdigit() else None)
        return Response({'count': mine(request).filter(read_at__isnull=True).count()})


class MarkReadView(APIView):
    """POST /notifications/<id>/read/ · POST /notifications/read-all/?organization=<id>."""

    def post(self, request, pk=None):
        qs = mine(request).filter(read_at__isnull=True)
        if pk is not None:
            qs = qs.filter(pk=pk)
        updated = qs.update(read_at=timezone.now())
        return Response({'updated': updated})
