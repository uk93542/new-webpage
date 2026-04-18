from django.db import models


class Ride(models.Model):
    """Represents a ride posted by one passenger for a future date."""

    PLACE_CHOICES = [
        ('station', 'Station'),
        ('airport', 'Airport'),
    ]

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
    requester_name = models.CharField(max_length=100)
    requester_phone = models.CharField(max_length=20)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f'{self.requester_name} -> Ride {self.ride_id} ({self.status})'
