from django.urls import path
from rest_framework.routers import SimpleRouter

from workspaces import views
from workspaces.teams import TeamViewSet

router = SimpleRouter()
router.register('organizations', views.OrganizationViewSet, basename='organization')

members_list = views.MembershipViewSet.as_view({'get': 'list'})
members_detail = views.MembershipViewSet.as_view({'patch': 'partial_update', 'delete': 'destroy'})
invitations_list = views.InvitationViewSet.as_view({'get': 'list', 'post': 'create'})
invitations_detail = views.InvitationViewSet.as_view({'delete': 'destroy'})
teams_list = TeamViewSet.as_view({'get': 'list', 'post': 'create'})
teams_detail = TeamViewSet.as_view({'patch': 'partial_update', 'delete': 'destroy'})

urlpatterns = router.urls + [
    path('organizations/<int:org_pk>/members/', members_list, name='org-members'),
    path('organizations/<int:org_pk>/members/<int:pk>/', members_detail, name='org-member-detail'),
    path('organizations/<int:org_pk>/members/<int:pk>/impact/',
         views.MembershipViewSet.as_view({'get': 'impact'}), name='org-member-impact'),
    path('organizations/<int:org_pk>/invitations/', invitations_list, name='org-invitations'),
    path('organizations/<int:org_pk>/invitations/<int:pk>/', invitations_detail, name='org-invitation-detail'),
    path('organizations/<int:org_pk>/teams/', teams_list, name='org-teams'),
    path('organizations/<int:org_pk>/teams/<int:pk>/', teams_detail, name='org-team-detail'),
    path('organizations/<int:org_pk>/teams/<int:pk>/members/', TeamViewSet.as_view({'post': 'add_member'}), name='org-team-members'),
    path('organizations/<int:org_pk>/teams/<int:pk>/members/<int:user_id>/', TeamViewSet.as_view({'delete': 'remove_member'}),
         name='org-team-member-detail'),
    path('invitations/<str:token>/', views.PublicInvitationView.as_view(), name='invitation-public'),
]
