from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from workspaces.models import Invitation, Membership, Organization, OrgRole


@transaction.atomic
def create_organization(user, name):
    org = Organization.objects.create(name=name, created_by=user)
    Membership.objects.create(organization=org, user=user, role=OrgRole.OWNER)
    return org


def owners_count(organization_id):
    return Membership.objects.filter(organization_id=organization_id, role=OrgRole.OWNER).count()


@transaction.atomic
def remove_membership(membership):
    """
    Saca a un usuario de la organización y limpia su acceso:
    lo quita de los tableros y de las tareas asignadas de esa organización.
    """
    from boards.models import BoardMember, Task  # import local para evitar ciclos

    if membership.role == OrgRole.OWNER and owners_count(membership.organization_id) <= 1:
        raise ValidationError(
            'La organización necesita al menos un propietario. Nombrá a otra persona como propietaria antes de salir.'
        )

    org_id = membership.organization_id
    user = membership.user
    BoardMember.objects.filter(board__organization_id=org_id, user=user).delete()
    from workspaces.models import TeamMember
    TeamMember.objects.filter(team__organization_id=org_id, user=user).delete()
    for task in Task.objects.filter(board__organization_id=org_id, assignees=user):
        task.assignees.remove(user)
    membership.delete()


@transaction.atomic
def change_role(membership, new_role):
    if membership.role == OrgRole.OWNER and new_role != OrgRole.OWNER:
        if owners_count(membership.organization_id) <= 1:
            raise ValidationError('La organización necesita al menos un propietario.')
    membership.role = new_role
    membership.save(update_fields=['role'])
    return membership


def send_invitation_email(invitation):
    """Envía la invitación por correo en el momento (para informar si falló). True si salió."""
    from tasksManager.mail import send_template

    inviter = invitation.created_by.full_name if invitation.created_by else 'Alguien'
    return send_template(
        'invitation', invitation.email, f'Te invitaron a {invitation.organization.name}',
        {
            'organization': invitation.organization.name,
            'inviter': inviter,
            'role': invitation.get_role_display().lower(),
            'invite_url': invitation.url,
            'expires_at': timezone.localtime(invitation.expires_at),
        },
    )


@transaction.atomic
def accept_invitation(token, user):
    invitation = (
        Invitation.objects.select_for_update()
        .select_related('organization')
        .filter(token=token)
        .first()
    )
    if invitation is None:
        raise ValidationError('La invitación no existe.')
    if not invitation.is_usable:
        label = Invitation.Status(invitation.status).label.lower()
        raise ValidationError(f'La invitación no es válida (estado: {label}).')
    if invitation.email and invitation.email.lower() != user.email.lower():
        raise PermissionDenied('Esta invitación es para otro email.')
    if Membership.objects.filter(organization=invitation.organization, user=user).exists():
        raise ValidationError('Ya sos integrante de esta organización.')

    membership = Membership.objects.create(
        organization=invitation.organization, user=user, role=invitation.role
    )
    invitation.accepted_by = user
    invitation.accepted_at = timezone.now()
    invitation.save(update_fields=['accepted_by', 'accepted_at'])
    return membership
