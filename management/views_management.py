import json
from django.http import HttpResponse, JsonResponse
from django.views import View
from django.views.generic import ListView, CreateView, UpdateView, DeleteView
from django.shortcuts import get_object_or_404
from django.forms.models import model_to_dict
from management.models import Comment, Tables_And_Users, Tasks, TasksTable
from tasksManager.serializer import CommentSerializer, Tables_And_Users_Serializer, Tasks_Tables_Serializer, Tasks_Serializer
from user.models import User


class get_Taks_Tables(ListView):
    model = TasksTable

    def get(self, request, *args, **kwargs):
        tables = TasksTable.objects.all().values()
        return JsonResponse(list(tables), safe=False)


class get_User_Tables(ListView):
    model = TasksTable

    def get(self, request, *args, **kwargs):
        user_id = kwargs['sessionId']
        user = get_object_or_404(User, id=user_id)
        tables = TasksTable.objects.filter(user_code=user).values()
        return JsonResponse(list(tables), safe=False)


class get_Table_By_Id(ListView):
    def get(self, request, *args, **kwargs):
        table_id = kwargs['tableId']
        table = TasksTable.objects.filter(id=table_id).values()
        return JsonResponse(list(table), safe=False)


class get_One_Table(ListView):
    model = TasksTable

    def get(self, request, *args, **kwargs):
        table_id = kwargs['tableId']
        tasks = Tasks.objects.filter(table_code=table_id)
        serializer = Tasks_Serializer(tasks, many=True)
        return JsonResponse(list(serializer.data), safe=False)


class Create_Tasks_Tables(View):
    def post(self, request, *args, **kwargs):
        try:
            user_id = request.POST.get('userId')
            title = request.POST.get('title', '').strip()
            color = request.POST.get('table_color', '')
            image = request.FILES.get('table_image')
            friends_raw = request.POST.get('friends')

            if not user_id or not title:
                return JsonResponse({'error': 'userId y title son requeridos'}, status=400)

            user = get_object_or_404(User, id=user_id)

            table = TasksTable.objects.create(
                user_code=user,
                title=title,
                table_image=image,
                table_color=color,
            )

            # Crear registros de tabla compartida para cada amigo
            if friends_raw:
                friends = json.loads(friends_raw)
                for friend_mail in friends:
                    if friend_mail:
                        Tables_And_Users.objects.create(
                            user_code=user,
                            table_code=table,
                            shared_by=user.username,
                            share_with=friend_mail,
                        )

            new_table = TasksTable.objects.filter(id=table.id).values()
            return JsonResponse(list(new_table), safe=False)

        except Exception as e:
            return JsonResponse({'error': 'Error al crear la tabla'}, status=500)


class Update_Tasks_Table(UpdateView):
    model = TasksTable

    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
            task_table_id = data.get('taskTableId')
            title = data.get('tableTitle', '').strip()

            if not task_table_id or not title:
                return JsonResponse({'error': 'taskTableId y tableTitle son requeridos'}, status=400)

            table = get_object_or_404(TasksTable, id=task_table_id)
            table.title = title
            table.save(update_fields=['title'])
            return HttpResponse(status=200)

        except json.JSONDecodeError:
            return JsonResponse({'error': 'JSON inválido'}, status=400)


class Delete_Tasks_Tables(DeleteView):
    model = TasksTable

    def delete(self, request, *args, **kwargs):
        task_table_id = kwargs['taskTableId']
        TasksTable.objects.filter(id=task_table_id).delete()
        return HttpResponse(status=200)


class Get_Tasks(ListView):
    model = Tasks

    def get(self, request, *args, **kwargs):
        table_id = kwargs['tableId']
        tasks = Tasks.objects.filter(table_code=table_id).values()
        return JsonResponse(list(tasks), safe=False)


class Get_One_Task(ListView):
    model = Tasks

    def get(self, request, *args, **kwargs):
        task_id = kwargs['taskId']
        task = Tasks.objects.filter(id=task_id).values()
        return JsonResponse(list(task), safe=False)


