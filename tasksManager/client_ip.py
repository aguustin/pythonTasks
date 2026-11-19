"""
IP real del usuario detrás del BFF (servidor de Next.js).

Todas las solicitudes del navegador pasan por el BFF, así que REMOTE_ADDR es la IP del BFF.
El BFF reenvía la IP del usuario en `X-Client-IP` y se identifica con `X-Velatrix-BFF`
(secreto compartido). Solo si el secreto coincide se confía en `X-Client-IP`.
"""
import hmac
import ipaddress

from django.conf import settings
from rest_framework.throttling import ScopedRateThrottle

BFF_HEADER = 'HTTP_X_VELATRIX_BFF'
CLIENT_IP_HEADER = 'HTTP_X_CLIENT_IP'


def _valid_ip(value):
    try:
        return str(ipaddress.ip_address(value.strip()))
    except (ValueError, AttributeError):
        return None


def is_trusted_bff(request):
    secret = settings.BFF_SHARED_SECRET
    sent = request.META.get(BFF_HEADER, '')
    return bool(secret) and bool(sent) and hmac.compare_digest(sent, secret)


def client_ip(request):
    if is_trusted_bff(request):
        forwarded = _valid_ip(request.META.get(CLIENT_IP_HEADER, ''))
        if forwarded:
            return forwarded
    return _valid_ip(request.META.get('REMOTE_ADDR', '')) or '0.0.0.0'


class ClientIPScopedRateThrottle(ScopedRateThrottle):
    """ScopedRateThrottle que identifica por la IP real del usuario (ver módulo)."""

    def get_ident(self, request):
        return client_ip(request)
