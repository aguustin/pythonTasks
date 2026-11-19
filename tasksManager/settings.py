"""
Configuración de Django para el backend de Velatrix.

Todo lo sensible o dependiente del entorno se lee de variables de entorno.
Ver README.md para la lista completa.
"""
import os
import sys
from datetime import timedelta
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Se aceptan ambas ubicaciones del .env (raíz o tasksManager/).
load_dotenv(BASE_DIR / '.env')
load_dotenv(BASE_DIR / 'tasksManager' / '.env')


def env_list(name, default=''):
    return [item.strip() for item in os.environ.get(name, default).split(',') if item.strip()]


# -----------------------------------------------------------------------------
# Seguridad
# -----------------------------------------------------------------------------
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

SECRET_KEY = os.environ.get('SECRET_KEY') or os.environ.get('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = 'dev-only-insecure-key-no-usar-en-produccion'
    else:
        raise ImproperlyConfigured('Falta la variable de entorno SECRET_KEY.')

ALLOWED_HOSTS = env_list('ALLOWED_HOSTS', '127.0.0.1,localhost')

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    # Render ya fuerza HTTPS en su proxy; se pueden activar acá si el hosting no lo hace.
    SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'False') == 'True'
    SECURE_HSTS_SECONDS = int(os.environ.get('SECURE_HSTS_SECONDS', '0'))

# -----------------------------------------------------------------------------
# Aplicaciones
# -----------------------------------------------------------------------------
CLOUDINARY_ENABLED = bool(os.environ.get('CLOUD_NAME'))

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'accounts',
    'workspaces',
    'boards',
]
if CLOUDINARY_ENABLED:
    INSTALLED_APPS += ['cloudinary_storage', 'cloudinary']

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
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
        'DIRS': [BASE_DIR / 'templates'],
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

# -----------------------------------------------------------------------------
# Base de datos — PostgreSQL si hay DATABASE_URL, si no SQLite local
# -----------------------------------------------------------------------------
_DATABASE_URL = os.environ.get('DATABASE_URL')
DATABASES = {
    'default': dj_database_url.config(
        default=f'sqlite:///{BASE_DIR / "db.sqlite3"}',
        conn_max_age=600,
        ssl_require=bool(_DATABASE_URL) and os.environ.get('DATABASE_SSL', 'True') == 'True',
    )
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# -----------------------------------------------------------------------------
# Usuarios y contraseñas
# -----------------------------------------------------------------------------
AUTH_USER_MODEL = 'accounts.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

TESTING = len(sys.argv) > 1 and sys.argv[1] == 'test'
if TESTING:
    # Hash rápido solo para tests (el de producción es lento a propósito).
    PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']

# -----------------------------------------------------------------------------
# Internacionalización
# -----------------------------------------------------------------------------
LANGUAGE_CODE = 'es'
TIME_ZONE = os.environ.get('TIME_ZONE', 'America/Argentina/Buenos_Aires')
USE_I18N = True
USE_TZ = True

# -----------------------------------------------------------------------------
# Archivos estáticos y subidos
# -----------------------------------------------------------------------------
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

STORAGES = {
    'default': {
        'BACKEND': (
            'cloudinary_storage.storage.MediaCloudinaryStorage'
            if CLOUDINARY_ENABLED
            else 'django.core.files.storage.FileSystemStorage'
        ),
    },
    'staticfiles': {
        'BACKEND': (
            'django.contrib.staticfiles.storage.StaticFilesStorage'
            if DEBUG
            else 'whitenoise.storage.CompressedManifestStaticFilesStorage'
        ),
    },
}

CLOUDINARY_STORAGE = {
    'CLOUD_NAME': os.environ.get('CLOUD_NAME'),
    'API_KEY': os.environ.get('CLOUD_API_KEY'),
    'API_SECRET': os.environ.get('CLOUD_API_SECRET'),
}

MAX_UPLOAD_IMAGE_MB = 5

# -----------------------------------------------------------------------------
# CORS
# -----------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = env_list(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3000,http://127.0.0.1:3000' if DEBUG else '',
)

# URL pública del frontend — se usa para armar los links de invitación.
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000').rstrip('/')

# -----------------------------------------------------------------------------
# Django REST Framework + JWT
# -----------------------------------------------------------------------------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'accounts.sessions.SessionJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'DEFAULT_PAGINATION_CLASS': 'tasksManager.pagination.StandardPagination',
    # Solo limita las vistas que declaran `throttle_scope`. Identifica por la IP real del
    # usuario, reenviada por el BFF (tasksManager.client_ip).
    'DEFAULT_THROTTLE_CLASSES': (
        'tasksManager.client_ip.ClientIPScopedRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'auth': os.environ.get('THROTTLE_AUTH', '10/min'),
        'invitation': os.environ.get('THROTTLE_INVITATION', '30/min'),
        'password_reset': os.environ.get('THROTTLE_PASSWORD_RESET', '10/hour'),
        'password_reset_email': os.environ.get('THROTTLE_PASSWORD_RESET_EMAIL', '3/hour'),
    },
}
if DEBUG:
    REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] += ('rest_framework.renderers.BrowsableAPIRenderer',)
if TESTING:
    REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
        scope: '1000/min' for scope in REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']
    }

SIMPLE_JWT = {
    # Access corto; el refresh rota con el uso y vence tras 7 días sin actividad (D24).
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=int(os.environ.get('JWT_ACCESS_MINUTES', '10'))),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=int(os.environ.get('JWT_REFRESH_DAYS', '7'))),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# Límite absoluto de una sesión desde el login, aunque se siga usando (D24).
SESSION_ABSOLUTE_DAYS = int(os.environ.get('SESSION_ABSOLUTE_DAYS', '30'))

# Secreto compartido con el BFF (servidor de Next.js). Solo con este secreto la API confía
# en la IP del usuario que reenvía el BFF. Vacío = no se confía en ninguna IP reenviada.
BFF_SHARED_SECRET = os.environ.get('BFF_SHARED_SECRET', '')

# -----------------------------------------------------------------------------
# Correo transaccional (Resend). Sin RESEND_API_KEY los correos se escriben en la consola.
# -----------------------------------------------------------------------------
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
EMAIL_BACKEND = (
    'tasksManager.email_backends.ResendEmailBackend'
    if RESEND_API_KEY
    else 'django.core.mail.backends.console.EmailBackend'
)
DEFAULT_FROM_EMAIL = os.environ.get('EMAIL_FROM', 'Velatrix One · Projects <no-reply@localhost>')
EMAIL_REPLY_TO = os.environ.get('EMAIL_REPLY_TO', '')
# En segundo plano después del commit; en tests, inmediato.
EMAIL_ASYNC = not TESTING
PASSWORD_RESET_MINUTES = 60

# -----------------------------------------------------------------------------
# Reglas de negocio
# -----------------------------------------------------------------------------
BOARD_MAX_COLUMNS = 6
INVITATION_EXPIRATION_DAYS = 7
