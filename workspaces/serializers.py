from rest_framework import serializers

from accounts.serializers import UserPublicSerializer
from workspaces.models import Invitation, Membership, Organization, OrgRole


class OrganizationSerializer(serializers.ModelSerializer):
    my_role = serializers.CharField(read_only=True)
    members_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Organization
        fields = ['id', 'name', 'created_at', 'my_role', 'members_count']
        read_only_fields = ['id', 'created_at']

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('El nombre es obligatorio.')
        return value


class MembershipSerializer(serializers.ModelSerializer):
    user = UserPublicSerializer(read_only=True)

    class Meta:
        model = Membership
        fields = ['id', 'user', 'role', 'joined_at']
        read_only_fields = ['id', 'user', 'joined_at']


class InvitationSerializer(serializers.ModelSerializer):
    status = serializers.CharField(read_only=True)
    url = serializers.CharField(read_only=True)
    created_by = UserPublicSerializer(read_only=True)
    accepted_by = UserPublicSerializer(read_only=True)

    class Meta:
        model = Invitation
        fields = [
            'id', 'email', 'role', 'token', 'url', 'status',
            'created_by', 'created_at', 'expires_at', 'accepted_by', 'accepted_at',
        ]
        read_only_fields = [
            'id', 'token', 'url', 'status', 'created_by', 'created_at',
            'expires_at', 'accepted_by', 'accepted_at',
        ]

    def validate_email(self, value):
        return value.strip().lower()

    def validate_role(self, value):
        if value == OrgRole.OWNER:
            raise serializers.ValidationError('No se puede invitar como propietario.')
        return value


class InvitationPublicSerializer(serializers.ModelSerializer):
    """Lo que ve alguien que abre el link, antes de aceptar (incluso sin sesión)."""

    organization_name = serializers.CharField(source='organization.name', read_only=True)
    invited_by = serializers.SerializerMethodField()
    status = serializers.CharField(read_only=True)

    class Meta:
        model = Invitation
        fields = ['organization_name', 'invited_by', 'email', 'role', 'status', 'expires_at']
        read_only_fields = fields

    def get_invited_by(self, obj):
        return obj.created_by.full_name if obj.created_by else None
