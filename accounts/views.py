import hashlib

from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts import services
from accounts.serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    LogoutSerializer,
    MeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
)
from accounts.sessions import SessionRefreshSerializer, issue_tokens, revoke_all_sessions
from tasksManager.client_ip import ClientIPScopedRateThrottle, client_ip
from tasksManager.mail import run_later


class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = RegisterSerializer
    throttle_scope = 'auth'

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {'user': MeSerializer(user).data, 'tokens': issue_tokens(user)},
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    throttle_scope = 'auth'


class RefreshView(TokenRefreshView):
    serializer_class = SessionRefreshSerializer


class LogoutView(APIView):
    """Cierra esta sesión: invalida el refresh token (queda en la blacklist)."""

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            RefreshToken(serializer.validated_data['refresh']).blacklist()
        except TokenError:
            pass  # ya inválido o vencido: el resultado para el cliente es el mismo
        return Response(status=status.HTTP_204_NO_CONTENT)


class LogoutAllView(APIView):
    """Cierra todas las sesiones del usuario, en todos los dispositivos (incluida esta)."""

    def post(self, request):
        revoke_all_sessions(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = MeSerializer
    http_method_names = ['get', 'patch']

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    """Cambia la contraseña, cierra las demás sesiones y devuelve tokens nuevos para esta."""

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        services.change_password(request.user, serializer.validated_data['new_password'])
        return Response({'tokens': issue_tokens(request.user)})


class PasswordResetEmailThrottle(SimpleRateThrottle):
    """Limita pedidos de recuperación por email (además del límite por IP)."""

    scope = 'password_reset_email'

    def get_cache_key(self, request, view):
        email = str(request.data.get('email', '')).strip().lower()
        if not email:
            return None
        return self.cache_format % {'scope': self.scope, 'ident': hashlib.sha256(email.encode()).hexdigest()}


RESET_REQUESTED = (
    'Si existe una cuenta con ese email, te enviamos un enlace para restablecer la contraseña. '
    'Revisá también el correo no deseado.'
)


class PasswordResetRequestView(APIView):
    """Siempre responde lo mismo y sin esperar el envío: no revela si la cuenta existe."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = 'password_reset'
    throttle_classes = [ClientIPScopedRateThrottle, PasswordResetEmailThrottle]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        run_later(services.request_password_reset, serializer.validated_data['email'], client_ip(request))
        return Response({'detail': RESET_REQUESTED}, status=status.HTTP_202_ACCEPTED)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = 'password_reset'

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.confirm_password_reset(
            serializer.validated_data['token'], serializer.validated_data['new_password']
        )
        return Response({'detail': 'Contraseña actualizada. Ya podés iniciar sesión.'})
