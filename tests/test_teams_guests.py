"""Equipos y rol Invitado: lo más delicado de permisos. Nunca dar acceso de más ni dejar asignaciones colgadas."""
from boards.models import BoardTeam, Task
from tests.helpers import BaseAPITest
from workspaces.models import Membership, OrgRole, Team, TeamMember


def assignees(task_id):
    return set(Task.objects.get(pk=task_id).assignees.values_list('pk', flat=True))


class GuestTests(BaseAPITest):
    def setUp(self):
        self.owner = self.make_user('owner')
        self.guest = self.make_user('guest')
        self.org = self.make_org(self.owner)
        self.add_member(self.org, self.guest, role=OrgRole.GUEST)
        self.open = self.make_board(self.owner, self.org, visibility='organization', title='Abierto')['id']
        self.shared = self.make_board(self.owner, self.org, visibility='private', title='Compartido')['id']
        self.as_user(self.owner)
        self.client.post(f'/api/v1/boards/{self.shared}/members/', {'user_id': self.guest.id, 'role': 'editor'}, format='json')

    def test_guest_only_sees_explicitly_shared_projects(self):
        self.as_user(self.guest)
        listed = [b['title'] for b in self.client.get(f'/api/v1/boards/?organization={self.org.id}').data]
        self.assertEqual(listed, ['Compartido'])
        self.assertEqual(self.client.get(f'/api/v1/boards/{self.open}/').status_code, 404)
        self.assertEqual(self.client.get(f'/api/v1/boards/{self.open}/tasks/').status_code, 404)
        self.assertEqual(self.client.get(f'/api/v1/search/?organization={self.org.id}&q=Abierto').data['projects'], [])
        self.assertEqual(self.client.get(f'/api/v1/boards/{self.shared}/').data['my_role'], 'editor')

    def test_guest_cannot_create_projects_nor_list_members_or_teams(self):
        self.as_user(self.guest)
        res = self.client.post('/api/v1/boards/', {'organization': self.org.id, 'title': 'X'}, format='json')
        self.assertEqual(res.status_code, 403)
        self.assertEqual(self.client.post(f'/api/v1/boards/{self.shared}/duplicate/', {'title': 'X'}, format='json').status_code, 403)
        self.assertEqual(self.client.get(f'/api/v1/organizations/{self.org.id}/members/').status_code, 403)
        self.assertEqual(self.client.get(f'/api/v1/organizations/{self.org.id}/teams/').status_code, 403)

    def test_member_demoted_to_guest_loses_open_projects_and_assignments(self):
        member = self.make_user('member')
        membership = self.add_member(self.org, member)
        self.as_user(self.owner)
        task = self.make_task(self.open, title='T', assignee_ids=[member.id])['id']
        res = self.client.patch(f'/api/v1/organizations/{self.org.id}/members/{membership.id}/', {'role': 'guest'}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(assignees(task), set())  # D18
        self.as_user(member)
        self.assertEqual(self.client.get(f'/api/v1/boards/{self.open}/').status_code, 404)

    def test_admin_can_manage_guests(self):
        admin = self.make_user('admin')
        self.add_member(self.org, admin, role=OrgRole.ADMIN)
        target = Membership.objects.get(organization=self.org, user=self.guest)
        self.as_user(admin)
        res = self.client.patch(f'/api/v1/organizations/{self.org.id}/members/{target.id}/', {'role': 'member'}, format='json')
        self.assertEqual(res.status_code, 200, res.data)


class TeamAccessTests(BaseAPITest):
    def setUp(self):
        self.owner = self.make_user('owner')
        self.ana = self.make_user('ana')
        self.guest = self.make_user('guest')
        self.org = self.make_org(self.owner)
        self.add_member(self.org, self.ana)
        self.add_member(self.org, self.guest, role=OrgRole.GUEST)
        self.board = self.make_board(self.owner, self.org, visibility='private', title='Privado')['id']
        self.as_user(self.owner)
        self.team = self.client.post(f'/api/v1/organizations/{self.org.id}/teams/', {'name': 'Ventas'}, format='json').data
        for u in (self.ana, self.guest):
            self.client.post(f"/api/v1/organizations/{self.org.id}/teams/{self.team['id']}/members/", {'user_id': u.id}, format='json')
        self.access = self.client.post(f'/api/v1/boards/{self.board}/teams/', {'team_id': self.team['id'], 'role': 'editor'}, format='json').data

    def role(self, user):
        self.as_user(user)
        res = self.client.get(f'/api/v1/boards/{self.board}/')
        return res.data['my_role'] if res.status_code == 200 else None

    def test_team_grants_access_including_guests(self):
        self.assertEqual(self.role(self.ana), 'editor')
        self.assertEqual(self.role(self.guest), 'editor')

    def test_effective_role_is_the_highest(self):
        self.as_user(self.owner)
        self.client.post(f'/api/v1/boards/{self.board}/members/', {'user_id': self.ana.id, 'role': 'viewer'}, format='json')
        self.assertEqual(self.role(self.ana), 'editor')  # equipo (editor) > directo (lector)
        self.as_user(self.owner)
        self.client.patch(f"/api/v1/boards/{self.board}/teams/{self.access['id']}/", {'role': 'viewer'}, format='json')
        self.assertEqual(self.role(self.ana), 'viewer')

    def test_leaving_team_removes_access_and_assignments(self):
        self.as_user(self.owner)
        task = self.make_task(self.board, title='T', assignee_ids=[self.ana.id])['id']
        res = self.client.delete(f"/api/v1/organizations/{self.org.id}/teams/{self.team['id']}/members/{self.ana.id}/")
        self.assertEqual(res.status_code, 204)
        self.assertIsNone(self.role(self.ana))
        self.assertEqual(assignees(task), set())

    def test_removing_team_access_or_deleting_team_prunes(self):
        self.as_user(self.owner)
        task = self.make_task(self.board, title='T', assignee_ids=[self.guest.id])['id']
        self.client.delete(f"/api/v1/boards/{self.board}/teams/{self.access['id']}/")
        self.assertIsNone(self.role(self.guest))
        self.assertEqual(assignees(task), set())
        # Volver a dar acceso y borrar el equipo: mismo efecto.
        self.as_user(self.owner)
        self.client.post(f'/api/v1/boards/{self.board}/teams/', {'team_id': self.team['id'], 'role': 'viewer'}, format='json')
        self.assertEqual(self.role(self.ana), 'viewer')
        self.as_user(self.owner)
        self.client.delete(f"/api/v1/organizations/{self.org.id}/teams/{self.team['id']}/")
        self.assertIsNone(self.role(self.ana))
        self.assertFalse(BoardTeam.objects.exists())

    def test_only_managers_manage_teams_and_teams_stay_in_their_org(self):
        self.as_user(self.ana)
        self.assertEqual(self.client.post(f'/api/v1/organizations/{self.org.id}/teams/', {'name': 'X'}, format='json').status_code, 403)
        self.assertEqual(self.client.get(f'/api/v1/organizations/{self.org.id}/teams/').status_code, 200)
        other_owner = self.make_user('other')
        other_org = self.make_org(other_owner, name='Otra')
        foreign = Team.objects.create(organization=other_org, name='Ajeno')
        self.as_user(self.owner)
        res = self.client.post(f'/api/v1/boards/{self.board}/teams/', {'team_id': foreign.id, 'role': 'admin'}, format='json')
        self.assertEqual(res.status_code, 400)
        # Agregar a un equipo a alguien que no es de la organización: rechazado.
        res = self.client.post(f"/api/v1/organizations/{self.org.id}/teams/{self.team['id']}/members/", {'user_id': other_owner.id}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_leaving_org_removes_team_membership(self):
        membership = Membership.objects.get(organization=self.org, user=self.ana)
        self.as_user(self.owner)
        self.client.delete(f'/api/v1/organizations/{self.org.id}/members/{membership.id}/')
        self.assertFalse(TeamMember.objects.filter(user=self.ana).exists())
