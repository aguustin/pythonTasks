from django.contrib.auth import password_validation
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from accounts.models import User
from accounts.services import token_user
from accounts.sessions import add_session_claims


class UserPublicSerializer(serializers.ModelSerializer):
    """Datos mínimos de un usuario, visibles para sus compañeros de organización."""

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name']
        read_only_fields = fields


class MeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'date_joined']
        read_only_fields = ['id', 'email', 'date_joined']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ['email', 'full_name', 'password', 'password_confirm']
        # Sin el validador automático de unicidad (distingue mayúsculas y tiene otro texto):
        # validate_email lo cubre sin distinguir mayúsculas y con el mensaje de producto.
        extra_kwargs = {'email': {'validators': []}}

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Ya existe una cuenta con este email.')
        return value

    def validate_full_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('El nombre es obligatorio.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({'password_confirm': 'Las contraseñas no coinciden.'})
        candidate = User(email=attrs['email'], full_name=attrs['full_name'])
        password_validation.validate_password(attrs['password'], candidate)
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class LoginSerializer(TokenObtainPairSerializer):
    """Login por email. Devuelve tokens + datos del usuario."""

    default_error_messages = {
        'no_active_account': 'Email o contraseña incorrectos.',
    }

    @classmethod
    def get_token(cls, user):
        return add_session_claims(super().get_token(user), user)  # ver accounts.sessions

    def validate(self, attrs):
        attrs[self.username_field] = attrs.get(self.username_field, '').strip().lower()
        data = super().validate(attrs)
        return {
            'user': MeSerializer(self.user).data,
            'tokens': {'access': data['access'], 'refresh': data['refresh']},
        }


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_current_password(self, value):
        if not self.context['request'].user.check_password(value):
            raise serializers.ValidationError('La contraseña actual no es correcta.')
        return value

    def validate_new_password(self, value):
        password_validation.validate_password(value, self.context['request'].user)
        return value


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=128)
    new_password = serializers.CharField(write_only=True)
    new_password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': 'Las contraseñas no coinciden.'})
        user = token_user(attrs['token'])
        if user is None:
            raise serializers.ValidationError({'token': 'Este enlace ya no es válido. Pedí uno nuevo.'})
        password_validation.validate_password(attrs['new_password'], user)
        return attrs
