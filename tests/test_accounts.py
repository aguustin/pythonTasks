from tests.helpers import BaseAPITest


class AuthTests(BaseAPITest):
    def test_register_returns_user_and_tokens(self):
        res = self.client.post('/api/v1/auth/register/', {
            'email': 'Nuevo@Test.com', 'full_name': 'Nuevo Usuario',
            'password': self.password, 'password_confirm': self.password,
        }, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['user']['email'], 'nuevo@test.com')
        self.assertIn('access', res.data['tokens'])

    def test_register_rejects_duplicate_email_and_weak_password(self):
        self.make_user('ana')
        res = self.client.post('/api/v1/auth/register/', {
            'email': 'ANA@test.com', 'full_name': 'Ana', 'password': '123', 'password_confirm': '123',
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('email', res.data)

    def test_register_password_mismatch(self):
        res = self.client.post('/api/v1/auth/register/', {
            'email': 'x@test.com', 'full_name': 'X', 'password': self.password, 'password_confirm': 'otra-cosa-123',
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('password_confirm', res.data)

    def test_login_case_insensitive_and_generic_error(self):
        self.make_user('ana')
        ok = self.client.post('/api/v1/auth/login/', {'email': 'ANA@test.com', 'password': self.password}, format='json')
        self.assertEqual(ok.status_code, 200, ok.data)
        self.assertEqual(ok.data['user']['email'], 'ana@test.com')

        wrong_pass = self.client.post('/api/v1/auth/login/', {'email': 'ana@test.com', 'password': 'mal'}, format='json')
        no_user = self.client.post('/api/v1/auth/login/', {'email': 'nadie@test.com', 'password': 'mal'}, format='json')
        self.assertEqual(wrong_pass.status_code, 401)
        self.assertEqual(wrong_pass.data, no_user.data)  # no revela si el email existe

    def test_protected_endpoint_requires_token(self):
        self.assertEqual(self.client.get('/api/v1/auth/me/').status_code, 401)

    def test_me_and_update_name(self):
        user = self.make_user('ana')
        self.as_user(user)
        res = self.client.patch('/api/v1/auth/me/', {'full_name': 'Ana María', 'email': 'otro@test.com'}, format='json')
        self.assertEqual(res.status_code, 200)
        user.refresh_from_db()
        self.assertEqual(user.full_name, 'Ana María')
        self.assertEqual(user.email, 'ana@test.com')  # el email no se cambia por acá

    def test_logout_blacklists_refresh(self):
        self.make_user('ana')
        login = self.client.post('/api/v1/auth/login/', {'email': 'ana@test.com', 'password': self.password}, format='json')
        refresh = login.data['tokens']['refresh']
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['tokens']['access']}")
        self.assertEqual(self.client.post('/api/v1/auth/logout/', {'refresh': refresh}, format='json').status_code, 204)
        self.client.credentials()
        res = self.client.post('/api/v1/auth/refresh/', {'refresh': refresh}, format='json')
        self.assertEqual(res.status_code, 401)

    def test_change_password(self):
        user = self.make_user('ana')
        self.as_user(user)
        bad = self.client.post('/api/v1/auth/change-password/', {'current_password': 'x', 'new_password': 'Nueva-Clave-2026'}, format='json')
        self.assertEqual(bad.status_code, 400)
        ok = self.client.post('/api/v1/auth/change-password/', {'current_password': self.password, 'new_password': 'Nueva-Clave-2026'}, format='json')
        self.assertEqual(ok.status_code, 200)
        self.assertIn('access', ok.data['tokens'])  # tokens nuevos para esta sesión
        user.refresh_from_db()
        self.assertTrue(user.check_password('Nueva-Clave-2026'))
