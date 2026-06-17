import json
import logging
import secrets
from datetime import date, datetime

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import IntegrityError, OperationalError
from django.http import JsonResponse, HttpRequest
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from .models import JoinRequest, Notification, Ride, SessionToken, UserProfile
from .services import notify_all_registered_for_date, send_confirmation_notifications

logger = logging.getLogger(__name__)


def _payload(request: HttpRequest) -> dict:
    return json.loads(request.body.decode('utf-8') or '{}')


def _parse_date(raw_date: str) -> date:
    """Accept common date formats from browsers or manual input."""
    supported_formats = ('%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y')

    for fmt in supported_formats:
        try:
            return datetime.strptime(raw_date, fmt).date()
        except ValueError:
            continue

    raise ValueError('Invalid date format. Use YYYY-MM-DD or DD-MM-YYYY.')


def _current_user(request: HttpRequest) -> User | None:
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None

    token = auth_header.removeprefix('Bearer ').strip()
    session = SessionToken.objects.select_related('user').filter(token=token).first()
    return session.user if session else None


def _require_user(request: HttpRequest) -> tuple[User | None, JsonResponse | None]:
    user = _current_user(request)
    if user is None:
        return None, JsonResponse({'error': 'Please login first.'}, status=401)
    return user, None


def _serialize_user(user: User) -> dict:
    profile = getattr(user, 'profile', None)
    return {
        'id': user.id,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'name': user.get_full_name() or user.email,
        'email': user.email,
        'address': profile.address if profile else '',
        'gov_id_type': profile.gov_id_type if profile else '',
        'gov_id_number': profile.gov_id_number if profile else '',
    }


def _serialize_notification(notification: Notification) -> dict:
    return {
        'id': notification.id,
        'title': notification.title,
        'message': notification.message,
        'is_read': notification.is_read,
        'created_at': notification.created_at.isoformat(),
    }


def _serialize_request(req: JoinRequest, current_user: User | None = None) -> dict:
    return {
        'id': req.id,
        'requester_user_id': req.requester_user_id,
        'requester_name': req.requester_name,
        'requester_phone': req.requester_phone,
        'status': req.status,
        'is_mine': bool(current_user and req.requester_user_id == current_user.id),
    }


def _serialize_ride(ride: Ride, current_user: User | None = None) -> dict:
    is_creator = bool(current_user and ride.creator_user_id == current_user.id)
    return {
        'id': ride.id,
        'creator_user_id': ride.creator_user_id,
        'creator_name': ride.creator_name,
        'place': ride.place,
        'roll_number': ride.roll_number,
        'phone_number': ride.phone_number,
        'ride_date': str(ride.ride_date),
        'is_creator': is_creator,
        'requests': [_serialize_request(req, current_user) for req in ride.requests.all().order_by('-created_at')],
    }


@csrf_exempt
@require_POST
def register(request: HttpRequest) -> JsonResponse:
    try:
        payload = _payload(request)
        required_fields = ['first_name', 'last_name', 'email', 'address', 'gov_id_type', 'gov_id_number', 'password']
        missing = [field for field in required_fields if not payload.get(field)]
        if missing:
            return JsonResponse({'error': f'Missing field(s): {", ".join(missing)}'}, status=400)

        email = payload['email'].strip().lower()
        user = User.objects.create_user(
            username=email,
            email=email,
            password=payload['password'],
            first_name=payload['first_name'].strip(),
            last_name=payload['last_name'].strip(),
        )
        UserProfile.objects.create(
            user=user,
            address=payload['address'],
            gov_id_type=payload['gov_id_type'],
            gov_id_number=payload['gov_id_number'],
        )
        Notification.objects.create(
            user=user,
            title='Registration successful',
            message='Welcome to Share Ride. You can now create rides and request to join others.',
        )
    except IntegrityError:
        return JsonResponse({'error': 'An account with this email already exists.'}, status=400)
    except Exception as exc:  # noqa: BLE001 - beginner-friendly API error feedback
        return JsonResponse({'error': f'Could not register: {exc}'}, status=400)

    logger.info('User registered: user_id=%s email=%s', user.id, user.email)
    return JsonResponse({'user': _serialize_user(user)}, status=201)


@csrf_exempt
@require_POST
def login(request: HttpRequest) -> JsonResponse:
    payload = _payload(request)
    email = payload.get('email', '').strip().lower()
    password = payload.get('password', '')
    user = authenticate(username=email, password=password)

    if user is None:
        return JsonResponse({'error': 'Invalid email or password.'}, status=400)

    token = secrets.token_hex(32)
    SessionToken.objects.create(user=user, token=token)
    logger.info('User logged in: user_id=%s email=%s', user.id, user.email)
    return JsonResponse({'token': token, 'user': _serialize_user(user)})


@require_GET
def me(request: HttpRequest) -> JsonResponse:
    user, error = _require_user(request)
    if error:
        return error
    return JsonResponse({'user': _serialize_user(user)})


@require_GET
def list_notifications(request: HttpRequest) -> JsonResponse:
    user, error = _require_user(request)
    if error:
        return error
    notifications = user.ride_notifications.order_by('-created_at')[:25]
    return JsonResponse({'notifications': [_serialize_notification(item) for item in notifications]})


