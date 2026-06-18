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
    # Root API aliases keep older frontend deployments working if API_BASE_URL was
    # configured without /api or before the frontend normalization was added.
    path('', include('rides.urls')),
]
