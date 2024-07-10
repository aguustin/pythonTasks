from django.contrib import admin

from management.models import Tasks, TasksTable

# Register your models here.

class TasksTableAdmin(admin.ModelAdmin):
    list_display = [
        'user_code',
        'title',
        'date',
        'shared_by',
        'share_with'
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