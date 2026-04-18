import React, { useEffect, useState } from 'react';

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

const API_BASE = 'http://127.0.0.1:8000/api';

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

  // Load rides whenever selected date changes.
  useEffect(() => {
    if (!selectedDate) return;
    loadRidesByDate(selectedDate);
  }, [selectedDate]);

  async function loadRidesByDate(date: string) {
    const response = await fetch(`${API_BASE}/rides/?ride_date=${date}`);

    if (!response.ok) {
      const errorMessage = await readErrorMessage(response);
      setMessage(`Could not load rides: ${errorMessage}`);
      setRides([]);
      return;
    }

    const data = await response.json();
    setRides(data.rides || []);
  }

  async function createRide(e: React.FormEvent) {
    e.preventDefault();

    const response = await fetch(`${API_BASE}/rides/create/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    if (!response.ok) {
      const errorMessage = await readErrorMessage(response);
      setMessage(`Could not create ride. ${errorMessage}`);
      return;
    }

    setMessage('Ride created successfully!');
    setSelectedDate(form.ride_date);
    await loadRidesByDate(form.ride_date);
  }

  async function requestToJoin(rideId: number) {
    const requester_name = window.prompt('Your name:');
    const requester_phone = window.prompt('Your phone number:');

    if (!requester_name || !requester_phone) {
      setMessage('Join request cancelled. Name and phone are required.');
      return;
    }

    const response = await fetch(`${API_BASE}/rides/${rideId}/request/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requester_name, requester_phone })
    });

    if (!response.ok) {
      const errorMessage = await readErrorMessage(response);
      setMessage(`Unable to send join request. ${errorMessage}`);
      return;
    }

    setMessage('Join request sent. Waiting for confirmation.');
    if (selectedDate) await loadRidesByDate(selectedDate);
  }

  async function confirmRequest(rideId: number, requestId: number) {
    const response = await fetch(`${API_BASE}/rides/${rideId}/requests/${requestId}/confirm/`, {
      method: 'POST'
    });

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
            <button className="btn btn-primary" type="submit">
              Create Ride
            </button>
          </div>
        </form>
      </div>

      <div className="card p-3 shadow-sm">
        <h2 className="h5">Find Rides by Date</h2>
        <div className="mb-3">
          <input
            type="date"
            className="form-control w-auto"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
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
