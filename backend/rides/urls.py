from django.urls import path
from . import views

urlpatterns = [
    path('auth/register/', views.register, name='register'),
    path('auth/login/', views.login, name='login'),
    path('auth/me/', views.me, name='me'),
    path('auth/profile/', views.update_profile, name='update-profile'),
    path('notifications/', views.list_notifications, name='notifications'),
    path('notifications/<int:notification_id>/read/', views.mark_notification_read, name='mark-notification-read'),
    path('rides/', views.list_rides, name='list-rides'),
    path('rides/create/', views.create_ride, name='create-ride'),
    path('rides/<int:ride_id>/request/', views.create_join_request, name='create-join-request'),
    path('rides/<int:ride_id>/requests/<int:request_id>/confirm/', views.confirm_join_request, name='confirm-join-request'),
    path('rides/<int:ride_id>/requests/<int:request_id>/reject/', views.reject_join_request, name='reject-join-request'),
    path('rides/<int:ride_id>/chat/', views.ride_chat, name='ride-chat'),
    path('rides/<int:ride_id>/leave/', views.leave_ride, name='leave-ride'),
    path('rides/<int:ride_id>/members/<int:user_id>/vote-remove/', views.vote_remove_member, name='vote-remove-member'),
]
