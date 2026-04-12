from django.urls import path
from . import views

urlpatterns = [
    path('rides/', views.list_rides, name='list-rides'),
    path('rides/create/', views.create_ride, name='create-ride'),
    path('rides/<int:ride_id>/request/', views.create_join_request, name='create-join-request'),
    path('rides/<int:ride_id>/requests/<int:request_id>/confirm/', views.confirm_join_request, name='confirm-join-request'),
]
