from django.urls import path
from rest_framework.routers import SimpleRouter

from boards import views
from boards.reports import ReportCompletedView, ReportView
from boards.search import SearchView

router = SimpleRouter()
router.register('boards', views.BoardViewSet, basename='board')
router.register('tasks', views.TaskViewSet, basename='task')
router.register('comments', views.CommentViewSet, basename='comment')
router.register('checklist', views.ChecklistItemViewSet, basename='checklist-item')

columns_list = views.ColumnViewSet.as_view({'get': 'list', 'post': 'create'})
columns_detail = views.ColumnViewSet.as_view({'patch': 'partial_update', 'delete': 'destroy'})
columns_reorder = views.ColumnViewSet.as_view({'post': 'reorder'})
members_list = views.BoardMemberViewSet.as_view({'get': 'list', 'post': 'create'})
labels_list = views.LabelViewSet.as_view({'get': 'list', 'post': 'create'})
teams_list = views.BoardTeamViewSet.as_view({'get': 'list', 'post': 'create'})
teams_detail = views.BoardTeamViewSet.as_view({'patch': 'partial_update', 'delete': 'destroy'})
labels_detail = views.LabelViewSet.as_view({'patch': 'partial_update', 'delete': 'destroy'})
members_detail = views.BoardMemberViewSet.as_view({'patch': 'partial_update', 'delete': 'destroy'})

urlpatterns = router.urls + [
    path('boards/<int:board_pk>/columns/', columns_list, name='board-columns'),
    path('boards/<int:board_pk>/columns/reorder/', columns_reorder, name='board-columns-reorder'),
    path('boards/<int:board_pk>/columns/<int:pk>/', columns_detail, name='board-column-detail'),
    path('boards/<int:board_pk>/members/', members_list, name='board-members'),
    path('boards/<int:board_pk>/members/<int:pk>/', members_detail, name='board-member-detail'),
    path('boards/<int:board_pk>/tasks/', views.BoardTaskListView.as_view(), name='board-tasks'),
    path('boards/<int:board_pk>/activity/', views.BoardActivityView.as_view(), name='board-activity'),
    path('boards/<int:board_pk>/teams/', teams_list, name='board-teams'),
    path('boards/<int:board_pk>/teams/<int:pk>/', teams_detail, name='board-team-detail'),
    path('boards/<int:board_pk>/labels/', labels_list, name='board-labels'),
    path('boards/<int:board_pk>/labels/<int:pk>/', labels_detail, name='board-label-detail'),
    path('tasks/<int:task_pk>/checklist/', views.TaskChecklistView.as_view(), name='task-checklist'),
    path('tasks/<int:task_pk>/comments/', views.TaskCommentListView.as_view(), name='task-comments'),
    path('my-tasks/', views.MyTasksView.as_view(), name='my-tasks'),
    path('search/', SearchView.as_view(), name='search'),
    path('organizations/<int:org_pk>/home/', views.HomeView.as_view(), name='org-home'),
    path('organizations/<int:org_pk>/reports/', ReportView.as_view(), name='org-reports'),
    path('organizations/<int:org_pk>/reports/completed/', ReportCompletedView.as_view(), name='org-reports-completed'),
    path('organizations/<int:org_pk>/activity/', views.OrganizationActivityView.as_view(), name='org-activity'),
]
