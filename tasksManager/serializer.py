from rest_framework import serializers
from management.models import Comment, Tasks, TasksTable, Tables_And_Users
from user.models import User


class User_Serializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'mail', 'username']


class Tasks_Tables_Serializer(serializers.ModelSerializer):
    user_code = User_Serializer()

    class Meta:
        model = TasksTable
        fields = ['id', 'user_code', 'title', 'date', 'table_image', 'table_color']


class Tasks_Serializer(serializers.ModelSerializer):
    table_code = Tasks_Tables_Serializer()

    class Meta:
        model = Tasks
        fields = ['id', 'table_code', 'title', 'description', 'imageType', 'state', 'due_date']


class Tables_And_Users_Serializer(serializers.ModelSerializer):
    table_code = Tasks_Tables_Serializer()
    user_code = User_Serializer()

    class Meta:
        model = Tables_And_Users
        fields = ['id', 'user_code', 'table_code', 'shared_by', 'share_with']


class CommentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'task_id', 'username', 'text', 'created_at']
