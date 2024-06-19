
import json
import bcrypt
from django.contrib.auth.hashers import check_password
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render
from django.views.generic import CreateView, ListView, DeleteView
from requests import Response
from user.models import User

# Create your views here.

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
        password = data.get('password') 
        confirm_password = data.get('confirm_password')

        check_if_exists = User.objects.filter(mail=mail)

        if check_if_exists:
            return HttpResponse(200)
        elif password != confirm_password:
            return HttpResponse(200)
        else:
            print('entra aca')
            encoded_pass = bytes(password, 'UTF-8')
            salt = bcrypt.gensalt()
            hashed_pass = bcrypt.hashpw(encoded_pass, salt)

            save_user = User.objects.create(mail=mail, password=hashed_pass)
            save_user.save()

            return HttpResponse(200)
        


class Get_Credentials(ListView):
    model = User

    def get(self, request, *args, **kwargs):
        #data = json.loads(request.body)
        user_mail = kwargs['mail']
        post_password = kwargs['password']
        get_user = list(User.objects.filter(mail=user_mail).values())
        user_data = get_user[0]
        get_pass = user_data['password'] #encoded_pass = bytes(password, 'UTF-8')
    
        check_pass = check_password(post_password, get_pass)
        
        if check_pass:
            return JsonResponse(get_user, safe=False)
        else:
            return HttpResponse(400)
    


class Delete_User(DeleteView):
    model = User

    def delete(self, request, *args, **kwargs):
        user_id = kwargs['id']
        User.objects.filter(id=user_id).delete()
        return HttpResponse(200)
    

#hacer una view de olvide mi contraseña
