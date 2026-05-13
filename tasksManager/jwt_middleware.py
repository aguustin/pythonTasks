from django.http import JsonResponse
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

# Rutas que no requieren autenticación
PUBLIC_PATHS = ('/get_credentials/', '/create_user/', '/admin/', '/token/refresh/')


class JWTAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # CORS preflight y rutas públicas pasan sin validación
        if request.method == 'OPTIONS' or request.path.startswith(PUBLIC_PATHS):
            return self.get_response(request)

        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return JsonResponse({'error': 'Autenticación requerida'}, status=401)

        try:
            token = AccessToken(auth_header.split(' ', 1)[1])
            request.user_id = token['user_id']
        except (TokenError, InvalidToken, KeyError):
            return JsonResponse({'error': 'Token inválido o expirado'}, status=401)

        return self.get_response(request)
