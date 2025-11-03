
import json
import bcrypt
from django.contrib.auth.hashers import check_password
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render
from django.views.generic import CreateView, ListView, DeleteView
from requests import Response
from tasksManager.serializer import Tasks_Tables_Serializer
from user.models import User
from management.models import TasksTable
from django.views import View
# Create your views here.


class Get_Users(ListView):
    model = User

    def get(self, request, *args, **kwargs):
        all_users = User.objects.all().values()
        return JsonResponse(list(all_users), safe=False)

class Create_User(CreateView):
    model = User

    def post(self, request, *args, **kwargs):
        #request por postman
        #mail = request.POST.get('mail')
        #password = request.POST.get('password')
        #confirm_password = request.POST.get('confirm_password')

        #request por JSON

        data = json.loads(request.body)
        mail = data.get('mail')
        username = data.get('username')
        password = data.get('password') 
        confirm_password = data.get('confirmPassword')
        check_if_exists = User.objects.filter(mail=mail)

        print(password, ' ', confirm_password)

        if check_if_exists:
            return HttpResponse(200)
        elif password != confirm_password:
            return HttpResponse(200)
        else:
            encoded_pass = bytes(password, 'UTF-8')
            salt = bcrypt.gensalt()
            hashed_pass = bcrypt.hashpw(encoded_pass, salt)
            save_user = User.objects.create(mail=mail, username=username, password=hashed_pass)
            save_user.save()

            return HttpResponse(200)
        

class Get_Credentials(View):

    def get(self, request, *args, **kwargs):
        user_mail = kwargs.get('mail')
        get_password = kwargs.get('password')

        # Buscar el usuario
        try:
            user_data = User.objects.get(mail=user_mail)
        except User.DoesNotExist:
            return HttpResponse('Usuario no encontrado', status=404)

        stored_password = user_data.password
        # bcrypt espera bytes
        if isinstance(stored_password, str):
            stored_password = stored_password.encode('utf-8')

        # Verificar contraseña
        if bcrypt.checkpw(get_password.encode('utf-8'), stored_password):
            # Obtener las tareas del usuario
            tasks = TasksTable.objects.filter(user_code=user_data.id)
            serializer = Tasks_Tables_Serializer(tasks, many=True)

            return JsonResponse({
                'user': {
                    'id': user_data.id,
                    'mail': user_data.mail,
                    'username': user_data.username
                },
                'tasks': serializer.data
            }, safe=False)
        else:
            return HttpResponse('Contraseña incorrecta', status=401)

    


class Delete_User(DeleteView):
    model = User

    def delete(self, request, *args, **kwargs):
        user_id = kwargs['id']
        User.objects.filter(id=user_id).delete()
        return HttpResponse(200)
    

#hacer una view de olvide mi contraseña