@require_GET
def list_rides(request: HttpRequest) -> JsonResponse:
    user = _current_user(request)
    ride_date = request.GET.get('ride_date')
    logger.info('Ride search received: user=%s ride_date=%s path=%s', user.email if user else 'anonymous', ride_date or 'all', request.path)
    queryset = Ride.objects.all().prefetch_related('requests').order_by('ride_date', '-created_at')

    if ride_date:
        try:
            parsed_date = _parse_date(ride_date)
            queryset = queryset.filter(ride_date=parsed_date)
        except ValueError as exc:
            return JsonResponse({'error': str(exc)}, status=400)

    rides = [_serialize_ride(ride, user) for ride in queryset]
    logger.info('Ride search completed: ride_date=%s results=%s', ride_date or 'all', len(rides))
    return JsonResponse({'rides': rides})


@csrf_exempt
@require_POST
def create_ride(request: HttpRequest) -> JsonResponse:
    user, error = _require_user(request)
    if error:
        return error

    try:
        payload = _payload(request)
        logger.info(
            'Create ride request received: user=%s place=%s roll=%s phone=%s ride_date=%s path=%s',
            user.email,
            payload.get('place'),
            payload.get('roll_number'),
            payload.get('phone_number'),
            payload.get('ride_date'),
            request.path,
        )
        ride_date = _parse_date(payload['ride_date'])

        ride = Ride.objects.create(
            creator_user=user,
            creator_name=user.get_full_name() or user.email,
            place=payload['place'],
            roll_number=payload['roll_number'],
            phone_number=payload['phone_number'],
            ride_date=ride_date,
        )
    except KeyError as exc:
        return JsonResponse({'error': f'Missing field: {exc.args[0]}'}, status=400)
    except ValueError as exc:
        return JsonResponse({'error': str(exc)}, status=400)
    except OperationalError as exc:
        return JsonResponse({'error': f'Database is not ready ({exc}). Run migrations on Render.'}, status=500)
    except Exception as exc:  # noqa: BLE001 - beginner-friendly API error feedback
        return JsonResponse({'error': f'Could not create ride: {exc}'}, status=400)

    logger.info('Ride created successfully: ride_id=%s user=%s ride_date=%s phone=%s', ride.id, user.email, ride.ride_date, ride.phone_number)
    return JsonResponse({'ride': _serialize_ride(ride, user)}, status=201)


@csrf_exempt
@require_POST
def create_join_request(request: HttpRequest, ride_id: int) -> JsonResponse:
    user, error = _require_user(request)
    if error:
        return error

    ride = get_object_or_404(Ride, id=ride_id)
    if ride.creator_user_id == user.id:
        return JsonResponse({'error': 'You cannot request to join your own ride.'}, status=403)

    existing = JoinRequest.objects.filter(ride=ride, requester_user=user, status='pending').first()
    if existing:
        return JsonResponse({'error': 'You already sent a pending request for this ride.'}, status=400)

    try:
        payload = _payload(request)
        requester_phone = payload['requester_phone']
        logger.info('Join request received: ride_id=%s requester=%s phone=%s path=%s', ride.id, user.email, requester_phone, request.path)
        join_request = JoinRequest.objects.create(
            ride=ride,
            requester_user=user,
            requester_name=user.get_full_name() or user.email,
            requester_phone=requester_phone,
        )
        if ride.creator_user:
            Notification.objects.create(
                user=ride.creator_user,
                title='New ride share request',
                message=f'{join_request.requester_name} requested to join your {ride.place} ride on {ride.ride_date}.',
            )
    except KeyError as exc:
        return JsonResponse({'error': f'Missing field: {exc.args[0]}'}, status=400)
    except Exception as exc:  # noqa: BLE001 - beginner-friendly API error feedback
        return JsonResponse({'error': f'Could not create join request: {exc}'}, status=400)

    logger.info('Join request created: request_id=%s ride_id=%s status=%s', join_request.id, ride.id, join_request.status)
    return JsonResponse({'request': _serialize_request(join_request, user)}, status=201)


@csrf_exempt
@require_POST
def confirm_join_request(request: HttpRequest, ride_id: int, request_id: int) -> JsonResponse:
    user, error = _require_user(request)
    if error:
        return error

    ride = get_object_or_404(Ride, id=ride_id)
    join_request = get_object_or_404(JoinRequest, id=request_id, ride=ride)

    if ride.creator_user_id != user.id:
        return JsonResponse({'error': 'Only the ride creator can approve requests for this ride.'}, status=403)
    if join_request.requester_user_id == user.id:
        return JsonResponse({'error': 'You cannot approve your own request.'}, status=403)

    logger.info('Confirm request received: ride_id=%s request_id=%s approver=%s path=%s', ride.id, join_request.id, user.email, request.path)

    join_request.status = 'accepted'
    join_request.save(update_fields=['status'])

    send_confirmation_notifications(
        ride_creator_phone=ride.phone_number,
        requester_phone=join_request.requester_phone,
        ride_date=str(ride.ride_date),
        place=ride.place,
    )

    if join_request.requester_user:
        Notification.objects.create(
            user=join_request.requester_user,
            title='Ride request accepted',
            message=f'Your request to join {ride.creator_name}\'s {ride.place} ride on {ride.ride_date} was accepted.',
        )

    same_day_rides = Ride.objects.filter(ride_date=ride.ride_date).prefetch_related('requests')
    phone_numbers = []
    for same_day_ride in same_day_rides:
        phone_numbers.append(same_day_ride.phone_number)
        for same_day_request in same_day_ride.requests.all():
            phone_numbers.append(same_day_request.requester_phone)

    notify_all_registered_for_date(ride_date=str(ride.ride_date), phone_numbers=phone_numbers)
    logger.info('Join request confirmed: ride_id=%s request_id=%s notified_phone_count=%s', ride.id, join_request.id, len(set(phone_numbers)))

    return JsonResponse({'request': _serialize_request(join_request, user)})
