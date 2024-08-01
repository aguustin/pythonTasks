
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
        


class Get_Credentials(ListView):
    model = User
    model = TasksTable

    def get(self, request, *args, **kwargs):
        #data = json.loads(request.body)
        user_mail = kwargs['mail']
        get_password = kwargs['password']
        get_user = list(User.objects.filter(mail=user_mail).values())
        print("dasdasdasdasdsad: ", get_user)
        user_data = get_user[0]
        get_pass = user_data['password']
        #encoded_pass = bytes(password, 'UTF-8')
        #check_pass = check_password(get_password, get_pass) no funciona bien
        
        #if check_pass:
        
        get_user_table_instance = TasksTable.objects.filter(user_code=user_data['id'])
        serializer = Tasks_Tables_Serializer(get_user_table_instance, many=True)
        print(serializer.data)
        return JsonResponse(get_user + serializer.data, safe=False)
        #else:
        return HttpResponse(200)
    


class Delete_User(DeleteView):
    model = User

    def delete(self, request, *args, **kwargs):
        user_id = kwargs['id']
        User.objects.filter(id=user_id).delete()
        return HttpResponse(200)
    

#hacer una view de olvide mi contraseña
