import React, { useEffect, useState } from 'react';

// Webpack replaces this value during build.
// Local default: http://127.0.0.1:8000/api
// Production example: https://your-render-backend.onrender.com/api
declare const API_BASE_URL: string;

// Data shape for rides returned from backend API.
interface Ride {
  id: number;
  creator_name: string;
  place: 'station' | 'airport';
  roll_number: string;
  phone_number: string;
  ride_date: string;
  requests: JoinRequest[];
}

// Data shape for ride join requests.
interface JoinRequest {
  id: number;
  requester_name: string;
  requester_phone: string;
  status: 'pending' | 'accepted' | 'rejected';
}

const API_BASE = API_BASE_URL;
const isBrowser = typeof window !== 'undefined';
const isLocalPage = isBrowser && ['localhost', '127.0.0.1'].includes(window.location.hostname);
const isUsingLocalBackend = API_BASE.includes('127.0.0.1') || API_BASE.includes('localhost');
const isProductionApiMisconfigured = isBrowser && !isLocalPage && isUsingLocalBackend;

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.error || 'Unknown error.';
  } catch {
    return 'Unknown error.';
  }
}

export default function App() {
  // Form values for creating a ride.
  const [form, setForm] = useState({
    creator_name: '',
    place: 'station',
    roll_number: '',
    phone_number: '',
    ride_date: ''
  });

  // Selected date used for filtering rides.
  const [selectedDate, setSelectedDate] = useState('');

  // List of rides loaded from backend.
  const [rides, setRides] = useState<Ride[]>([]);

  // A friendly status message for users.
  const [message, setMessage] = useState('');

  // Tracks API calls so the user sees that a create/search action is happening.
  const [isBusy, setIsBusy] = useState(false);

  // Load rides whenever selected date changes.
  useEffect(() => {
    if (!selectedDate) return;
    loadRidesByDate(selectedDate, { showStatus: false });
  }, [selectedDate]);

  async function loadRidesByDate(date: string, options = { showStatus: true }) {
    setIsBusy(true);

    let response: Response;
    try {
      response = await fetch(`${API_BASE}/rides/?ride_date=${encodeURIComponent(date)}`);
    } catch {
      setMessage(
        isProductionApiMisconfigured
          ? 'Could not load rides: frontend is deployed, but API_BASE_URL still points to localhost. Add your Render backend URL in Vercel as API_BASE_URL.'
          : 'Could not load rides: backend server is not reachable. Start Django runserver first.'
      );
      setRides([]);
      setIsBusy(false);
      return [];
    }

    if (!response.ok) {
      const errorMessage = await readErrorMessage(response);
      setMessage(`Could not load rides: ${errorMessage}`);
      setRides([]);
      setIsBusy(false);
      return [];
    }

    const data = await response.json();
    const loadedRides = data.rides || [];
    setRides(loadedRides);

    if (options.showStatus) {
      setMessage(
        loadedRides.length > 0
          ? `Found ${loadedRides.length} ride(s) for ${date}.`
          : `No rides found for ${date}.`
      );
    }

    setIsBusy(false);
    return loadedRides;
  }

  async function createRide(e: React.FormEvent) {
    e.preventDefault();

    setMessage('Creating ride...');
    setIsBusy(true);

    let response: Response;
    try {
      response = await fetch(`${API_BASE}/rides/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
    } catch {
      setMessage(
        isProductionApiMisconfigured
          ? 'Could not create ride: frontend is deployed, but API_BASE_URL still points to localhost. Add your Render backend URL in Vercel as API_BASE_URL.'
          : 'Could not create ride: backend server is not reachable. Start Django runserver first.'
      );
      setIsBusy(false);
      return;
    }

    if (!response.ok) {
      const errorMessage = await readErrorMessage(response);
      setMessage(`Could not create ride. ${errorMessage}`);
      setIsBusy(false);
      return;
    }

    const data = await response.json();
    setSelectedDate(form.ride_date);
    setRides(data.ride ? [data.ride] : []);
    await loadRidesByDate(form.ride_date, { showStatus: false });
    setMessage('Ride created successfully! It is now listed below for the selected date.');
    setIsBusy(false);
  }

  async function requestToJoin(rideId: number) {
    const requester_name = window.prompt('Your name:');
    const requester_phone = window.prompt('Your phone number:');

    if (!requester_name || !requester_phone) {
      setMessage('Join request cancelled. Name and phone are required.');
      return;
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE}/rides/${rideId}/request/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requester_name, requester_phone })
      });
    } catch {
      setMessage('Unable to send join request: backend server is not reachable.');
      return;
    }

    if (!response.ok) {
      const errorMessage = await readErrorMessage(response);
      setMessage(`Unable to send join request. ${errorMessage}`);
      return;
    }

    setMessage('Join request sent. Waiting for confirmation.');
    if (selectedDate) await loadRidesByDate(selectedDate);
  }

  async function confirmRequest(rideId: number, requestId: number) {
    let response: Response;
    try {
      response = await fetch(`${API_BASE}/rides/${rideId}/requests/${requestId}/confirm/`, {
        method: 'POST'
      });
    } catch {
      setMessage('Could not confirm request: backend server is not reachable.');
      return;
    }

    if (!response.ok) {
      const errorMessage = await readErrorMessage(response);
      setMessage(`Could not confirm request. ${errorMessage}`);
      return;
    }

    setMessage('Request confirmed. Notifications sent to everyone registered for this date.');
    if (selectedDate) await loadRidesByDate(selectedDate);
  }

  return (
    <div className="container py-4">
      <h1 className="mb-3">Share Ride System</h1>
      <p className="text-muted">Create a ride on any date, find same-date riders, and share booking updates.</p>

      {isProductionApiMisconfigured && (
        <div className="alert alert-warning">
          Frontend is deployed, but the backend API is still set to localhost. In Vercel, set
          <strong> API_BASE_URL</strong> to your Render backend URL, for example
          <code> https://your-render-backend.onrender.com/api</code>.
        </div>
      )}

      {message && <div className="alert alert-info">{message}</div>}

      <div className="card p-3 mb-4 shadow-sm">
        <h2 className="h5">Create a Ride</h2>
        <form className="row g-3" onSubmit={createRide}>
          <div className="col-md-6">
            <label className="form-label">Name</label>
            <input
              className="form-control"
              value={form.creator_name}
              onChange={(e) => setForm({ ...form, creator_name: e.target.value })}
              required
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Place</label>
            <select
              className="form-select"
              value={form.place}
              onChange={(e) => setForm({ ...form, place: e.target.value as 'station' | 'airport' })}
            >
              <option value="station">Station</option>
              <option value="airport">Airport</option>
            </select>
          </div>

          <div className="col-md-6">
            <label className="form-label">Roll Number</label>
            <input
              className="form-control"
              value={form.roll_number}
              onChange={(e) => setForm({ ...form, roll_number: e.target.value })}
              required
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Phone Number</label>
            <input
              className="form-control"
              value={form.phone_number}
              onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
              required
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Ride Date</label>
            <input
              type="date"
              className="form-control"
              value={form.ride_date}
              onChange={(e) => setForm({ ...form, ride_date: e.target.value })}
              required
            />
          </div>

          <div className="col-12">
            <button className="btn btn-primary" type="submit" disabled={isBusy}>
              {isBusy ? 'Please wait...' : 'Create Ride'}
            </button>
          </div>
        </form>
      </div>

      <div className="card p-3 shadow-sm">
        <h2 className="h5">Find Rides by Date</h2>
        <div className="mb-3">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <input
              type="date"
              className="form-control w-auto"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <button
              className="btn btn-outline-secondary"
              type="button"
              disabled={!selectedDate || isBusy}
              onClick={() => loadRidesByDate(selectedDate)}
            >
              Find Rides
            </button>
          </div>
          <div className="form-text">Choose a date or click Find Rides to load everyone registered for that day.</div>
        </div>

        {rides.length === 0 ? (
          <p className="text-muted">No rides found for selected date.</p>
        ) : (
          <div className="list-group">
            {rides.map((ride) => (
              <div className="list-group-item" key={ride.id}>
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div>
                    <strong>{ride.creator_name}</strong> going to <strong>{ride.place}</strong>
                    <div className="small text-muted">
                      Roll: {ride.roll_number} | Phone: {ride.phone_number}
                    </div>
                  </div>
                  <button className="btn btn-outline-primary btn-sm" onClick={() => requestToJoin(ride.id)}>
                    Request to Join
                  </button>
                </div>

                <div className="mt-3">
                  <strong>Join Requests:</strong>
                  {ride.requests.length === 0 ? (
                    <p className="small text-muted mb-0">No requests yet.</p>
                  ) : (
                    <ul className="mt-2 mb-0">
                      {ride.requests.map((request) => (
                        <li key={request.id}>
                          {request.requester_name} ({request.requester_phone}) - {request.status}
                          {request.status === 'pending' && (
                            <button
                              className="btn btn-success btn-sm ms-2"
                              onClick={() => confirmRequest(ride.id, request.id)}
                            >
                              Confirm
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
