import json
from datetime import date, datetime
from django.http import JsonResponse, HttpRequest
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from .models import Ride, JoinRequest
from .services import send_confirmation_notifications, notify_all_registered_for_date


def _parse_date(raw_date: str) -> date:
    """Accept common date formats from browsers or manual input."""
    supported_formats = ('%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y')

    for fmt in supported_formats:
        try:
            return datetime.strptime(raw_date, fmt).date()
        except ValueError:
            continue

    raise ValueError('Invalid date format. Use YYYY-MM-DD or DD-MM-YYYY.')


def _serialize_request(req: JoinRequest) -> dict:
    return {
        'id': req.id,
        'requester_name': req.requester_name,
        'requester_phone': req.requester_phone,
        'status': req.status,
    }


def _serialize_ride(ride: Ride) -> dict:
    return {
        'id': ride.id,
        'creator_name': ride.creator_name,
        'place': ride.place,
        'roll_number': ride.roll_number,
        'phone_number': ride.phone_number,
        'ride_date': str(ride.ride_date),
        'requests': [_serialize_request(req) for req in ride.requests.all().order_by('-created_at')],
    }


@require_GET
def list_rides(request: HttpRequest) -> JsonResponse:
    # User can pass ?ride_date=YYYY-MM-DD to find matches for the same date.
    ride_date = request.GET.get('ride_date')
    queryset = Ride.objects.all().order_by('ride_date', '-created_at')

    if ride_date:
        try:
            parsed_date = _parse_date(ride_date)
            queryset = queryset.filter(ride_date=parsed_date)
        except ValueError as exc:
            return JsonResponse({'error': str(exc)}, status=400)

    return JsonResponse({'rides': [_serialize_ride(ride) for ride in queryset]})


@csrf_exempt
@require_POST
def create_ride(request: HttpRequest) -> JsonResponse:
    try:
        payload = json.loads(request.body.decode('utf-8'))
        ride_date = _parse_date(payload['ride_date'])

        ride = Ride.objects.create(
            creator_name=payload['creator_name'],
            place=payload['place'],
            roll_number=payload['roll_number'],
            phone_number=payload['phone_number'],
            ride_date=ride_date,
        )
    except KeyError as exc:
        return JsonResponse({'error': f'Missing field: {exc.args[0]}'}, status=400)
    except ValueError as exc:
        return JsonResponse({'error': str(exc)}, status=400)
    except Exception as exc:  # noqa: BLE001 - beginner-friendly API error feedback
        return JsonResponse({'error': f'Could not create ride: {exc}'}, status=400)

    return JsonResponse({'ride': _serialize_ride(ride)}, status=201)


@csrf_exempt
@require_POST
def create_join_request(request: HttpRequest, ride_id: int) -> JsonResponse:
    ride = get_object_or_404(Ride, id=ride_id)

    try:
        payload = json.loads(request.body.decode('utf-8'))
        join_request = JoinRequest.objects.create(
            ride=ride,
            requester_name=payload['requester_name'],
            requester_phone=payload['requester_phone'],
        )
    except KeyError as exc:
        return JsonResponse({'error': f'Missing field: {exc.args[0]}'}, status=400)
    except Exception as exc:  # noqa: BLE001 - beginner-friendly API error feedback
        return JsonResponse({'error': f'Could not create join request: {exc}'}, status=400)

    return JsonResponse({'request': _serialize_request(join_request)}, status=201)


@csrf_exempt
@require_POST
def confirm_join_request(request: HttpRequest, ride_id: int, request_id: int) -> JsonResponse:
    ride = get_object_or_404(Ride, id=ride_id)
    join_request = get_object_or_404(JoinRequest, id=request_id, ride=ride)

    join_request.status = 'accepted'
    join_request.save(update_fields=['status'])

    # Trigger direct notification hook for ride owner and requester.
    send_confirmation_notifications(
        ride_creator_phone=ride.phone_number,
        requester_phone=join_request.requester_phone,
        ride_date=str(ride.ride_date),
        place=ride.place,
    )

    # Broadcast booking update to everyone registered for the same date.
    same_day_rides = Ride.objects.filter(ride_date=ride.ride_date).prefetch_related('requests')
    phone_numbers = []
    for same_day_ride in same_day_rides:
        phone_numbers.append(same_day_ride.phone_number)
        for same_day_request in same_day_ride.requests.all():
            phone_numbers.append(same_day_request.requester_phone)

    notify_all_registered_for_date(ride_date=str(ride.ride_date), phone_numbers=phone_numbers)

    return JsonResponse({'request': _serialize_request(join_request)})
