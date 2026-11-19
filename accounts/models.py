from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError('El email es obligatorio')
        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        if not extra_fields['is_staff'] or not extra_fields['is_superuser']:
            raise ValueError('El superusuario debe tener is_staff e is_superuser en True')
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    """Usuario que inicia sesión con email. No usa `username`."""

    username = None
    first_name = None
    last_name = None

    email = models.EmailField('email', unique=True)
    full_name = models.CharField('nombre completo', max_length=150)
    # Versión de sesión: cada token lleva la versión con la que se emitió (claim `sv`).
    # Incrementarla invalida todos los tokens anteriores ("cerrar todas las sesiones",
    # cambio o recuperación de contraseña). Ver accounts.sessions.
    session_version = models.PositiveIntegerField(default=0, editable=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    objects = UserManager()

    class Meta:
        verbose_name = 'usuario'
        verbose_name_plural = 'usuarios'
        ordering = ['id']

    def __str__(self):
        return self.email

    def get_full_name(self):
        return self.full_name

    def get_short_name(self):
        return self.full_name.split(' ')[0] if self.full_name else self.email


class PasswordResetToken(models.Model):
    """
    Token de recuperación de contraseña. Se guarda solo el hash SHA-256:
    el token en claro existe únicamente en el enlace enviado por correo.
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token_hash = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    requested_ip = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        verbose_name = 'token de recuperación'
        verbose_name_plural = 'tokens de recuperación'
        ordering = ['-created_at']
        indexes = [models.Index(fields=['user', 'used_at'])]

    def __str__(self):
        return f'Recuperación de {self.user} ({self.created_at:%Y-%m-%d %H:%M})'
