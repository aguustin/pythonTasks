from django.urls import path
from rest_framework.routers import SimpleRouter

from workspaces import views

router = SimpleRouter()
router.register('organizations', views.OrganizationViewSet, basename='organization')

members_list = views.MembershipViewSet.as_view({'get': 'list'})
members_detail = views.MembershipViewSet.as_view({'patch': 'partial_update', 'delete': 'destroy'})
invitations_list = views.InvitationViewSet.as_view({'get': 'list', 'post': 'create'})
invitations_detail = views.InvitationViewSet.as_view({'delete': 'destroy'})

urlpatterns = router.urls + [
    path('organizations/<int:org_pk>/members/', members_list, name='org-members'),
    path('organizations/<int:org_pk>/members/<int:pk>/', members_detail, name='org-member-detail'),
    path('organizations/<int:org_pk>/members/<int:pk>/impact/',
         views.MembershipViewSet.as_view({'get': 'impact'}), name='org-member-impact'),
    path('organizations/<int:org_pk>/invitations/', invitations_list, name='org-invitations'),
    path('organizations/<int:org_pk>/invitations/<int:pk>/', invitations_detail, name='org-invitation-detail'),
    path('invitations/<str:token>/', views.PublicInvitationView.as_view(), name='invitation-public'),
]
