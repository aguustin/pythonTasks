from django.contrib import admin

from boards.models import Activity, Board, BoardMember, Column, Comment, Task


class ColumnInline(admin.TabularInline):
    model = Column
    extra = 0


class BoardMemberInline(admin.TabularInline):
    model = BoardMember
    extra = 0
    autocomplete_fields = ['user']


@admin.register(Board)
class BoardAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'organization', 'visibility', 'created_by', 'created_at']
    list_filter = ['visibility']
    search_fields = ['title', 'organization__name']
    inlines = [ColumnInline, BoardMemberInline]


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'board', 'column', 'priority', 'due_date', 'completed_at']
    list_filter = ['priority']
    search_fields = ['title', 'board__title']
    autocomplete_fields = ['assignees']


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ['id', 'task', 'author', 'created_at']
    search_fields = ['text']


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ['id', 'board', 'actor', 'verb', 'created_at']
    list_filter = ['verb']
