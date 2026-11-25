"""Permisos de los avisos: nunca revelar tareas de proyectos sin acceso."""
from notifications.models import Notification
from tests.helpers import BaseAPITest


class NotificationAccessTests(BaseAPITest):
    def setUp(self):
        self.owner = self.make_user('owner')
        self.ana = self.make_user('ana')
        self.outsider = self.make_user('outsider')
        self.org = self.make_org(self.owner)
        self.add_member(self.org, self.ana)
        self.add_member(self.org, self.outsider)
        # Privado: Ana es miembro; outsider no tiene acceso.
        self.board = self.make_board(self.owner, self.org, visibility='private')['id']
        self.as_user(self.owner)
        self.client.post(f'/api/v1/boards/{self.board}/members/', {'user_id': self.ana.id, 'role': 'editor'}, format='json')
        self.task = self.make_task(self.board, title='Pagar alquiler', assignee_ids=[self.ana.id])

    def inbox(self, user):
        self.as_user(user)
        return self.client.get(f'/api/v1/notifications/?organization={self.org.id}').data['results']

    def test_assignment_and_mentions_only_reach_people_with_access(self):
        self.assertEqual([n['verb'] for n in self.inbox(self.ana)], ['assigned'])
        self.as_user(self.owner)
        res = self.client.post(f"/api/v1/tasks/{self.task['id']}/comments/", {
            'text': '@Ana y @Outsider, revisen esto', 'mention_ids': [self.ana.id, self.outsider.id],
        }, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual([m['id'] for m in res.data['mentions']], [self.ana.id])  # outsider descartado
        self.assertEqual(self.inbox(self.outsider), [])
        self.assertEqual(Notification.objects.filter(recipient=self.outsider).count(), 0)
        self.assertEqual([n['verb'] for n in self.inbox(self.ana)][0], 'mentioned')

    def test_actor_is_not_notified_and_lost_access_hides_notifications(self):
        self.as_user(self.ana)
        self.client.post(f"/api/v1/tasks/{self.task['id']}/comments/", {'text': 'Listo'}, format='json')
        self.assertFalse(Notification.objects.filter(recipient=self.ana, verb='commented').exists())
        # Ana pierde el acceso: sus avisos dejan de verse (y la cuenta no los suma).
        self.as_user(self.owner)
        member = self.client.get(f'/api/v1/boards/{self.board}/members/').data
        mid = next(m['id'] for m in member if m['user']['id'] == self.ana.id)
        self.client.delete(f'/api/v1/boards/{self.board}/members/{mid}/')
        self.assertEqual(self.inbox(self.ana), [])
        self.as_user(self.ana)
        self.assertEqual(self.client.get(f'/api/v1/notifications/unread-count/?organization={self.org.id}').data['count'], 0)

    def test_followers_get_comments_and_completion(self):
        self.as_user(self.outsider)
        self.assertEqual(self.client.post(f"/api/v1/tasks/{self.task['id']}/follow/").status_code, 404)  # sin acceso
        self.as_user(self.owner)
        self.client.post(f"/api/v1/tasks/{self.task['id']}/follow/")
        self.as_user(self.ana)
        self.client.post(f"/api/v1/tasks/{self.task['id']}/comments/", {'text': 'Pagado'}, format='json')
        self.client.post(f"/api/v1/tasks/{self.task['id']}/complete/")
        self.assertEqual([n['verb'] for n in self.inbox(self.owner)], ['completed', 'commented'])
