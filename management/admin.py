from django.contrib import admin

from management.models import Tasks, TasksTable, Tables_And_Users

# Register your models here.

class TasksTableAdmin(admin.ModelAdmin):
    list_display = [
        'user_code',
        'title',
        'date',
        'table_image',
        'table_color'
    ]

admin.site.register(TasksTable, TasksTableAdmin)

class TasksAdmin(admin.ModelAdmin):
    list_display = [
        'table_code',
        'title',
        'description',
        'imageType',
        'state'
    ]

admin.site.register(Tasks, TasksAdmin)


class TablesAndUsersAdmin(admin.ModelAdmin):
    list_display = [
        'user_code',
        'table_code',
        'table_image',
        'table_color',
        'shared_by',
        'share_with'
    ]

admin.site.register(Tables_And_Users, TablesAndUsersAdmin)