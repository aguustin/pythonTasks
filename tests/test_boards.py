from datetime import timedelta

from django.utils import timezone

from boards.models import Activity, Column, Task
from tests.helpers import BaseAPITest
from workspaces.models import OrgRole


class BoardPermissionTests(BaseAPITest):
    def setUp(self):
        self.owner = self.make_user('owner')
        self.editor = self.make_user('editor')
        self.viewer = self.make_user('viewer')
        self.member = self.make_user('member')      # miembro de la org sin permiso en el tablero
        self.outsider = self.make_user('outsider')  # de otra organización
        self.org = self.make_org(self.owner)
        for u in (self.editor, self.viewer, self.member):
            self.add_member(self.org, u)
        self.make_org(self.outsider, 'Competencia')

        self.board = self.make_board(self.owner, self.org)  # privado por defecto
        self.bid = self.board['id']
        self.client.post(f'/api/v1/boards/{self.bid}/members/', {'user_id': self.editor.id, 'role': 'editor'}, format='json')
        self.client.post(f'/api/v1/boards/{self.bid}/members/', {'user_id': self.viewer.id, 'role': 'viewer'}, format='json')
        self.task = self.make_task(self.bid)

    def test_new_board_has_default_columns_and_creator_is_admin(self):
        self.as_user(self.owner)
        res = self.client.get(f'/api/v1/boards/{self.bid}/')
        self.assertEqual(res.data['my_role'], 'admin')
        self.assertEqual([c['name'] for c in res.data['columns']], ['Pendiente', 'En curso', 'Hecho'])
        self.assertTrue(Activity.objects.filter(board_id=self.bid, verb='board_created').exists())

    def test_private_board_hidden_from_other_members_and_outsiders(self):
        for user in (self.member, self.outsider):
            self.as_user(user)
            self.assertEqual(self.client.get('/api/v1/boards/').data, [])
            self.assertEqual(self.client.get(f'/api/v1/boards/{self.bid}/').status_code, 404)
            self.assertEqual(self.client.get(f'/api/v1/boards/{self.bid}/tasks/').status_code, 404)
            self.assertEqual(self.client.get(f"/api/v1/tasks/{self.task['id']}/").status_code, 404)
            self.assertEqual(self.client.get(f"/api/v1/tasks/{self.task['id']}/comments/").status_code, 404)
            self.assertEqual(self.client.delete(f"/api/v1/tasks/{self.task['id']}/").status_code, 404)

    def test_org_admin_is_board_admin_automatically(self):
        admin = self.make_user('orgadmin')
        self.add_member(self.org, admin, OrgRole.ADMIN)
        self.as_user(admin)
        self.assertEqual(self.client.get(f'/api/v1/boards/{self.bid}/').data['my_role'], 'admin')

    def test_organization_visibility_uses_organization_role(self):
        self.as_user(self.owner)
        self.client.patch(f'/api/v1/boards/{self.bid}/', {'visibility': 'organization', 'organization_role': 'viewer'}, format='json')
        self.as_user(self.member)
        self.assertEqual(self.client.get(f'/api/v1/boards/{self.bid}/').data['my_role'], 'viewer')
        self.assertEqual(self.client.post(f'/api/v1/boards/{self.bid}/tasks/', {'title': 'x'}, format='json').status_code, 403)
        # el outsider sigue sin ver nada
        self.as_user(self.outsider)
        self.assertEqual(self.client.get(f'/api/v1/boards/{self.bid}/').status_code, 404)

    def test_cannot_create_board_in_foreign_org(self):
        self.as_user(self.outsider)
        res = self.client.post('/api/v1/boards/', {'organization': self.org.id, 'title': 'Hack'}, format='json')
        self.assertEqual(res.status_code, 404)

    def test_viewer_reads_and_comments_but_cannot_edit(self):
        self.as_user(self.viewer)
        tid = self.task['id']
        self.assertEqual(self.client.get(f'/api/v1/boards/{self.bid}/tasks/').status_code, 200)
        self.assertEqual(self.client.post(f'/api/v1/tasks/{tid}/comments/', {'text': 'Visto'}, format='json').status_code, 201)
        self.assertEqual(self.client.patch(f'/api/v1/tasks/{tid}/', {'title': 'x'}, format='json').status_code, 403)
        self.assertEqual(self.client.delete(f'/api/v1/tasks/{tid}/').status_code, 403)
        self.assertEqual(self.client.post(f'/api/v1/boards/{self.bid}/tasks/', {'title': 'x'}, format='json').status_code, 403)

    def test_editor_manages_tasks_but_not_board(self):
        self.as_user(self.editor)
        self.make_task(self.bid, title='Nueva')
        self.assertEqual(self.client.patch(f"/api/v1/tasks/{self.task['id']}/", {'priority': 'urgent'}, format='json').status_code, 200)
        self.assertEqual(self.client.patch(f'/api/v1/boards/{self.bid}/', {'title': 'X'}, format='json').status_code, 403)
        self.assertEqual(self.client.delete(f'/api/v1/boards/{self.bid}/').status_code, 403)
        self.assertEqual(self.client.post(f'/api/v1/boards/{self.bid}/columns/', {'name': 'X'}, format='json').status_code, 403)
        self.assertEqual(self.client.post(f'/api/v1/boards/{self.bid}/members/', {'user_id': self.member.id}, format='json').status_code, 403)

    def test_board_member_must_belong_to_org(self):
        self.as_user(self.owner)
        res = self.client.post(f'/api/v1/boards/{self.bid}/members/', {'user_id': self.outsider.id}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_board_image_upload_multipart(self):
        import io
        import shutil
        import tempfile

        from django.core.files.uploadedfile import SimpleUploadedFile
        from django.test import override_settings
        from PIL import Image

        buf = io.BytesIO()
        Image.new('RGB', (10, 10), 'orange').save(buf, 'PNG')
        media = tempfile.mkdtemp()
        try:
            with override_settings(MEDIA_ROOT=media):
                self.as_user(self.owner)
                res = self.client.post('/api/v1/boards/', {
                    'organization': self.org.id, 'title': 'Con imagen',
                    'image': SimpleUploadedFile('tapa.png', buf.getvalue(), content_type='image/png'),
                }, format='multipart')
                self.assertEqual(res.status_code, 201, res.data)
                self.assertIn('boards/tapa', res.data['image'])
        finally:
            shutil.rmtree(media, ignore_errors=True)

    def test_board_admin_deletes_board(self):
        self.as_user(self.owner)
        self.assertEqual(self.client.delete(f'/api/v1/boards/{self.bid}/').status_code, 204)
        self.assertFalse(Task.objects.filter(pk=self.task['id']).exists())


class ColumnTests(BaseAPITest):
    def setUp(self):
        self.owner = self.make_user('owner')
        self.org = self.make_org(self.owner)
        self.bid = self.make_board(self.owner, self.org)['id']
        self.url = f'/api/v1/boards/{self.bid}/columns/'

    def test_max_six_columns(self):
        for i in range(3):
            self.assertEqual(self.client.post(self.url, {'name': f'Extra {i}'}, format='json').status_code, 201)
        res = self.client.post(self.url, {'name': 'Séptima'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(len(self.columns(self.bid)), 6)

    def test_delete_column_with_tasks_requires_move_to(self):
        cols = self.columns(self.bid)
        task = self.make_task(self.bid, column=cols[0]['id'])
        self.assertEqual(self.client.delete(f"{self.url}{cols[0]['id']}/").status_code, 400)
        res = self.client.delete(f"{self.url}{cols[0]['id']}/?move_to={cols[2]['id']}")
        self.assertEqual(res.status_code, 204)
        moved = Task.objects.get(pk=task['id'])
        self.assertEqual(moved.column_id, cols[2]['id'])
        self.assertIsNotNone(moved.completed_at)  # "Hecho" es columna terminada
        self.assertEqual([c['position'] for c in self.columns(self.bid)], [0, 1])

    def test_cannot_delete_last_column(self):
        cols = self.columns(self.bid)
        self.client.delete(f"{self.url}{cols[0]['id']}/")
        self.client.delete(f"{self.url}{cols[1]['id']}/")
        self.assertEqual(self.client.delete(f"{self.url}{cols[2]['id']}/").status_code, 400)

    def test_reorder_and_rename(self):
        ids = [c['id'] for c in self.columns(self.bid)]
        res = self.client.post(f'{self.url}reorder/', {'order': ids[::-1]}, format='json')
        self.assertEqual([c['id'] for c in res.data], ids[::-1])
        self.assertEqual(self.client.post(f'{self.url}reorder/', {'order': ids[:2]}, format='json').status_code, 400)
        res = self.client.patch(f'{self.url}{ids[0]}/', {'name': 'Pedidos'}, format='json')
        self.assertEqual(res.data['name'], 'Pedidos')

    def test_column_of_another_board_is_rejected(self):
        other_col = self.columns(self.make_board(self.owner, self.org)['id'])[0]['id']
        res = self.client.post(f'/api/v1/boards/{self.bid}/tasks/', {'title': 'x', 'column': other_col}, format='json')
        self.assertEqual(res.status_code, 400)


class TaskTests(BaseAPITest):
    def setUp(self):
        self.owner = self.make_user('owner')
        self.viewer = self.make_user('viewer')
        self.org = self.make_org(self.owner)
        self.add_member(self.org, self.viewer)
        self.bid = self.make_board(self.owner, self.org)['id']
        self.client.post(f'/api/v1/boards/{self.bid}/members/', {'user_id': self.viewer.id, 'role': 'viewer'}, format='json')
        self.cols = self.columns(self.bid)

    def test_create_defaults_to_first_column_with_positions(self):
        a = self.make_task(self.bid, title='A')
        b = self.make_task(self.bid, title='B')
        self.assertEqual(a['column'], self.cols[0]['id'])
        self.assertEqual((a['position'], b['position']), (0, 1))

    def test_move_between_columns_sets_completed_and_reindexes(self):
        a = self.make_task(self.bid, title='A')
        b = self.make_task(self.bid, title='B')
        done = self.cols[2]['id']
        res = self.client.post(f"/api/v1/tasks/{a['id']}/move/", {'column': done}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertIsNotNone(res.data['completed_at'])
        self.assertEqual(Task.objects.get(pk=b['id']).position, 0)

        res = self.client.post(f"/api/v1/tasks/{a['id']}/move/", {'column': self.cols[0]['id'], 'position': 0}, format='json')
        self.assertIsNone(res.data['completed_at'])
        order = list(Task.objects.filter(column_id=self.cols[0]['id']).order_by('position').values_list('title', flat=True))
        self.assertEqual(order, ['A', 'B'])

    def test_patch_cannot_change_column_directly(self):
        a = self.make_task(self.bid)
        res = self.client.patch(f"/api/v1/tasks/{a['id']}/", {'column': self.cols[1]['id']}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_viewer_can_move_only_assigned_tasks(self):
        mine = self.make_task(self.bid, title='Mía', assignee_ids=[self.viewer.id])
        other = self.make_task(self.bid, title='Ajena')
        self.as_user(self.viewer)
        done = self.cols[2]['id']
        self.assertEqual(self.client.post(f"/api/v1/tasks/{mine['id']}/move/", {'column': done}, format='json').status_code, 200)
        self.assertEqual(self.client.post(f"/api/v1/tasks/{other['id']}/move/", {'column': done}, format='json').status_code, 403)

    def test_assignee_must_have_board_access(self):
        stranger = self.make_user('stranger')
        no_access_member = self.make_user('noaccess')
        self.add_member(self.org, no_access_member)
        for user in (stranger, no_access_member):
            res = self.client.post(f'/api/v1/boards/{self.bid}/tasks/', {'title': 'x', 'assignee_ids': [user.id]}, format='json')
            self.assertEqual(res.status_code, 400)

    def test_filters(self):
        today = timezone.localdate()
        self.make_task(self.bid, title='Vencida', due_date=str(today - timedelta(days=1)), priority='high')
        self.make_task(self.bid, title='Hoy', due_date=str(today), assignee_ids=[self.owner.id])
        self.make_task(self.bid, title='Sin fecha')
        url = f'/api/v1/boards/{self.bid}/tasks/'
        titles = lambda q: {t['title'] for t in self.client.get(url + q).data}
        self.assertEqual(titles('?due=overdue'), {'Vencida'})
        self.assertEqual(titles('?due=today'), {'Hoy'})
        self.assertEqual(titles('?assignee=me'), {'Hoy'})
        self.assertEqual(titles('?priority=high'), {'Vencida'})
        self.assertEqual(titles('?q=fecha'), {'Sin fecha'})


class CommentAndMyTasksTests(BaseAPITest):
    def setUp(self):
        self.owner = self.make_user('owner')
        self.editor = self.make_user('editor')
        self.org = self.make_org(self.owner)
        self.add_member(self.org, self.editor)
        self.bid = self.make_board(self.owner, self.org)['id']
        self.client.post(f'/api/v1/boards/{self.bid}/members/', {'user_id': self.editor.id, 'role': 'editor'}, format='json')
        self.task = self.make_task(self.bid, assignee_ids=[self.editor.id])

    def test_comment_permissions(self):
        self.as_user(self.editor)
        c = self.client.post(f"/api/v1/tasks/{self.task['id']}/comments/", {'text': 'Listo'}, format='json').data
        self.assertEqual(self.client.patch(f"/api/v1/comments/{c['id']}/", {'text': 'Editado'}, format='json').status_code, 200)

        self.as_user(self.owner)
        self.assertEqual(self.client.patch(f"/api/v1/comments/{c['id']}/", {'text': 'No'}, format='json').status_code, 403)
        self.assertEqual(self.client.delete(f"/api/v1/comments/{c['id']}/").status_code, 204)  # admin del tablero

        own = self.client.post(f"/api/v1/tasks/{self.task['id']}/comments/", {'text': 'Del dueño'}, format='json').data
        self.as_user(self.editor)
        self.assertEqual(self.client.delete(f"/api/v1/comments/{own['id']}/").status_code, 403)

    def test_my_tasks_lists_open_assigned_across_orgs(self):
        other_org = self.make_org(self.editor, 'Segundo trabajo')
        other_board = self.make_board(self.editor, other_org)['id']
        self.make_task(other_board, title='En el otro local', assignee_ids=[self.editor.id])
        self.make_task(other_board, title='Sin asignar')
        done_col = Column.objects.filter(board_id=other_board, is_done=True).first()
        finished = self.make_task(other_board, title='Terminada', assignee_ids=[self.editor.id])
        self.client.post(f"/api/v1/tasks/{finished['id']}/move/", {'column': done_col.id}, format='json')

        res = self.client.get('/api/v1/my-tasks/')
        self.assertEqual(res.status_code, 200)
        titles = {t['title'] for t in res.data['results']}
        self.assertEqual(titles, {self.task['title'], 'En el otro local'})
        self.assertEqual(res.data['count'], 2)
        all_titles = {t['title'] for t in self.client.get('/api/v1/my-tasks/?status=all').data['results']}
        self.assertIn('Terminada', all_titles)
        only_other = self.client.get(f'/api/v1/my-tasks/?organization={other_org.id}').data
        self.assertEqual(only_other['count'], 1)

    def test_activity_log(self):
        self.as_user(self.owner)
        res = self.client.get(f'/api/v1/boards/{self.bid}/activity/')
        self.assertEqual(res.status_code, 200)
        verbs = [a['verb'] for a in res.data['results']]
        self.assertIn('task_created', verbs)
        self.assertIn('member_added', verbs)
