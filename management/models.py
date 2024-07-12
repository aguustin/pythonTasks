import datetime
from django.db import models
from django.forms import model_to_dict
from user.models import User
# Create your models here.

class TasksTable(models.Model):
    user_code = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=50, default="")
    date = models.DateField(auto_now_add=True, null=True)
    #shared_by = models.IntegerField(null=True, blank=True)
    #share_with = models.EmailField(max_length= 50, default="")

    def __str__(self):
        return str(self.id)
    
    def toJSON(self):
        item = model_to_dict(self)
        item['user_code'] = self.user_code.toJSON()
        return item
    
    class Meta:
        db_table = 'TasksTable'
        ordering = ['id']


class Tasks(models.Model):
    table_code = models.ForeignKey(TasksTable ,on_delete=models.CASCADE)
    title = models.CharField(max_length=100, default="")
    description = models.TextField()
    imageType = models.IntegerField(null=False)
    state = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return str(self.id)
    
    def toJSON(self):
        item = model_to_dict(self)
        item['table_code'] = self.table_code.toJSON()
        item['icon'] = self.get_image()
        return item
    
    class Meta:
        db_table = 'Tasks'
        ordering = ['id']


class Tables_And_Users(models.Model):
    user_code = models.ForeignKey(User, on_delete=models.CASCADE)
    table_code = models.ForeignKey(TasksTable, on_delete=models.CASCADE)
    shared_by = models.CharField(max_length=50, default="")
    share_with = models.EmailField(max_length= 50, default="")

    def __str__(self):
        return str(self.id)
    
    def toJSON(self):
        item = model_to_dict(self)
        item['user_code'] = self.user_code.toJSON()
        item['table_code'] = self.table_code.toJSON()
        return item
    
    class Meta:
        db_table = 'Tables_and_Users'
        ordering = ['id']