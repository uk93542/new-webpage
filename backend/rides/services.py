"""
Notification service helper.

This is a placeholder where you can connect real SMS and WhatsApp providers.
For production, you can integrate Twilio/MessageBird/Meta WhatsApp Cloud API.
"""


def send_confirmation_notifications(*, ride_creator_phone: str, requester_phone: str, ride_date: str, place: str) -> None:
    # In a real app, call external APIs here.
    # We print logs for now so beginners can see when this is triggered.
    print(
        f'[NOTIFICATION] Confirmed ride share for date={ride_date}, place={place}. '
        f'Creator phone={ride_creator_phone}, requester phone={requester_phone}'
    )
