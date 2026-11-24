from datetime import timedelta

from django.utils import timezone

from boards.models import Activity, Task
from tests.helpers import BaseAPITest
from workspaces.models import OrgRole


def task_assignees(task_id):
    return set(Task.objects.get(pk=task_id).assignees.values_list('pk', flat=True))


class ProjectLifecycleTests(BaseAPITest):
    def setUp(self):
        self.owner = self.make_user('owner')
        self.editor = self.make_user('editor')
        self.org = self.make_org(self.owner)
        self.add_member(self.org, self.editor)
        self.board = self.make_board(self.owner, self.org, visibility='organization', organization_role='editor')
        self.bid = self.board['id']
        self.cols = self.columns(self.bid)

    def test_new_fields_and_progress(self):
        today = timezone.localdate()
        res = self.client.patch(f'/api/v1/boards/{self.bid}/', {
            'status': 'on_hold', 'start_date': str(today), 'due_date': str(today + timedelta(days=30)),
        }, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['status'], 'on_hold')

        self.make_task(self.bid, title='Vencida', due_date=str(today - timedelta(days=2)))
        done = self.make_task(self.bid, title='Hecha', due_date=str(today - timedelta(days=2)))
        self.client.post(f"/api/v1/tasks/{done['id']}/move/", {'column': self.cols[2]['id']}, format='json')
        self.make_task(self.bid, title='Sin fecha')

        listed = self.client.get(f'/api/v1/boards/?organization={self.org.id}').data[0]
        self.assertEqual((listed['tasks_total'], listed['tasks_done'], listed['tasks_overdue']), (3, 1, 1))

    def test_list_includes_explicit_leads(self):
        self.client.post(f'/api/v1/boards/{self.bid}/members/', {'user_id': self.editor.id, 'role': 'admin'}, format='json')
        listed = self.client.get(f'/api/v1/boards/?organization={self.org.id}').data[0]
        self.assertEqual({u['id'] for u in listed['leads']}, {self.owner.id, self.editor.id})
        detail = self.client.get(f'/api/v1/boards/{self.bid}/').data
        self.assertEqual(len(detail['leads']), 2)

    def test_due_date_not_before_start(self):
        res = self.client.patch(f'/api/v1/boards/{self.bid}/', {'start_date': '2026-12-10', 'due_date': '2026-12-01'},
                                format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('due_date', res.data)

    def test_archive_hides_blocks_writes_and_restore(self):
        task = self.make_task(self.bid, assignee_ids=[self.editor.id])
        self.assertEqual(self.client.post(f'/api/v1/boards/{self.bid}/archive/').status_code, 200)

        self.assertEqual(self.client.get('/api/v1/boards/').data, [])
        archived = self.client.get('/api/v1/boards/?archived=true').data
        self.assertEqual([b['id'] for b in archived], [self.bid])
        self.assertIsNotNone(archived[0]['archived_at'])
        self.assertEqual(self.client.get(f'/api/v1/boards/{self.bid}/tasks/').status_code, 200)  # se puede leer

        tid = task['id']
        blocked = [
            self.client.patch(f'/api/v1/boards/{self.bid}/', {'title': 'X'}, format='json'),
            self.client.post(f'/api/v1/boards/{self.bid}/tasks/', {'title': 'X'}, format='json'),
            self.client.patch(f'/api/v1/tasks/{tid}/', {'title': 'X'}, format='json'),
            self.client.post(f'/api/v1/tasks/{tid}/move/', {'column': self.cols[1]['id']}, format='json'),
            self.client.post(f'/api/v1/tasks/{tid}/comments/', {'text': 'Hola'}, format='json'),
            self.client.post(f'/api/v1/boards/{self.bid}/columns/', {'name': 'X'}, format='json'),
            self.client.delete(f'/api/v1/tasks/{tid}/'),
        ]
        self.assertEqual({r.status_code for r in blocked}, {403})

        self.as_user(self.editor)
        self.assertEqual(self.client.get('/api/v1/my-tasks/').data['count'], 0)  # fuera de Mis tareas
        self.assertEqual(self.client.post(f'/api/v1/boards/{self.bid}/restore/').status_code, 403)  # solo el líder

        self.as_user(self.owner)
        self.assertEqual(self.client.post(f'/api/v1/boards/{self.bid}/restore/').status_code, 200)
        self.assertEqual(self.client.patch(f'/api/v1/tasks/{tid}/', {'title': 'Ok'}, format='json').status_code, 200)
        verbs = set(Activity.objects.filter(board_id=self.bid).values_list('verb', flat=True))
        self.assertTrue({'board_archived', 'board_restored'} <= verbs)

    def test_archived_project_can_be_deleted(self):
        self.client.post(f'/api/v1/boards/{self.bid}/archive/')
        self.assertEqual(self.client.delete(f'/api/v1/boards/{self.bid}/').status_code, 204)

    def test_favorites_are_personal(self):
        self.assertEqual(self.client.post(f'/api/v1/boards/{self.bid}/favorite/').status_code, 204)
        self.assertTrue(self.client.get('/api/v1/boards/').data[0]['is_favorite'])
        self.as_user(self.editor)
        self.assertFalse(self.client.get('/api/v1/boards/').data[0]['is_favorite'])
        self.as_user(self.owner)
        self.client.delete(f'/api/v1/boards/{self.bid}/favorite/')
        self.assertFalse(self.client.get('/api/v1/boards/').data[0]['is_favorite'])

    def test_activity_filter_by_task(self):
        a = self.make_task(self.bid, title='A')
        self.make_task(self.bid, title='B')
        self.client.post(f"/api/v1/tasks/{a['id']}/comments/", {'text': 'Hola'}, format='json')
        res = self.client.get(f"/api/v1/boards/{self.bid}/activity/?task={a['id']}")
        self.assertEqual({x['task'] for x in res.data['results']}, {a['id']})
        self.assertEqual(len(res.data['results']), 2)  # creada + comentario


class AssigneeAccessRuleTests(BaseAPITest):
    """D18: todo responsable tiene acceso al proyecto."""

    def setUp(self):
        self.owner = self.make_user('owner')
        self.ana = self.make_user('ana')
        self.luis = self.make_user('luis')
        self.org = self.make_org(self.owner)
        self.ana_ms = self.add_member(self.org, self.ana)
        self.add_member(self.org, self.luis)
        self.bid = self.make_board(self.owner, self.org, visibility='organization')['id']
        # Luis además es miembro explícito: no pierde acceso si el proyecto pasa a privado.
        self.client.post(f'/api/v1/boards/{self.bid}/members/', {'user_id': self.luis.id, 'role': 'editor'}, format='json')
        self.task = self.make_task(self.bid, assignee_ids=[self.ana.id, self.luis.id])

    def test_preview_does_not_change_anything(self):
        res = self.client.post(f'/api/v1/boards/{self.bid}/access-preview/', {'visibility': 'private'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual([a['user_id'] for a in res.data['affected']], [self.ana.id])
        self.assertEqual(res.data['tasks'], 1)
        self.assertEqual(task_assignees(self.task['id']), {self.ana.id, self.luis.id})

    def test_restricting_visibility_removes_assignees_without_access(self):
        self.client.patch(f'/api/v1/boards/{self.bid}/', {'visibility': 'private'}, format='json')
        self.assertEqual(task_assignees(self.task['id']), {self.luis.id})
        log = Activity.objects.get(board_id=self.bid, verb='assignees_removed')
        self.assertEqual(log.data['users'][0]['user_id'], self.ana.id)

    def test_removing_project_member_removes_assignments(self):
        self.client.patch(f'/api/v1/boards/{self.bid}/', {'visibility': 'private'}, format='json')
        member = self.client.get(f'/api/v1/boards/{self.bid}/members/').data
        luis_member = next(m for m in member if m['user']['id'] == self.luis.id)
        preview = self.client.post(f'/api/v1/boards/{self.bid}/access-preview/',
                                   {'remove_user_ids': [self.luis.id]}, format='json')
        self.assertEqual([a['user_id'] for a in preview.data['affected']], [self.luis.id])
        self.client.delete(f"/api/v1/boards/{self.bid}/members/{luis_member['id']}/")
        self.assertEqual(task_assignees(self.task['id']), set())

    def test_org_role_downgrade_prunes_private_projects(self):
        self.ana_ms.role = OrgRole.ADMIN
        self.ana_ms.save()
        private = self.make_board(self.owner, self.org)['id']  # privado; Ana lo ve por ser admin
        task = self.make_task(private, assignee_ids=[self.ana.id])
        url = f'/api/v1/organizations/{self.org.id}/members/{self.ana_ms.id}/'
        preview = self.client.get(f'{url}impact/?role=member')
        self.assertEqual(preview.status_code, 200)
        self.assertEqual([p['board_id'] for p in preview.data['projects']], [private])
        self.assertEqual(self.client.patch(url, {'role': 'member'}, format='json').status_code, 200)
        self.assertEqual(task_assignees(task['id']), set())
        self.assertEqual(task_assignees(self.task['id']), {self.ana.id, self.luis.id})  # el visible no cambia

    def test_impact_requires_manager_and_valid_params(self):
        url = f'/api/v1/organizations/{self.org.id}/members/{self.ana_ms.id}/impact/'
        self.assertEqual(self.client.get(url).status_code, 400)
        self.assertEqual(self.client.get(f'{url}?remove=true').status_code, 200)
        self.as_user(self.luis)
        self.assertEqual(self.client.get(f'{url}?role=admin').status_code, 403)


class HomeAndOrgActivityTests(BaseAPITest):
    def setUp(self):
        self.owner = self.make_user('owner')
        self.leader = self.make_user('leader')
        self.member = self.make_user('member')
        self.org = self.make_org(self.owner)
        self.add_member(self.org, self.leader)
        self.add_member(self.org, self.member)
        today = timezone.localdate()
        self.public = self.make_board(self.owner, self.org, visibility='organization', title='Público')['id']
        self.make_task(self.public, title='Vencida', due_date=str(today - timedelta(days=1)), assignee_ids=[self.member.id])
        self.make_task(self.public, title='Hoy', due_date=str(today), assignee_ids=[self.member.id], priority='urgent')
        self.make_task(self.public, title='Semana', due_date=str(today + timedelta(days=3)), assignee_ids=[self.member.id])
        self.make_task(self.public, title='Sin fecha', assignee_ids=[self.member.id])
        self.private = self.make_board(self.leader, self.org, title='Del líder')['id']  # privado, líder = leader

    def home(self, user):
        self.as_user(user)
        res = self.client.get(f'/api/v1/organizations/{self.org.id}/home/')
        self.assertEqual(res.status_code, 200, res.data)
        return res.data

    def test_member_counters_and_next_tasks(self):
        data = self.home(self.member)
        self.assertEqual(data['my'], {'open': 4, 'overdue': 1, 'today': 1, 'week': 2})
        self.assertEqual([t['title'] for t in data['next_tasks']], ['Vencida', 'Hoy', 'Semana', 'Sin fecha'])
        self.assertIsNone(data['overview'])

    def test_owner_sees_all_projects_and_workload(self):
        data = self.home(self.owner)
        titles = {p['title'] for p in data['overview']['projects']}
        self.assertEqual(titles, {'Público', 'Del líder'})
        load = data['overview']['workload']
        self.assertEqual(load[0]['user_id'], self.member.id)
        self.assertEqual((load[0]['open'], load[0]['overdue']), (4, 1))

    def test_leader_sees_only_led_projects(self):
        data = self.home(self.leader)
        self.assertEqual([p['title'] for p in data['overview']['projects']], ['Del líder'])

    def test_done_and_archived_projects_are_excluded(self):
        self.as_user(self.owner)
        self.client.patch(f'/api/v1/boards/{self.private}/', {'status': 'completed'}, format='json')
        self.client.post(f'/api/v1/boards/{self.public}/archive/')
        data = self.home(self.owner)
        self.assertEqual(data['overview']['projects'], [])
        self.assertEqual(self.home(self.member)['my']['open'], 0)

    def test_outsider_gets_404(self):
        outsider = self.make_user('outsider')
        self.as_user(outsider)
        self.assertEqual(self.client.get(f'/api/v1/organizations/{self.org.id}/home/').status_code, 404)
        self.assertEqual(self.client.get(f'/api/v1/organizations/{self.org.id}/activity/').status_code, 404)

    def test_org_activity_only_from_visible_projects(self):
        self.as_user(self.member)
        res = self.client.get(f'/api/v1/organizations/{self.org.id}/activity/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual({a['board_title'] for a in res.data['results']}, {'Público'})
        self.as_user(self.owner)
        res = self.client.get(f'/api/v1/organizations/{self.org.id}/activity/')
        self.assertEqual({a['board_title'] for a in res.data['results']}, {'Público', 'Del líder'})


class PeopleWithAccessTests(BaseAPITest):
    def setUp(self):
        self.owner = self.make_user('owner')
        self.editor = self.make_user('editor')
        self.member = self.make_user('member')
        self.outsider = self.make_user('outsider')
        self.org = self.make_org(self.owner)
        self.add_member(self.org, self.editor)
        self.add_member(self.org, self.member)
        self.make_org(self.outsider, 'Otra')
        self.bid = self.make_board(self.owner, self.org)['id']  # privado
        self.client.post(f'/api/v1/boards/{self.bid}/members/', {'user_id': self.editor.id, 'role': 'editor'}, format='json')

    def people(self):
        res = self.client.get(f'/api/v1/boards/{self.bid}/people/')
        self.assertEqual(res.status_code, 200)
        return {p['id']: p['role'] for p in res.data}

    def test_private_project_lists_only_people_with_access(self):
        self.assertEqual(self.people(), {self.owner.id: 'admin', self.editor.id: 'editor'})

    def test_organization_visibility_adds_everyone_with_org_role(self):
        self.client.patch(f'/api/v1/boards/{self.bid}/', {'visibility': 'organization', 'organization_role': 'viewer'}, format='json')
        self.assertEqual(self.people(), {self.owner.id: 'admin', self.editor.id: 'editor', self.member.id: 'viewer'})

    def test_requires_access(self):
        self.as_user(self.member)
        self.assertEqual(self.client.get(f'/api/v1/boards/{self.bid}/people/').status_code, 404)
        self.as_user(self.outsider)
        self.assertEqual(self.client.get(f'/api/v1/boards/{self.bid}/people/').status_code, 404)
