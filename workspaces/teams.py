"""
Equipos de la organización: grupos de integrantes para dar acceso a proyectos de una vez.
Los ven los integrantes (no los invitados); los gestionan propietarios y administradores.
Si alguien sale de un equipo (o se borra el equipo) y por eso pierde el acceso a un proyecto,
deja de ser responsable de esas tareas (D18).
"""
from django.db import IntegrityError, transaction
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response

from accounts.serializers import UserPublicSerializer
from workspaces.access import require_manager, require_membership
from workspaces.models import Membership, Team, TeamMember


class TeamSerializer(serializers.ModelSerializer):
    members = serializers.SerializerMethodField()
    projects = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = ['id', 'name', 'members', 'projects', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_members(self, team):
        return UserPublicSerializer([m.user for m in team.members.all()], many=True).data

    def get_projects(self, team):
        return [{'id': a.board_id, 'title': a.board.title, 'role': a.role} for a in team.board_access.all()]

    def validate_name(self, value):
        value = ' '.join(value.split())
        if not value:
            raise serializers.ValidationError('Poné un nombre para el equipo.')
        clash = Team.objects.filter(organization_id=self.context['org_id'], name__iexact=value)
        if self.instance:
            clash = clash.exclude(pk=self.instance.pk)
        if clash.exists():
            raise serializers.ValidationError('Ya hay un equipo con ese nombre.')
        return value


def _prune(org_id, actor):
    from boards.services import prune_org_assignees
    prune_org_assignees(org_id, actor)


class TeamViewSet(viewsets.ModelViewSet):
    """
    GET/POST /organizations/<org_pk>/teams/ · PATCH/DELETE /organizations/<org_pk>/teams/<id>/
    POST /organizations/<org_pk>/teams/<id>/members/ {user_id} · DELETE …/members/<user_id>/
    """

    serializer_class = TeamSerializer
    pagination_class = None
    http_method_names = ['get', 'post', 'patch', 'delete']

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        self.membership = require_membership(request.user, kwargs['org_pk'])
        if self.membership.is_guest:
            raise PermissionDenied('Las personas invitadas no ven los equipos de la organización.')
        if request.method not in ('GET', 'HEAD', 'OPTIONS'):
            require_manager(self.membership)

    def get_queryset(self):
        return (
            Team.objects.filter(organization_id=self.kwargs['org_pk'])
            .prefetch_related('members__user', 'board_access__board')
        )

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'org_id': self.kwargs['org_pk']}

    def perform_create(self, serializer):
        serializer.save(organization_id=self.kwargs['org_pk'])

    @transaction.atomic
    def perform_destroy(self, instance):
        instance.delete()
        _prune(self.kwargs['org_pk'], self.request.user)

    @action(detail=True, methods=['post'], url_path='members')
    def add_member(self, request, org_pk=None, pk=None):
        team = self.get_object()
        user_id = request.data.get('user_id')
        member = Membership.objects.filter(organization_id=org_pk, user_id=user_id).select_related('user').first()
        if member is None:
            raise ValidationError({'user_id': 'La persona no es integrante de la organización.'})
        try:
            with transaction.atomic():
                TeamMember.objects.create(team=team, user=member.user)
        except IntegrityError:
            pass  # ya estaba
        return Response(self.get_serializer(self.get_queryset().get(pk=team.pk)).data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def remove_member(self, request, org_pk=None, pk=None, user_id=None):
        team = self.get_object()
        deleted, _ = TeamMember.objects.filter(team=team, user_id=user_id).delete()
        if not deleted:
            raise NotFound('Esa persona no está en el equipo.')
        _prune(org_pk, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
