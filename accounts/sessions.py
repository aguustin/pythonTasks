"""
Emisión, validación y revocación de sesiones (JWT).

- Cada sesión lleva `auth_time` (momento del login). La rotación del refresh conserva
  ese dato, lo que permite imponer un límite absoluto de duración (SESSION_ABSOLUTE_DAYS).
- Cada token lleva `sv` (User.session_version). Incrementar la versión invalida de inmediato
  todos los tokens emitidos antes, incluidos los access tokens que todavía no vencieron.
  Es exacto: no depende de la hora de emisión (que JWT guarda en segundos).
"""
import time
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User

SESSION_ENDED = 'Tu sesión terminó. Iniciá sesión de nuevo.'


def add_session_claims(token, user):
    """Claims propios de la sesión. El access token los hereda del refresh."""
    token['auth_time'] = int(time.time())
    token['sv'] = user.session_version
    return token


def issue_tokens(user):
    refresh = add_session_claims(RefreshToken.for_user(user), user)
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


def is_revoked(user, token):
    """True si el token se emitió con una versión de sesión anterior a la actual."""
    return token.get('sv') != user.session_version


@transaction.atomic
def revoke_all_sessions(user):
    """Cierra todas las sesiones del usuario: access y refresh emitidos hasta ahora."""
    User.objects.filter(pk=user.pk).update(session_version=F('session_version') + 1)
    user.refresh_from_db(fields=['session_version'])
    pending = OutstandingToken.objects.filter(user=user, expires_at__gt=timezone.now()).exclude(
        blacklistedtoken__isnull=False
    )
    BlacklistedToken.objects.bulk_create(
        [BlacklistedToken(token=t) for t in pending], ignore_conflicts=True
    )


class SessionJWTAuthentication(JWTAuthentication):
    """JWTAuthentication que además respeta la revocación de sesiones."""

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if is_revoked(user, validated_token):
            raise AuthenticationFailed(SESSION_ENDED, code='session_revoked')
        return user


class SessionRefreshSerializer(TokenRefreshSerializer):
    """Refresh con límite absoluto de sesión y respeto de la revocación."""

    default_error_messages = {'no_active_account': SESSION_ENDED}

    def validate(self, attrs):
        refresh = RefreshToken(attrs['refresh'])  # valida firma, vencimiento y blacklist
        user = User.objects.filter(pk=refresh.get('user_id')).first()
        if user is None or not user.is_active:
            raise InvalidToken(SESSION_ENDED)
        if is_revoked(user, refresh):
            raise InvalidToken(SESSION_ENDED)
        auth_time = refresh.get('auth_time')
        max_age = timedelta(days=settings.SESSION_ABSOLUTE_DAYS).total_seconds()
        if auth_time is None or time.time() - int(auth_time) > max_age:
            raise InvalidToken(SESSION_ENDED)
        return super().validate(attrs)
