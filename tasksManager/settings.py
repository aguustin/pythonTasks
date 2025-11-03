import os
from pathlib import Path
import dj_database_url
import cloudinary
import cloudinary_storage

BASE_DIR = Path(__file__).resolve().parent.parent

# -----------------------------
# Seguridad
# -----------------------------
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'unsafe-default-key')
DEBUG = os.environ.get('DEBUG', 'False') == 'True'
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '*').split(',')

# -----------------------------
# Cloudinary (subida de imágenes)
# -----------------------------
cloudinary.config(
    cloud_name=os.environ.get('CLOUD_NAME', 'drmcrdf4r'),
    api_key=os.environ.get('CLOUD_API_KEY', '521116467426574'),
    api_secret=os.environ.get('CLOUD_API_SECRET', 'IyZYzTmTrxIpuEHp04kZ6lWk40g'),
    secure=True
)
DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'

# -----------------------------
# Aplicaciones
# -----------------------------
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'management',
    'user',
    'cloudinary',
    'cloudinary_storage',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'tasksManager.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'tasksManager.wsgi.application'

# -----------------------------
# Base de datos (PostgreSQL en Render)
# -----------------------------
DATABASES = {
    'default': dj_database_url.config(
        default=f'sqlite:///{BASE_DIR}/db.sqlite3',  # fallback local
        conn_max_age=600
    )
}

# -----------------------------
# Contraseñas y validación
# -----------------------------
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# -----------------------------
# Internacionalización
# -----------------------------
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# -----------------------------
# Archivos estáticos
# -----------------------------
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# -----------------------------
# CORS (permitir que el frontend consuma la API)
# -----------------------------
CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', 'https://pythontasks-front.onrender.com').split(',')