class Create_Tasks(CreateView):
    model = Tasks

    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
            table_id = data.get('table_id')
            title = data.get('title', '').strip()
            description = data.get('description', '')
            image_type = data.get('imageType')
            state = data.get('state')

            if not table_id or not title:
                return JsonResponse({'error': 'table_id y title son requeridos'}, status=400)

            table = get_object_or_404(TasksTable, id=table_id)
            task = Tasks.objects.create(
                table_code=table,
                title=title,
                description=description,
                imageType=image_type,
                state=state,
                due_date=data.get('due_date') or None,
            )
            return JsonResponse(model_to_dict(task), safe=False)

        except json.JSONDecodeError:
            return JsonResponse({'error': 'JSON inválido'}, status=400)
        except Exception as e:
            return JsonResponse({'error': 'Error al crear la tarea'}, status=500)


class Update_Tasks(UpdateView):
    model = Tasks

    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
            task_id = data.get('taskId')
            title = data.get('title', '').strip()
            description = data.get('description', '')
            image_type = data.get('imageType')
            state = data.get('state')

            if not task_id:
                return JsonResponse({'error': 'taskId es requerido'}, status=400)

            task = get_object_or_404(Tasks, id=task_id)
            task.title = title
            task.description = description
            task.imageType = image_type
            task.state = state
            task.due_date = data.get('due_date') or None
            task.save(update_fields=['title', 'description', 'imageType', 'state', 'due_date'])
            return HttpResponse(status=200)

        except json.JSONDecodeError:
            return JsonResponse({'error': 'JSON inválido'}, status=400)


class Delete_Tasks(DeleteView):
    model = Tasks

    def delete(self, request, *args, **kwargs):
        task_id = kwargs['taskId']
        Tasks.objects.filter(id=task_id).delete()
        return HttpResponse(status=200)


class Share_Table(CreateView):

    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
            sender_id = data.get('userSenderId')
            table_id = data.get('tableId')
            receiver_mail = data.get('userReceivesMail', '').strip()

            if not all([sender_id, table_id, receiver_mail]):
                return JsonResponse({'error': 'Faltan campos requeridos'}, status=400)

            sender = get_object_or_404(User, id=sender_id)
            table = get_object_or_404(TasksTable, id=table_id)

            Tables_And_Users.objects.create(
                user_code=sender,
                table_code=table,
                shared_by=sender.username,
                share_with=receiver_mail,
            )
            return HttpResponse(status=200)

        except json.JSONDecodeError:
            return JsonResponse({'error': 'JSON inválido'}, status=400)
        except Exception as e:
            return JsonResponse({'error': 'Error al compartir la tabla'}, status=500)


class Get_Shared_tables(ListView):

    def get(self, request, *args, **kwargs):
        user_id = kwargs['userId']
        user = get_object_or_404(User, id=user_id)

        # Retorna tablas recibidas por el usuario (compartidas con su mail)
        shared_with_me = Tables_And_Users.objects.filter(share_with=user.mail)
        serializer = Tables_And_Users_Serializer(shared_with_me, many=True)
        return JsonResponse(list(serializer.data), safe=False)


class Get_Comments(ListView):

    def get(self, request, *args, **kwargs):
        task_id = kwargs['taskId']
        comments = Comment.objects.filter(task_id=task_id).select_related('user')
        serializer = CommentSerializer(comments, many=True)
        return JsonResponse(list(serializer.data), safe=False)


class Create_Comment(View):

    def post(self, request, *args, **kwargs):
        try:
            data = json.loads(request.body)
            task_id = data.get('taskId')
            text = data.get('text', '').strip()

            if not task_id or not text:
                return JsonResponse({'error': 'taskId y text son requeridos'}, status=400)

            # user_id viene del token JWT via middleware
            task = get_object_or_404(Tasks, id=task_id)
            user = get_object_or_404(User, id=request.user_id)

            comment = Comment.objects.create(task=task, user=user, text=text)
            serializer = CommentSerializer(comment)
            return JsonResponse(serializer.data, safe=False, status=201)

        except json.JSONDecodeError:
            return JsonResponse({'error': 'JSON inválido'}, status=400)
        except Exception as e:
            return JsonResponse({'error': 'Error al crear el comentario'}, status=500)


class Delete_Comment(DeleteView):

    def delete(self, request, *args, **kwargs):
        comment_id = kwargs['commentId']
        # Solo el autor puede borrar su comentario
        comment = get_object_or_404(Comment, id=comment_id)
        if comment.user_id != request.user_id:
            return JsonResponse({'error': 'Sin permiso'}, status=403)
        comment.delete()
        return HttpResponse(status=200)
