"""Chequeos de acceso a nivel organización."""
from rest_framework.exceptions import NotFound, PermissionDenied

from workspaces.models import Membership, OrgRole


def get_membership(user, organization_id):
    return (
        Membership.objects.select_related('organization')
        .filter(user=user, organization_id=organization_id)
        .first()
    )


def require_membership(user, organization_id):
    """Devuelve la membresía del usuario. Si no es miembro responde 404 (no revela que existe)."""
    membership = get_membership(user, organization_id)
    if membership is None:
        raise NotFound('Organización no encontrada.')
    return membership


def require_manager(membership):
    if not membership.is_manager:
        raise PermissionDenied('Solo el dueño o un administrador de la organización puede hacer esto.')


def require_owner(membership):
    if membership.role != OrgRole.OWNER:
        raise PermissionDenied('Solo el dueño de la organización puede hacer esto.')


def can_manage_member(actor: Membership, target: Membership) -> bool:
    """
    Los dueños gestionan a cualquiera. Los administradores solo a miembros comunes.
    Nadie se gestiona a sí mismo por esta vía (para irse está `leave`).
    """
    if actor.pk == target.pk:
        return False
    if actor.role == OrgRole.OWNER:
        return True
    if actor.role == OrgRole.ADMIN:
        return target.role == OrgRole.MEMBER
    return False
