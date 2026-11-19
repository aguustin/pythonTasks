"""Backend de email de Django que envía por la API HTTP de Resend (sin dependencias extra)."""
import json
import logging
import time
import urllib.error
import urllib.request

from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

logger = logging.getLogger(__name__)

RESEND_URL = 'https://api.resend.com/emails'
RETRIES = 2  # reintentos ante errores temporales (5xx, 429, red)


class ResendEmailBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        sent = 0
        for message in email_messages:
            if self._send(message):
                sent += 1
        return sent

    def _payload(self, message):
        payload = {
            'from': message.from_email or settings.DEFAULT_FROM_EMAIL,
            'to': list(message.to),
            'subject': message.subject,
            'text': message.body,
        }
        for content, mimetype in getattr(message, 'alternatives', []):
            if mimetype == 'text/html':
                payload['html'] = content
        if message.reply_to:
            payload['reply_to'] = list(message.reply_to)
        return payload

    def _send(self, message):
        data = json.dumps(self._payload(message)).encode('utf-8')
        request = urllib.request.Request(
            RESEND_URL,
            data=data,
            method='POST',
            headers={
                'Authorization': f'Bearer {settings.RESEND_API_KEY}',
                'Content-Type': 'application/json',
                'User-Agent': 'velatrix-projects',
            },
        )
        for attempt in range(RETRIES + 1):
            try:
                with urllib.request.urlopen(request, timeout=10) as response:
                    return 200 <= response.status < 300
            except urllib.error.HTTPError as exc:
                temporary = exc.code == 429 or exc.code >= 500
                if not temporary or attempt == RETRIES:
                    # Sin destinatarios ni contenido en el log: solo el estado.
                    logger.error('Resend rechazó un correo (HTTP %s).', exc.code)
                    if not self.fail_silently:
                        raise
                    return False
            except (urllib.error.URLError, TimeoutError) as exc:
                if attempt == RETRIES:
                    logger.error('No se pudo contactar a Resend: %s', type(exc).__name__)
                    if not self.fail_silently:
                        raise
                    return False
            time.sleep(1 + attempt)
        return False
