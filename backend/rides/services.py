"""
Notification service helper.

This is a placeholder where you can connect real SMS and WhatsApp providers.
For production, you can integrate Twilio/MessageBird/Meta WhatsApp Cloud API.
"""

from __future__ import annotations

from collections.abc import Iterable


def send_confirmation_notifications(*, ride_creator_phone: str, requester_phone: str, ride_date: str, place: str) -> None:
    # In a real app, call external APIs here.
    # We print logs for now so beginners can see when this is triggered.
    print(
        f'[NOTIFICATION] Confirmed ride share for date={ride_date}, place={place}. '
        f'Creator phone={ride_creator_phone}, requester phone={requester_phone}'
    )


def notify_all_registered_for_date(*, ride_date: str, phone_numbers: Iterable[str]) -> None:
    """
    Broadcast helper used when a booking is confirmed for a specific date.

    In production, replace this with your SMS + WhatsApp API integration.
    """

    # Remove duplicates while keeping order.
    unique_numbers = list(dict.fromkeys(phone_numbers))

    for phone_number in unique_numbers:
        print(f'[BROADCAST] Ride booking update for {ride_date} sent to {phone_number}')
