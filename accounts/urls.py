from django.urls import path

from accounts import views

urlpatterns = [
    path('auth/register/', views.RegisterView.as_view(), name='auth-register'),
    path('auth/login/', views.LoginView.as_view(), name='auth-login'),
    path('auth/refresh/', views.RefreshView.as_view(), name='auth-refresh'),
    path('auth/logout/', views.LogoutView.as_view(), name='auth-logout'),
    path('auth/logout-all/', views.LogoutAllView.as_view(), name='auth-logout-all'),
    path('auth/me/', views.MeView.as_view(), name='auth-me'),
    path('auth/change-password/', views.ChangePasswordView.as_view(), name='auth-change-password'),
    path('auth/password-reset/', views.PasswordResetRequestView.as_view(), name='auth-password-reset'),
    path('auth/password-reset/confirm/', views.PasswordResetConfirmView.as_view(),
         name='auth-password-reset-confirm'),
]
