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

    GENDER_CHOICES = [('male', 'Male'), ('female', 'Female')]

    user = models.OneToOneField(User, related_name='profile', on_delete=models.CASCADE)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True, default='')
    id_document = models.TextField(blank=True, default='')
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
    approver_user = models.ForeignKey(User, related_name='approving_rides', null=True, blank=True, on_delete=models.SET_NULL)
    creator_name = models.CharField(max_length=100)
    place = models.CharField(max_length=20, choices=PLACE_CHOICES, default='station')
    from_address = models.CharField(max_length=200, default='Surathkal')
    to_address = models.CharField(max_length=200, default='Surathkal')
    roll_number = models.CharField(max_length=50)
    phone_number = models.CharField(max_length=20)
    ride_date = models.DateField()
    ride_time = models.TimeField(default='09:00')
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

class RideChatMessage(models.Model):
    """Group-chat message scoped to a single ride."""

    ride = models.ForeignKey(Ride, related_name='chat_messages', on_delete=models.CASCADE)
    sender_user = models.ForeignKey(User, related_name='ride_chat_messages', null=True, blank=True, on_delete=models.SET_NULL)
    sender_name = models.CharField(max_length=100)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f'Ride {self.ride_id} chat by {self.sender_name}'


class RideRemovalVote(models.Model):
    """A vote by one ride member to remove another ride member."""

    ride = models.ForeignKey(Ride, related_name='removal_votes', on_delete=models.CASCADE)
    voter_user = models.ForeignKey(User, related_name='removal_votes_cast', on_delete=models.CASCADE)
    target_user = models.ForeignKey(User, related_name='removal_votes_received', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('ride', 'voter_user', 'target_user')

    def __str__(self) -> str:
        return f'{self.voter_user_id} voted to remove {self.target_user_id} from ride {self.ride_id}'
