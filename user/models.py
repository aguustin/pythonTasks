from django.db import models
from django.forms import model_to_dict

# Create your models here.

class User(models.Model):
    mail = models.EmailField(max_length= 50, default="")
    password = models.CharField(max_length= 50, default="")

    def __str__(self):
        return str(self.id)
    
    def toJSON(self):
        item = model_to_dict(self)
        return item
    
    class Meta:
        db_table = 'Users'
        ordering = ['id']