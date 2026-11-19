"""
Envío de correos transaccionales de Projects.

Las plantillas viven en `templates/emails/<nombre>.html` y `.txt`. `send_template` envía en el
momento; `send_template_later` envía en segundo plano cuando la transacción se confirma (para no
demorar la respuesta ni revelar información por tiempos). Con EMAIL_ASYNC=False (tests) es inmediato.
"""
import logging
import threading

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db import close_old_connections, transaction
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def _base_context():
    return {'frontend_url': settings.FRONTEND_URL, 'product_name': 'Velatrix One · Projects'}


def send_template(template, to, subject, context=None):
    """Envía ya. Devuelve True si se envió. Nunca lanza: registra el error."""
    ctx = {**_base_context(), **(context or {}), 'subject': subject}
    try:
        message = EmailMultiAlternatives(
            subject=subject,
            body=render_to_string(f'emails/{template}.txt', ctx),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to],
            reply_to=[settings.EMAIL_REPLY_TO] if settings.EMAIL_REPLY_TO else None,
        )
        message.attach_alternative(render_to_string(f'emails/{template}.html', ctx), 'text/html')
        return message.send() == 1
    except Exception:  # noqa: BLE001 — un correo fallido no debe romper la operación
        logger.exception('Falló el envío del correo "%s".', template)
        return False


def run_later(func, *args, **kwargs):
    """Ejecuta `func` después del commit, en un hilo aparte (o en línea si EMAIL_ASYNC=False)."""
    if not settings.EMAIL_ASYNC:
        func(*args, **kwargs)
        return

    def target():
        try:
            func(*args, **kwargs)
        finally:
            close_old_connections()

    transaction.on_commit(lambda: threading.Thread(target=target, daemon=True).start())


def send_template_later(template, to, subject, context=None):
    run_later(send_template, template, to, subject, context)
