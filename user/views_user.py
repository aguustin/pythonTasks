import json
import bcrypt
from django.http import HttpResponse, JsonResponse
from django.views.generic import ListView, DeleteView
from rest_framework_simplejwt.tokens import RefreshToken
from tasksManager.serializer import Tasks_Tables_Serializer
from user.models import User
from management.models import TasksTable
from django.views import View


def _make_tokens(user_id):
    refresh = RefreshToken()
    refresh['user_id'] = user_id
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


class Get_Users(ListView):
    model = User

    def get(self, request, *args, **kwargs):
        all_users = User.objects.all().values('id', 'mail', 'username')
        return JsonResponse(list(all_users), safe=False)


class Create_User(View):

    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
            mail = data.get('mail', '').strip()
            username = data.get('username', '').strip()
            password = data.get('password', '')
            confirm_password = data.get('confirmPassword', '')

            if not all([mail, username, password, confirm_password]):
                return JsonResponse({'error': 'Todos los campos son requeridos'}, status=400)

            if len(password) < 6:
                return JsonResponse({'error': 'La contraseña debe tener al menos 6 caracteres'}, status=400)

            if User.objects.filter(mail=mail).exists():
                return JsonResponse({'error': 'El mail ya está registrado'}, status=409)

            if password != confirm_password:
                return JsonResponse({'error': 'Las contraseñas no coinciden'}, status=400)

            salt = bcrypt.gensalt()
            hashed_pass = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

            User.objects.create(mail=mail, username=username, password=hashed_pass)
            return JsonResponse({'message': 'Usuario creado correctamente'}, status=201)

        except json.JSONDecodeError:
            return JsonResponse({'error': 'JSON inválido'}, status=400)
        except Exception as e:
            return JsonResponse({'error': 'Error interno del servidor'}, status=500)


class Get_Credentials(View):
    """Login: recibe mail y password via POST body — nunca en URL."""

    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
            user_mail = data.get('mail', '').strip()
            get_password = data.get('password', '')

            if not user_mail or not get_password:
                return JsonResponse({'error': 'Credenciales requeridas'}, status=400)

            get_user = list(User.objects.filter(mail=user_mail).values())

            if not get_user:
                return JsonResponse({'error': 'Usuario no encontrado'}, status=404)

            user_data = get_user[0]

            if not bcrypt.checkpw(get_password.encode(), user_data['password'].encode()):
                return JsonResponse({'error': 'Contraseña incorrecta'}, status=401)

            user_response = {
                'id': user_data['id'],
                'mail': user_data['mail'],
                'username': user_data['username'],
            }

            tables_qs = TasksTable.objects.filter(user_code=user_data['id'])
            serializer = Tasks_Tables_Serializer(tables_qs, many=True)

            return JsonResponse({
                'user': user_response,
                'tables': list(serializer.data),
                'tokens': _make_tokens(user_data['id']),
            }, safe=False)

        except json.JSONDecodeError:
            return JsonResponse({'error': 'JSON inválido'}, status=400)
        except Exception as e:
            return JsonResponse({'error': 'Error interno del servidor'}, status=500)


class Delete_User(DeleteView):
    model = User

    def delete(self, request, *args, **kwargs):
        user_id = kwargs['id']
        User.objects.filter(id=user_id).delete()
        return HttpResponse(status=200)
