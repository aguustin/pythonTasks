from django.urls import path

from notifications import views

urlpatterns = [
    path('notifications/', views.NotificationListView.as_view(), name='notifications'),
    path('notifications/unread-count/', views.UnreadCountView.as_view(), name='notifications-unread-count'),
    path('notifications/read-all/', views.MarkReadView.as_view(), name='notifications-read-all'),
    path('notifications/<int:pk>/read/', views.MarkReadView.as_view(), name='notification-read'),
]
