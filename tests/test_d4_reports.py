"""D4 (quién crea proyectos) y reportes: que nadie cree de más ni vea números de proyectos ajenos."""
from boards.models import Column, Task
from tests.helpers import BaseAPITest
from workspaces.models import OrgRole


class ProjectCreationTests(BaseAPITest):
    def setUp(self):
        self.owner = self.make_user('owner')
        self.admin = self.make_user('admin')
        self.member = self.make_user('member')
        self.org = self.make_org(self.owner)
        self.add_member(self.org, self.admin, role=OrgRole.ADMIN)
        self.add_member(self.org, self.member)
        self.board = self.make_board(self.owner, self.org, visibility='organization')['id']

    def create(self, user):
        self.as_user(user)
        return self.client.post('/api/v1/boards/', {'organization': self.org.id, 'title': 'Nuevo'}, format='json').status_code

    def restrict(self, user=None):
        self.as_user(user or self.owner)
        return self.client.patch(f'/api/v1/organizations/{self.org.id}/', {'project_creation': 'managers'}, format='json')

    def test_members_create_by_default(self):
        self.assertEqual(self.create(self.member), 201)

    def test_restricted_only_managers_create_or_duplicate(self):
        self.assertEqual(self.restrict().status_code, 200)
        self.assertEqual(self.create(self.member), 403)
        self.as_user(self.member)
        dup = self.client.post(f'/api/v1/boards/{self.board}/duplicate/', {'title': 'Copia'}, format='json')
        self.assertEqual(dup.status_code, 403)
        self.assertEqual(self.create(self.admin), 201)
        self.assertEqual(self.create(self.owner), 201)

    def test_only_managers_change_the_setting(self):
        self.assertEqual(self.restrict(self.member).status_code, 403)
        self.assertEqual(self.restrict(self.admin).status_code, 200)

    def test_guest_can_be_invited(self):
        self.as_user(self.owner)
        res = self.client.post(f'/api/v1/organizations/{self.org.id}/invitations/', {'email': 'x@example.com', 'role': 'guest'}, format='json')
        self.assertEqual(res.status_code, 201, res.data)


class ReportTests(BaseAPITest):
    def setUp(self):
        self.owner = self.make_user('owner')
        self.member = self.make_user('member')
        self.org = self.make_org(self.owner)
        self.add_member(self.org, self.member)
        self.open = self.make_board(self.owner, self.org, visibility='organization', title='Abierto')['id']
        self.private = self.make_board(self.owner, self.org, visibility='private', title='Privado')['id']
        self.as_user(self.owner)
        for board in (self.open, self.private):
            task = self.make_task(board, title='T', assignee_ids=[self.owner.id])['id']
            done = Column.objects.get(board_id=board, is_done=True)
            res = self.client.post(f'/api/v1/tasks/{task}/move/', {'column': done.id, 'position': 0}, format='json')
            self.assertEqual(res.status_code, 200, res.data)

    def report(self, user, query=''):
        self.as_user(user)
        return self.client.get(f'/api/v1/organizations/{self.org.id}/reports/?weeks=4{query}')

    def test_counts_only_visible_projects(self):
        owner = self.report(self.owner).data
        self.assertEqual(owner['totals']['completed'], 2)
        self.assertEqual(sum(w['completed'] for w in owner['weeks']), 2)
        member = self.report(self.member).data
        self.assertEqual(member['totals']['completed'], 1)
        self.assertEqual([b['title'] for b in member['boards']], ['Abierto'])
        self.assertEqual(member['people'][0]['completed'], 1)

    def test_cannot_filter_or_export_a_hidden_project(self):
        self.assertEqual(self.report(self.member, f'&board={self.private}').status_code, 400)
        res = self.client.get(f'/api/v1/organizations/{self.org.id}/reports/completed/?weeks=4')
        self.assertEqual([t['project'] for t in res.data], ['Abierto'])

    def test_outsider_gets_404(self):
        outsider = self.make_user('outsider')
        self.assertEqual(self.report(outsider).status_code, 404)
        self.assertEqual(Task.objects.count(), 2)
