from rest_framework.test import APITestCase

from accounts.models import User
from workspaces.models import Membership, OrgRole
from workspaces.services import create_organization


class BaseAPITest(APITestCase):
    password = 'Velatrix-Segura-2026'

    def make_user(self, name):
        return User.objects.create_user(email=f'{name}@test.com', password=self.password, full_name=name.title())

    def as_user(self, user):
        self.client.force_authenticate(user=user)

    def make_org(self, owner, name='Kiosco Centro'):
        return create_organization(owner, name)

    def add_member(self, org, user, role=OrgRole.MEMBER):
        return Membership.objects.create(organization=org, user=user, role=role)

    def make_board(self, user, org, **extra):
        self.as_user(user)
        res = self.client.post('/api/v1/boards/', {'organization': org.id, 'title': 'Tablero', **extra}, format='json')
        assert res.status_code == 201, res.data
        return res.data

    def columns(self, board_id):
        return self.client.get(f'/api/v1/boards/{board_id}/columns/').data

    def make_task(self, board_id, **data):
        res = self.client.post(f'/api/v1/boards/{board_id}/tasks/', {'title': 'Reponer góndola', **data}, format='json')
        assert res.status_code == 201, res.data
        return res.data
