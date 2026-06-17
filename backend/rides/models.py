from django.contrib.auth.models import User
from django.db import models


class UserProfile(models.Model):
    """Extra registration details collected after the built-in Django user is created."""

    GOV_ID_CHOICES = [
        ('aadhaar', 'Aadhaar'),
        ('passport', 'Passport'),
        ('driving_license', 'Driving License'),
        ('voter_id', 'Voter ID'),
        ('other', 'Other'),
    ]

    user = models.OneToOneField(User, related_name='profile', on_delete=models.CASCADE)
    address = models.TextField()
    gov_id_type = models.CharField(max_length=40, choices=GOV_ID_CHOICES)
    gov_id_number = models.CharField(max_length=80)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f'{self.user.get_full_name()} ({self.user.email})'


class SessionToken(models.Model):
    """Simple token used by the React frontend to call protected APIs."""

    user = models.ForeignKey(User, related_name='session_tokens', on_delete=models.CASCADE)
    token = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f'Session for {self.user.email}'


class Notification(models.Model):
    """Dashboard notification shown after actions like join requests."""

    user = models.ForeignKey(User, related_name='ride_notifications', on_delete=models.CASCADE)
    title = models.CharField(max_length=120)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f'{self.title} -> {self.user.email}'


class Ride(models.Model):
    """Represents a ride posted by one passenger for a selected date."""

    PLACE_CHOICES = [
        ('station', 'Station'),
        ('airport', 'Airport'),
    ]

    creator_user = models.ForeignKey(User, related_name='created_rides', null=True, blank=True, on_delete=models.SET_NULL)
    creator_name = models.CharField(max_length=100)
    place = models.CharField(max_length=20, choices=PLACE_CHOICES)
    roll_number = models.CharField(max_length=50)
    phone_number = models.CharField(max_length=20)
    ride_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f'{self.creator_name} - {self.place} on {self.ride_date}'


class JoinRequest(models.Model):
    """Represents another user requesting to join an existing ride."""

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ]

    ride = models.ForeignKey(Ride, related_name='requests', on_delete=models.CASCADE)
    requester_user = models.ForeignKey(User, related_name='join_requests', null=True, blank=True, on_delete=models.SET_NULL)
    requester_name = models.CharField(max_length=100)
    requester_phone = models.CharField(max_length=20)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f'{self.requester_name} -> Ride {self.ride_id} ({self.status})'
