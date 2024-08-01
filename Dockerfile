FROM python:3.10

ENV PYTHONDONTWRITEBYTECODE=1

ENV PYTHONUNBUFFERED=1

WORKDIR /dockerback

COPY requirements.txt .

RUN pip install -r requirements.txt && pip install --upgrade pip && pip install django-cors-headers && pip install djangorestframework && pip install django-bcrypt && pip install cloudinary

COPY . /dockerback

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]