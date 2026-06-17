from django.contrib import admin

from .models import JoinRequest, Notification, Ride, SessionToken, UserProfile

admin.site.register(UserProfile)
admin.site.register(SessionToken)
admin.site.register(Notification)
admin.site.register(Ride)
admin.site.register(JoinRequest)
