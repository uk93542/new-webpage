from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include


def health_check(request):
    return JsonResponse({
        'status': 'ok',
        'message': 'Backend is running. Use /api/rides/ for ride API endpoints.',
    })

urlpatterns = [
    path('', health_check, name='health-check'),
    path('health/', health_check, name='health-check-alt'),
    path('admin/', admin.site.urls),
    path('api/', include('rides.urls')),
]
