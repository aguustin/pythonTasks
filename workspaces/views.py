from django.db.models import Count, OuterRef, Subquery
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from workspaces.access import can_manage_member, require_manager, require_membership, require_owner
from workspaces.models import Invitation, Membership, Organization, OrgRole
from workspaces.serializers import (
    InvitationPublicSerializer,
    InvitationSerializer,
    MembershipSerializer,
    OrganizationSerializer,
)
from workspaces.services import accept_invitation, change_role, create_organization, remove_membership


class OrganizationViewSet(viewsets.ModelViewSet):
    """Organizaciones de las que el usuario es miembro."""

    serializer_class = OrganizationSerializer
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        my_role = Membership.objects.filter(organization=OuterRef('pk'), user=user).values('role')[:1]
        members = (
            Membership.objects.filter(organization=OuterRef('pk'))
            .values('organization')
            .annotate(c=Count('id'))
            .values('c')
        )
        return (
            Organization.objects.filter(memberships__user=user)
            .annotate(my_role=Subquery(my_role), members_count=Subquery(members))
            .distinct()
        )

    def perform_create(self, serializer):
        org = create_organization(self.request.user, serializer.validated_data['name'])
        serializer.instance = self.get_queryset().get(pk=org.pk)

    def perform_update(self, serializer):
        require_manager(require_membership(self.request.user, serializer.instance.pk))
        serializer.save()

    def perform_destroy(self, instance):
        require_owner(require_membership(self.request.user, instance.pk))
        instance.delete()

    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        membership = require_membership(request.user, pk)
        remove_membership(membership)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MembershipViewSet(
    mixins.ListModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """Miembros de una organización: /organizations/{org_pk}/members/"""

    serializer_class = MembershipSerializer
    pagination_class = None
    http_method_names = ['get', 'patch', 'delete']

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        self.my_membership = require_membership(request.user, kwargs['org_pk'])

    def get_queryset(self):
        return Membership.objects.filter(organization_id=self.kwargs['org_pk']).select_related('user')

    def _check_can_manage(self, target):
        require_manager(self.my_membership)
        if not can_manage_member(self.my_membership, target):
            raise PermissionDenied('No tenés permiso para gestionar a este miembro.')

    def perform_update(self, serializer):
        target = serializer.instance
        self._check_can_manage(target)
        new_role = serializer.validated_data.get('role', target.role)
        if new_role == OrgRole.OWNER and self.my_membership.role != OrgRole.OWNER:
            raise PermissionDenied('Solo un dueño puede nombrar a otro dueño.')
        change_role(target, new_role)

    def perform_destroy(self, instance):
        self._check_can_manage(instance)
        remove_membership(instance)


class InvitationViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """Invitaciones de una organización (solo dueños y administradores)."""

    serializer_class = InvitationSerializer

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        self.my_membership = require_membership(request.user, kwargs['org_pk'])
        require_manager(self.my_membership)

    def get_queryset(self):
        qs = Invitation.objects.filter(organization_id=self.kwargs['org_pk']).select_related(
            'created_by', 'accepted_by'
        )
        if self.request.query_params.get('status') == 'pending':
            qs = qs.filter(accepted_at__isnull=True, revoked_at__isnull=True, expires_at__gt=timezone.now())
        return qs

    def perform_create(self, serializer):
        email = serializer.validated_data.get('email')
        org_id = self.kwargs['org_pk']
        if email and Membership.objects.filter(organization_id=org_id, user__email__iexact=email).exists():
            raise ValidationError({'email': 'Esa persona ya es miembro de la organización.'})
        serializer.save(organization_id=org_id, created_by=self.request.user)

    def perform_destroy(self, instance):
        """No se borra: se revoca para que quede el historial."""
        if instance.is_usable:
            instance.revoked_at = timezone.now()
            instance.save(update_fields=['revoked_at'])


class PublicInvitationView(APIView):
    """GET (sin sesión): datos de la invitación. POST con sesión: aceptarla."""

    throttle_scope = 'invitation'

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return super().get_permissions()

    def get(self, request, token):
        invitation = get_object_or_404(
            Invitation.objects.select_related('organization', 'created_by'), token=token
        )
        return Response(InvitationPublicSerializer(invitation).data)

    def post(self, request, token):
        membership = accept_invitation(token, request.user)
        org = membership.organization
        return Response(
            {'organization': {'id': org.id, 'name': org.name}, 'role': membership.role},
            status=status.HTTP_201_CREATED,
        )
