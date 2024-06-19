import json
from django.http import HttpResponse, JsonResponse
from django.views.generic import ListView, CreateView, UpdateView, DeleteView
from django.shortcuts import render
from management.models import Tasks, TasksTable
from user.models import User

# Create your views here.
class get_Taks_Tables(ListView):
    model = TasksTable

    def get(self, request):
        get_Taks_Tables = TasksTable.objects.all().values()
        return JsonResponse(list(get_Taks_Tables), safe=False)

class Create_Tasks_Tables(CreateView):
    model = User
    model = TasksTable

    def post(self, request):
        data = json.loads(request.body)
        user_id = data.get('userId')
        title = data.get('title')
        date = data.get('date')
        get_user_instance = User.objects.get(id=user_id)
        print(get_user_instance)
        save_tasks_table = TasksTable.objects.create(user_code=get_user_instance, title=title, date=date)
        save_tasks_table.save()

        return HttpResponse(200)
    

class Update_Tasks_Table(UpdateView):
    model = TasksTable

    def post(self, request, *args, **kwargs):
        data = json.loads(request.body)
        task_table_id = data.get('taskTableId')
        title = data.get('title')
        date = data.get('date')
        task_table_instance = TasksTable.objects.get(id=task_table_id)
        task_table_instance.title = title
        task_table_instance.date = date
        task_table_instance.save(update_fields=['title', 'date'])
        
        return HttpResponse(200)

    
class Delete_Tasks_Tables(DeleteView):
    model = TasksTable

    def delete(self, request,*args,**kwargs):
        task_table_id = kwargs['taskTableId']
        TasksTable.objects.filter(id=task_table_id).delete()

        return HttpResponse(200)
    



class Create_Tasks(CreateView):
    model = Tasks

    def post(self, request):
        data = json.loads(request.body)
        table_id = data.get('table_id')
        title = data.get('title')
        description =  data.get('description')
        imageType = data.get('imageType')
        state = data.get('state')

        table_instance = TasksTable.objects.get(id=table_id)

        save_task = Tasks.objects.create(table_code=table_instance, title=title, description=description, imageType=imageType, state=state)
        save_task.save()

        return HttpResponse(200)
    

class Update_Tasks(UpdateView):
    model = Tasks

    def post(self, request, *args, **kwargs):
        data = json.loads(request.body)
        task_id = data.get('taskId')
        title = data.get('title')
        description =  data.get('description')
        imageType = data.get('imageType')
        state = data.get('state')
        task_instance = Tasks.objects.get(id=task_id)
        task_instance.title = title
        task_instance.description = description
        task_instance.imageType = imageType
        task_instance.state = state
        task_instance.save(update_fields=['title', 'description', 'imageType', 'state'])

        return HttpResponse(200)


class Delete_Tasks(DeleteView):
    model = Tasks

    def delete(self, request, *args,**kwargs):
        task_id = kwargs['taskId']
        Tasks.objects.filter(id=task_id).delete()

        return HttpResponse(200)