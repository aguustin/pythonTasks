from datetime import timedelta

from django.utils import timezone

from boards.models import BoardMember, Task
from tests.helpers import BaseAPITest
from workspaces.models import Invitation, Membership, OrgRole


class OrganizationTests(BaseAPITest):
    def setUp(self):
        self.owner = self.make_user('owner')
        self.admin = self.make_user('admin')
        self.member = self.make_user('member')
        self.outsider = self.make_user('outsider')
        self.org = self.make_org(self.owner)
        self.add_member(self.org, self.admin, OrgRole.ADMIN)
        self.member_ms = self.add_member(self.org, self.member)

    def test_create_org_makes_creator_owner(self):
        self.as_user(self.outsider)
        res = self.client.post('/api/v1/organizations/', {'name': 'Tienda Norte'}, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['my_role'], 'owner')
        self.assertEqual(res.data['members_count'], 1)

    def test_user_can_belong_to_several_orgs_and_only_sees_own(self):
        other = self.make_org(self.member, 'Otra empresa')
        self.as_user(self.member)
        ids = {o['id'] for o in self.client.get('/api/v1/organizations/').data}
        self.assertEqual(ids, {self.org.id, other.id})
        self.as_user(self.outsider)
        self.assertEqual(self.client.get('/api/v1/organizations/').data, [])

    def test_outsider_gets_404(self):
        self.as_user(self.outsider)
        self.assertEqual(self.client.get(f'/api/v1/organizations/{self.org.id}/').status_code, 404)
        self.assertEqual(self.client.get(f'/api/v1/organizations/{self.org.id}/members/').status_code, 404)

    def test_member_cannot_rename_admin_can(self):
        self.as_user(self.member)
        self.assertEqual(self.client.patch(f'/api/v1/organizations/{self.org.id}/', {'name': 'X'}, format='json').status_code, 403)
        self.as_user(self.admin)
        self.assertEqual(self.client.patch(f'/api/v1/organizations/{self.org.id}/', {'name': 'X'}, format='json').status_code, 200)

    def test_only_owner_deletes_org(self):
        self.as_user(self.admin)
        self.assertEqual(self.client.delete(f'/api/v1/organizations/{self.org.id}/').status_code, 403)
        self.as_user(self.owner)
        self.assertEqual(self.client.delete(f'/api/v1/organizations/{self.org.id}/').status_code, 204)

    def test_admin_manages_members_but_not_owner_or_other_admins(self):
        owner_ms = Membership.objects.get(organization=self.org, user=self.owner)
        admin2 = self.add_member(self.org, self.make_user('admin2'), OrgRole.ADMIN)
        self.as_user(self.admin)
        url = f'/api/v1/organizations/{self.org.id}/members/'
        self.assertEqual(self.client.patch(f'{url}{self.member_ms.id}/', {'role': 'admin'}, format='json').status_code, 200)
        self.assertEqual(self.client.patch(f'{url}{owner_ms.id}/', {'role': 'member'}, format='json').status_code, 403)
        self.assertEqual(self.client.delete(f'{url}{admin2.id}/').status_code, 403)

    def test_admin_cannot_promote_to_owner(self):
        self.as_user(self.admin)
        res = self.client.patch(f'/api/v1/organizations/{self.org.id}/members/{self.member_ms.id}/', {'role': 'owner'}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_last_owner_cannot_leave(self):
        self.as_user(self.owner)
        self.assertEqual(self.client.post(f'/api/v1/organizations/{self.org.id}/leave/').status_code, 400)
        self.as_user(self.member)
        self.assertEqual(self.client.post(f'/api/v1/organizations/{self.org.id}/leave/').status_code, 204)

    def test_removing_member_cleans_board_access_and_assignments(self):
        board = self.make_board(self.owner, self.org)
        self.client.post(f'/api/v1/boards/{board["id"]}/members/', {'user_id': self.member.id, 'role': 'editor'}, format='json')
        task = self.make_task(board['id'], assignee_ids=[self.member.id])
        self.as_user(self.owner)
        res = self.client.delete(f'/api/v1/organizations/{self.org.id}/members/{self.member_ms.id}/')
        self.assertEqual(res.status_code, 204)
        self.assertFalse(BoardMember.objects.filter(user=self.member).exists())
        self.assertFalse(Task.objects.get(pk=task['id']).assignees.exists())


class InvitationTests(BaseAPITest):
    def setUp(self):
        self.owner = self.make_user('owner')
        self.member = self.make_user('member')
        self.guest = self.make_user('guest')
        self.org = self.make_org(self.owner)
        self.add_member(self.org, self.member)
        self.url = f'/api/v1/organizations/{self.org.id}/invitations/'

    def invite(self, **data):
        self.as_user(self.owner)
        res = self.client.post(self.url, data, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        return res.data

    def test_only_managers_create_invitations(self):
        self.as_user(self.member)
        self.assertEqual(self.client.post(self.url, {}, format='json').status_code, 403)
        self.assertEqual(self.client.get(self.url).status_code, 403)

    def test_invite_link_flow(self):
        inv = self.invite(role='member')
        self.assertTrue(inv['url'].endswith(f"/invitacion/{inv['token']}"))

        self.client.force_authenticate(user=None)
        public = self.client.get(f"/api/v1/invitations/{inv['token']}/")
        self.assertEqual(public.status_code, 200)
        self.assertEqual(public.data['organization_name'], self.org.name)
        self.assertNotIn('token', public.data)

        self.as_user(self.guest)
        res = self.client.post(f"/api/v1/invitations/{inv['token']}/")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertTrue(Membership.objects.filter(organization=self.org, user=self.guest, role='member').exists())

        # Un solo uso
        other = self.make_user('other')
        self.as_user(other)
        self.assertEqual(self.client.post(f"/api/v1/invitations/{inv['token']}/").status_code, 400)

    def test_accept_requires_login(self):
        inv = self.invite()
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.post(f"/api/v1/invitations/{inv['token']}/").status_code, 401)

    def test_email_bound_invitation(self):
        inv = self.invite(email='guest@test.com')
        intruder = self.make_user('intruder')
        self.as_user(intruder)
        self.assertEqual(self.client.post(f"/api/v1/invitations/{inv['token']}/").status_code, 403)
        self.as_user(self.guest)
        self.assertEqual(self.client.post(f"/api/v1/invitations/{inv['token']}/").status_code, 201)

    def test_cannot_invite_existing_member_or_as_owner(self):
        self.as_user(self.owner)
        self.assertEqual(self.client.post(self.url, {'email': 'member@test.com'}, format='json').status_code, 400)
        self.assertEqual(self.client.post(self.url, {'role': 'owner'}, format='json').status_code, 400)

    def test_revoked_and_expired_invitations_fail(self):
        revoked = self.invite()
        self.as_user(self.owner)
        self.assertEqual(self.client.delete(f"{self.url}{revoked['id']}/").status_code, 204)
        expired = self.invite()
        Invitation.objects.filter(pk=expired['id']).update(expires_at=timezone.now() - timedelta(minutes=1))

        self.as_user(self.guest)
        for inv in (revoked, expired):
            self.assertEqual(self.client.post(f"/api/v1/invitations/{inv['token']}/").status_code, 400)

    def test_already_member_cannot_accept(self):
        inv = self.invite()
        self.as_user(self.member)
        self.assertEqual(self.client.post(f"/api/v1/invitations/{inv['token']}/").status_code, 400)
