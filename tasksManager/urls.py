"""
URL configuration for tasksManager project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from management import views_management
from user import views_user

urlpatterns = [
    path('admin/', admin.site.urls),
    path('get_all_users/', views_user.Get_Users.as_view(), name="get_all_users"),
    path('create_user/', csrf_exempt(views_user.Create_User.as_view()), name="create_user"),
    path('get_credentials/<str:mail>/<str:password>', views_user.Get_Credentials.as_view(), name="get_credentials"),
    path('delete_user/<int:id>', csrf_exempt(views_user.Delete_User.as_view()), name="delete_user"),



    path('get_tasks_tables/', views_management.get_Taks_Tables.as_view(), name="get_tasks_tables"),
    path('get_user_tables/<int:sessionId>', views_management.get_User_Tables.as_view(), name="get_user_tables"),
    path('get_table/<int:tableId>', views_management.get_Table_By_Id.as_view(), name="get_table_by_id"),
    path('get_one_table/<int:tableId>', views_management.get_One_Table.as_view(), name="get_table"),
    path('create_tasks_tables/', csrf_exempt(views_management.Create_Tasks_Tables.as_view()), name="create_tasks_tables"),
    path('update_tasks_table/', csrf_exempt(views_management.Update_Tasks_Table.as_view()), name="update_tasks_table"),
    path('delete_tasks_table/<int:taskTableId>', csrf_exempt(views_management.Delete_Tasks_Tables.as_view()), name="delete_tasks_table"),
    path('get_tasks/<int:tableId>', views_management.Get_Tasks.as_view(), name="get_tasks"),
    path('get_one_task/<int:taskId>', views_management.Get_One_Task.as_view(), name="get one task"),
    path('create_task/', csrf_exempt(views_management.Create_Tasks.as_view()), name="create_task"),
    path('update_tasks/', csrf_exempt(views_management.Update_Tasks.as_view()), name="update_task"),
    path('delete_tasks/<int:taskId>', csrf_exempt(views_management.Delete_Tasks.as_view()), name="delete_task"),
    #path('share_table/', csrf_exempt(views_management.Share_Table.as_view()), name="share_tables")
]