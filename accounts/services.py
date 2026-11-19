"""Recuperación y cambio de contraseña."""
import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from accounts.models import PasswordResetToken, User
from accounts.sessions import revoke_all_sessions
from tasksManager.mail import send_template, send_template_later

INVALID_LINK = 'Este enlace ya no es válido. Pedí uno nuevo.'


def _hash(token):
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def request_password_reset(email, ip=None):
    """
    Se ejecuta en segundo plano: el endpoint responde siempre lo mismo y en el mismo tiempo,
    exista o no la cuenta. Si existe y está activa, crea el token y envía el correo.
    """
    user = User.objects.filter(email__iexact=email.strip(), is_active=True).first()
    if user is None:
        return
    token = secrets.token_urlsafe(32)
    with transaction.atomic():
        # Un pedido nuevo invalida los anteriores.
        PasswordResetToken.objects.filter(user=user, used_at__isnull=True).update(used_at=timezone.now())
        PasswordResetToken.objects.create(
            user=user,
            token_hash=_hash(token),
            expires_at=timezone.now() + timedelta(minutes=settings.PASSWORD_RESET_MINUTES),
            requested_ip=ip,
        )
    send_template(
        'password_reset', user.email, 'Restablecé tu contraseña',
        {
            'name': user.get_short_name(),
            'reset_url': f'{settings.FRONTEND_URL}/restablecer-contrasena/{token}',
            'minutes': settings.PASSWORD_RESET_MINUTES,
        },
    )


def notify_password_changed(user):
    send_template_later(
        'password_changed', user.email, 'Tu contraseña se cambió',
        {
            'name': user.get_short_name(),
            'changed_at': timezone.localtime(),
            'recover_url': f'{settings.FRONTEND_URL}/recuperar-contrasena',
        },
    )


@transaction.atomic
def confirm_password_reset(token, new_password):
    record = (
        PasswordResetToken.objects.select_for_update()
        .select_related('user')
        .filter(token_hash=_hash(token))
        .first()
    )
    if record is None or record.used_at or record.expires_at <= timezone.now() or not record.user.is_active:
        raise ValidationError({'token': INVALID_LINK})
    user = record.user
    user.set_password(new_password)
    user.save(update_fields=['password'])
    now = timezone.now()
    PasswordResetToken.objects.filter(user=user, used_at__isnull=True).update(used_at=now)
    revoke_all_sessions(user)
    notify_password_changed(user)
    return user


def token_user(token):
    """Usuario dueño de un token válido (para validar la contraseña nueva contra sus datos)."""
    record = PasswordResetToken.objects.select_related('user').filter(token_hash=_hash(token)).first()
    if record is None or record.used_at or record.expires_at <= timezone.now():
        return None
    return record.user


@transaction.atomic
def change_password(user, new_password):
    """Cambia la contraseña, cierra todas las sesiones y avisa por correo. El llamador emite tokens nuevos."""
    user.set_password(new_password)
    user.save(update_fields=['password'])
    PasswordResetToken.objects.filter(user=user, used_at__isnull=True).update(used_at=timezone.now())
    revoke_all_sessions(user)
    notify_password_changed(user)
