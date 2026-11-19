import re
import time
from datetime import timedelta
from unittest import mock

from django.core import mail
from django.core.cache import cache
from django.test import RequestFactory, override_settings
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import PasswordResetToken
from tasksManager.client_ip import ClientIPScopedRateThrottle, client_ip
from tests.helpers import BaseAPITest

NEW_PASSWORD = 'Otra-Clave-Segura-2026'


class SessionTests(BaseAPITest):
    def setUp(self):
        self.user = self.make_user('ana')

    def login(self):
        res = self.client.post('/api/v1/auth/login/', {'email': 'ana@test.com', 'password': self.password}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        return res.data['tokens']

    def me(self, access):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        status = self.client.get('/api/v1/auth/me/').status_code
        self.client.credentials()
        return status

    def refresh(self, token):
        return self.client.post('/api/v1/auth/refresh/', {'refresh': token}, format='json')

    def test_refresh_rotates_and_keeps_auth_time(self):
        tokens = self.login()
        auth_time = RefreshToken(tokens['refresh'])['auth_time']
        res = self.refresh(tokens['refresh'])
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(RefreshToken(res.data['refresh'])['auth_time'], auth_time)
        self.assertEqual(self.refresh(tokens['refresh']).status_code, 401)  # el anterior quedó invalidado

    def test_session_within_absolute_limit_still_refreshes(self):
        token = RefreshToken.for_user(self.user)
        token['sv'] = self.user.session_version
        token['auth_time'] = int(time.time()) - 29 * 86400
        self.assertEqual(self.refresh(str(token)).status_code, 200)

    def test_absolute_session_limit(self):
        old = RefreshToken.for_user(self.user)
        old['sv'] = self.user.session_version
        old['auth_time'] = int(time.time()) - 31 * 86400
        self.assertEqual(self.refresh(str(old)).status_code, 401)
        without_auth_time = RefreshToken.for_user(self.user)
        without_auth_time['sv'] = self.user.session_version
        self.assertEqual(self.refresh(str(without_auth_time)).status_code, 401)

    def test_logout_all_revokes_access_and_refresh_immediately(self):
        a = self.login()
        b = self.login()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {a['access']}")
        self.assertEqual(self.client.post('/api/v1/auth/logout-all/').status_code, 204)
        self.client.credentials()
        for tokens in (a, b):
            self.assertEqual(self.me(tokens['access']), 401)
            self.assertEqual(self.refresh(tokens['refresh']).status_code, 401)

    def test_change_password_revokes_other_sessions(self):
        other = self.login()
        current = self.login()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {current['access']}")
        res = self.client.post('/api/v1/auth/change-password/',
                               {'current_password': self.password, 'new_password': NEW_PASSWORD}, format='json')
        self.client.credentials()
        self.assertEqual(res.status_code, 200)
        self.assertEqual(self.refresh(other['refresh']).status_code, 401)
        self.assertEqual(self.me(res.data['tokens']['access']), 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('se cambió', mail.outbox[0].subject)


class PasswordResetTests(BaseAPITest):
    def setUp(self):
        self.user = self.make_user('ana')

    def request_reset(self, email='ana@test.com'):
        return self.client.post('/api/v1/auth/password-reset/', {'email': email}, format='json')

    def token_from_email(self):
        match = re.search(r'/restablecer-contrasena/([\w-]+)', mail.outbox[-1].body)
        self.assertIsNotNone(match)
        return match.group(1)

    def confirm(self, token, password=NEW_PASSWORD):
        return self.client.post('/api/v1/auth/password-reset/confirm/', {
            'token': token, 'new_password': password, 'new_password_confirm': password,
        }, format='json')

    def test_same_response_whether_account_exists_or_not(self):
        existing = self.request_reset('ANA@test.com')
        missing = self.request_reset('nadie@test.com')
        self.assertEqual(existing.status_code, 202)
        self.assertEqual(existing.data, missing.data)
        self.assertEqual(len(mail.outbox), 1)  # solo para la cuenta existente
        self.assertEqual(mail.outbox[0].to, ['ana@test.com'])

    def test_token_is_stored_hashed(self):
        self.request_reset()
        token = self.token_from_email()
        record = PasswordResetToken.objects.get(user=self.user)
        self.assertNotEqual(record.token_hash, token)
        self.assertEqual(len(record.token_hash), 64)

    def test_full_flow_single_use_and_revokes_sessions(self):
        old_refresh = self.client.post('/api/v1/auth/login/', {'email': 'ana@test.com', 'password': self.password},
                                       format='json').data['tokens']['refresh']
        self.request_reset()
        token = self.token_from_email()
        res = self.confirm(token)
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(self.confirm(token).status_code, 400)  # un solo uso
        self.assertEqual(self.client.post('/api/v1/auth/refresh/', {'refresh': old_refresh}, format='json').status_code, 401)
        login = self.client.post('/api/v1/auth/login/', {'email': 'ana@test.com', 'password': NEW_PASSWORD}, format='json')
        self.assertEqual(login.status_code, 200)
        self.assertIn('se cambió', mail.outbox[-1].subject)

    def test_expired_and_superseded_tokens_fail(self):
        self.request_reset()
        first = self.token_from_email()
        self.request_reset()
        second = self.token_from_email()
        self.assertEqual(self.confirm(first).status_code, 400)  # el pedido nuevo invalidó el anterior
        PasswordResetToken.objects.filter(used_at__isnull=True).update(expires_at=timezone.now() - timedelta(minutes=1))
        self.assertEqual(self.confirm(second).status_code, 400)

    def test_validations(self):
        self.request_reset()
        token = self.token_from_email()
        weak = self.confirm(token, '123')
        self.assertEqual(weak.status_code, 400)
        mismatch = self.client.post('/api/v1/auth/password-reset/confirm/', {
            'token': token, 'new_password': NEW_PASSWORD, 'new_password_confirm': 'otra-cosa-2026',
        }, format='json')
        self.assertIn('new_password_confirm', mismatch.data)
        self.assertEqual(self.confirm('inventado').status_code, 400)


@override_settings(BFF_SHARED_SECRET='secreto-bff')
class ClientIPTests(BaseAPITest):
    def test_client_ip_trusts_forwarded_ip_only_with_secret(self):
        rf = RequestFactory()
        trusted = rf.get('/', HTTP_X_VELATRIX_BFF='secreto-bff', HTTP_X_CLIENT_IP='203.0.113.7', REMOTE_ADDR='10.0.0.1')
        forged = rf.get('/', HTTP_X_VELATRIX_BFF='otro', HTTP_X_CLIENT_IP='203.0.113.7', REMOTE_ADDR='10.0.0.1')
        garbage = rf.get('/', HTTP_X_VELATRIX_BFF='secreto-bff', HTTP_X_CLIENT_IP='no-es-ip', REMOTE_ADDR='10.0.0.1')
        self.assertEqual(client_ip(trusted), '203.0.113.7')
        self.assertEqual(client_ip(forged), '10.0.0.1')
        self.assertEqual(client_ip(garbage), '10.0.0.1')

    def test_throttle_is_per_real_user_ip_behind_bff(self):
        cache.clear()
        self.make_user('ana')
        body = {'email': 'ana@test.com', 'password': 'mal'}
        with mock.patch.dict(ClientIPScopedRateThrottle.THROTTLE_RATES, {'auth': '2/min'}):
            for _ in range(2):
                self.client.post('/api/v1/auth/login/', body, format='json',
                                 HTTP_X_VELATRIX_BFF='secreto-bff', HTTP_X_CLIENT_IP='203.0.113.1')
            blocked = self.client.post('/api/v1/auth/login/', body, format='json',
                                       HTTP_X_VELATRIX_BFF='secreto-bff', HTTP_X_CLIENT_IP='203.0.113.1')
            other_user = self.client.post('/api/v1/auth/login/', body, format='json',
                                          HTTP_X_VELATRIX_BFF='secreto-bff', HTTP_X_CLIENT_IP='203.0.113.2')
        cache.clear()
        self.assertEqual(blocked.status_code, 429)
        self.assertEqual(other_user.status_code, 401)  # otra IP real: no comparte el límite


class InvitationEmailTests(BaseAPITest):
    def setUp(self):
        self.owner = self.make_user('owner')
        self.org = self.make_org(self.owner)
        self.as_user(self.owner)
        self.url = f'/api/v1/organizations/{self.org.id}/invitations/'

    def test_invitation_with_email_is_sent(self):
        res = self.client.post(self.url, {'email': 'nuevo@test.com', 'role': 'member'}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data['email_sent'])
        self.assertEqual(mail.outbox[0].to, ['nuevo@test.com'])
        self.assertIn(res.data['url'], mail.outbox[0].body)
        self.assertIn(self.org.name, mail.outbox[0].subject)
        html = mail.outbox[0].alternatives[0][0]
        self.assertIn('#2563EB', html)  # botón con el azul de Projects

    def test_invitation_without_email_is_not_sent(self):
        res = self.client.post(self.url, {'role': 'member'}, format='json')
        self.assertIsNone(res.data['email_sent'])
        self.assertEqual(len(mail.outbox), 0)

    def test_email_failure_keeps_invitation(self):
        with mock.patch('django.core.mail.EmailMultiAlternatives.send', side_effect=OSError('caído')):
            res = self.client.post(self.url, {'email': 'nuevo@test.com'}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertFalse(res.data['email_sent'])
        self.assertTrue(res.data['token'])

    def test_plain_text_is_not_html_escaped(self):
        self.org.name = 'Pérez & Hijos'
        self.org.save()
        self.client.post(self.url, {'email': 'nuevo@test.com'}, format='json')
        self.assertIn('Pérez & Hijos', mail.outbox[0].body)
