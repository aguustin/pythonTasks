import secrets
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


class Organization(models.Model):
    """Empresa, local o equipo. Un usuario puede pertenecer a varias."""

    class ProjectCreation(models.TextChoices):
        # D4: quién puede crear (y duplicar) proyectos. Los invitados nunca pueden.
        MEMBERS = 'members', 'Integrantes, administradores y propietarios'
        MANAGERS = 'managers', 'Solo administradores y propietarios'

    name = models.CharField('nombre', max_length=120)
    project_creation = models.CharField(
        'quién crea proyectos', max_length=10, choices=ProjectCreation.choices, default=ProjectCreation.MEMBERS,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'organización'
        verbose_name_plural = 'organizaciones'
        ordering = ['name', 'id']

    def __str__(self):
        return self.name


class OrgRole(models.TextChoices):
    OWNER = 'owner', 'Propietario'
    ADMIN = 'admin', 'Administrador'
    MEMBER = 'member', 'Integrante'
    # Persona externa (cliente, proveedor): solo ve los proyectos a los que la agregan
    # explícitamente (directo o por un equipo), nunca los abiertos a toda la organización.
    GUEST = 'guest', 'Invitado'


ORG_MANAGER_ROLES = (OrgRole.OWNER, OrgRole.ADMIN)


class Membership(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField('rol', max_length=10, choices=OrgRole.choices, default=OrgRole.MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'miembro'
        verbose_name_plural = 'miembros'
        ordering = ['joined_at', 'id']
        constraints = [
            models.UniqueConstraint(fields=['organization', 'user'], name='unique_membership'),
        ]

    def __str__(self):
        return f'{self.user} @ {self.organization} ({self.role})'

    @property
    def is_manager(self):
        return self.role in ORG_MANAGER_ROLES

    @property
    def is_guest(self):
        return self.role == OrgRole.GUEST


class Team(models.Model):
    """Grupo de integrantes para dar acceso a proyectos de una vez (no es un contenedor)."""

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='teams')
    name = models.CharField('nombre', max_length=60)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'equipo'
        verbose_name_plural = 'equipos'
        ordering = ['name', 'id']
        constraints = [models.UniqueConstraint(fields=['organization', 'name'], name='team_unique_name_per_org')]

    def __str__(self):
        return self.name


class TeamMember(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='team_memberships')
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['added_at', 'id']
        constraints = [models.UniqueConstraint(fields=['team', 'user'], name='team_member_unique')]


def _new_token():
    return secrets.token_urlsafe(32)


def _default_expiration():
    return timezone.now() + timedelta(days=settings.INVITATION_EXPIRATION_DAYS)


class Invitation(models.Model):
    """
    Link de invitación a una organización. Es de un solo uso.
    Si tiene `email`, solo puede aceptarla un usuario con ese email.
    """

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pendiente'
        ACCEPTED = 'accepted', 'Aceptada'
        REVOKED = 'revoked', 'Revocada'
        EXPIRED = 'expired', 'Vencida'

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='invitations')
    email = models.EmailField('email', blank=True, default='')
    role = models.CharField(
        'rol', max_length=10,
        choices=[(OrgRole.ADMIN, OrgRole.ADMIN.label), (OrgRole.MEMBER, OrgRole.MEMBER.label),
                 (OrgRole.GUEST, OrgRole.GUEST.label)],
        default=OrgRole.MEMBER,
    )
    token = models.CharField(max_length=64, unique=True, default=_new_token, editable=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(default=_default_expiration)
    accepted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+'
    )
    accepted_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'invitación'
        verbose_name_plural = 'invitaciones'
        ordering = ['-created_at']

    def __str__(self):
        return f'Invitación a {self.organization} ({self.email or "link abierto"})'

    @property
    def status(self):
        if self.accepted_at:
            return self.Status.ACCEPTED
        if self.revoked_at:
            return self.Status.REVOKED
        if self.expires_at <= timezone.now():
            return self.Status.EXPIRED
        return self.Status.PENDING

    @property
    def is_usable(self):
        return self.status == self.Status.PENDING

    @property
    def url(self):
        return f'{settings.FRONTEND_URL}/invitacion/{self.token}'
