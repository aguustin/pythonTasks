from rest_framework import serializers
from management.models import Tasks, TasksTable, Tables_And_Users
from user.models import User

class User_Serializer(serializers.ModelSerializer):
      class Meta:
            model = User
            fields = ['id', 'mail', 'password']


class Tasks_Tables_Serializer(serializers.ModelSerializer):
      user_code = User_Serializer()

      class Meta:
            model = TasksTable
            fields = ['id', 'user_code', 'title', 'date']

class Tasks_Serializer(serializers.ModelSerializer):
      table_code = Tasks_Tables_Serializer()

      class Meta:
            model = Tasks
            fields = ['id', 'table_code', 'title', 'description', 'imageType', 'state']

class Tables_And_Users_Serializer(serializers.ModelSerializer):
      table_code = Tasks_Tables_Serializer()
      user_code = User_Serializer()

      class Meta:
          model = Tables_And_Users
          fields = ['id', 'user_code', 'table_code', 'shared_by', 'share_with']
   