from django.db import models
from django.forms import model_to_dict
from user.models import User


class TasksTable(models.Model):
    user_code = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=50, default="")
    date = models.DateField(auto_now_add=True, null=True)
    table_image = models.FileField(upload_to='tasks', null=True, blank=True)
    table_color = models.CharField(max_length=8, default="")

    def __str__(self):
        return str(self.id)

    def get_image(self):
        return self.table_image.url if self.table_image else None

    def toJSON(self):
        item = model_to_dict(self)
        item['user_code'] = self.user_code.toJSON()
        item['table_image'] = self.get_image()
        return item

    class Meta:
        db_table = 'TasksTable'
        ordering = ['id']


class Tasks(models.Model):
    table_code = models.ForeignKey(TasksTable, on_delete=models.CASCADE)
    title = models.CharField(max_length=100, default="")
    description = models.TextField()
    imageType = models.IntegerField(null=False)
    state = models.IntegerField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return str(self.id)

    def get_image(self):
        icons = {0: 'coffee', 1: 'speech-bubble', 2: 'stack-of-books',
                 3: 'stopwatch', 4: 'student', 5: 'treadmill'}
        return icons.get(self.imageType)

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
    table_image = models.FileField(upload_to='tasks', default="", null=True, blank=True)
    table_color = models.CharField(max_length=8, default="")
    shared_by = models.CharField(max_length=50, default="")
    share_with = models.EmailField(max_length=50, default="")

    def __str__(self):
        return str(self.id)

    def get_image(self):
        return self.table_image.url if self.table_image else None

    def toJSON(self):
        item = model_to_dict(self)
        item['user_code'] = self.user_code.toJSON()
        item['table_code'] = self.table_code.toJSON()
        item['table_image'] = self.get_image()
        return item

    class Meta:
        db_table = 'Tables_and_Users'
        ordering = ['id']


class Comment(models.Model):
    task = models.ForeignKey(Tasks, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Comment {self.id} on Task {self.task_id}'

    class Meta:
        db_table = 'Comments'
        ordering = ['created_at']
