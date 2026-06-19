import React, { useEffect, useState } from 'react';

declare const API_BASE_URL: string;

interface User {
  id: number;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  address: string;
  gov_id_type: string;
  gov_id_number: string;
  gender: string;
  id_document: string;
  profile_complete: boolean;
}

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface JoinRequest {
  id: number;
  requester_user_id: number | null;
  requester_name: string;
  requester_phone: string;
  requester_gender: string;
  requester_id_document: string;
  status: 'pending' | 'accepted' | 'rejected';
  is_mine: boolean;
}

interface RideMember {
  id: number;
  name: string;
  email: string;
  gender: string;
  id_document: string;
  is_approver: boolean;
  is_me: boolean;
  removal_vote_count: number;
}

interface Ride {
  id: number;
  creator_user_id: number | null;
  creator_name: string;
  approver_user_id: number | null;
  place: 'station' | 'airport';
  from_address: string;
  to_address: string;
  roll_number: string;
  phone_number: string;
  ride_date: string;
  ride_time: string;
  is_creator: boolean;
  is_approver: boolean;
  members: RideMember[];
  requests: JoinRequest[];
}

type Page = 'home' | 'features' | 'about' | 'contact' | 'login' | 'register' | 'dashboard' | 'profile' | 'notifications' | 'share';
type ShareTab = 'create' | 'find' | 'status' | 'chat';

interface ChatMessage {
  id: number;
  sender_name: string;
  message: string;
  created_at: string;
}

const isBrowser = typeof window !== 'undefined';
const RENDER_API_BASE_URL = 'https://new-webpage-0c7f.onrender.com';
const HARDCODED_API_BASES = [`${RENDER_API_BASE_URL}/api`, RENDER_API_BASE_URL];
const CONFIGURED_API_BASE_URL = API_BASE_URL.replace(/\/$/, '');
const CONFIGURED_API_BASES = CONFIGURED_API_BASE_URL.endsWith('/api')
  ? [CONFIGURED_API_BASE_URL, CONFIGURED_API_BASE_URL.replace(/\/api$/, '')]
  : [`${CONFIGURED_API_BASE_URL}/api`, CONFIGURED_API_BASE_URL];
const isLocalPage = isBrowser && ['localhost', '127.0.0.1'].includes(window.location.hostname);
const isUsingLocalBackend = CONFIGURED_API_BASE_URL.includes('127.0.0.1') || CONFIGURED_API_BASE_URL.includes('localhost');
const isUsingExampleBackend = CONFIGURED_API_BASE_URL.includes('api.example.com');
const shouldPreferHardcodedBackend = isUsingExampleBackend || (isBrowser && !isLocalPage && isUsingLocalBackend);
const API_BASES = Array.from(new Set(
  shouldPreferHardcodedBackend
    ? [...HARDCODED_API_BASES, ...CONFIGURED_API_BASES]
    : [...CONFIGURED_API_BASES, ...HARDCODED_API_BASES],
));
const isProductionApiMisconfigured = isBrowser && !isLocalPage && (isUsingLocalBackend || isUsingExampleBackend);

const VALID_PAGES: Page[] = ['home', 'features', 'about', 'contact', 'login', 'register', 'dashboard', 'profile', 'notifications', 'share'];
const SURATHKAL_LOCATIONS = ['NITK Main Gate', 'NITK Surathkal Campus', 'Surathkal Railway Station', 'Surathkal Bus Stand', 'Surathkal Market', 'NITK Beach', 'Srinivasnagar', 'KREC Junction', 'Mukha Main Road', 'Mangalore International Airport', 'Mangalore Central Railway Station', 'Mangalore Junction Railway Station', 'KSRTC Bus Stand Bejai', 'Panambur Beach', 'Tannirbhavi Beach', 'Other'];

function getInitialPage(): Page {
  if (!isBrowser) return 'home';

  const hashPage = window.location.hash.replace(/^#\/?/, '') as Page;
  return VALID_PAGES.includes(hashPage) ? hashPage : 'home';
}


async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.error || `Request failed with status ${response.status} at ${response.url}.`;
  } catch {
    return `Request failed with status ${response.status} at ${response.url}. Check Render web-service logs (not only PostgreSQL logs) for the exact backend path/error.`;
  }
}

export default function App() {
  const [page, setPage] = useState<Page>(getInitialPage);
  const [token, setToken] = useState(() => window.localStorage.getItem('shareRideToken') || '');
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [message, setMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '', id_document: '' });
  const [registerForm, setRegisterForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    address: '',
    gov_id_type: 'aadhaar',
    gov_id_number: '',
    gender: '',
    id_document: '',
    password: '',
    confirm_password: '',
  });
  const [rideForm, setRideForm] = useState({ from_address: '', from_other: '', to_address: '', to_other: '', roll_number: '', phone_number: '', ride_date: '', ride_time: '' });
  const [findForm, setFindForm] = useState({ ride_date: '', ride_time: '', buffer_minutes: '' });
  const [selectedRideId, setSelectedRideId] = useState<number | ''>('');
  const [selectedDate, setSelectedDate] = useState('');
  const [rides, setRides] = useState<Ride[]>([]);
  const [shareTab, setShareTab] = useState<ShareTab>('create');
  const [chatRideId, setChatRideId] = useState<number | ''>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState('');

  function navigate(nextPage: Page) {
    setPage(nextPage);
    if (isBrowser) {
      window.location.hash = nextPage === 'home' ? '' : nextPage;
    }
  }

  useEffect(() => {
    if (!isBrowser) return undefined;

    function syncPageFromHash() {
      setPage(getInitialPage());
    }

    window.addEventListener('hashchange', syncPageFromHash);
    return () => window.removeEventListener('hashchange', syncPageFromHash);
  }, []);

  useEffect(() => {
    if (token) {
      loadMe(token);
      loadNotifications(token);
    }
  }, [token]);

  useEffect(() => {
    if (selectedDate) loadRidesByDate(selectedDate, { showStatus: false });
  }, [selectedDate, token]);

  useEffect(() => {
    if (!message) return undefined;
    const timeoutId = window.setTimeout(() => setMessage(''), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  function authHeaders(): Record<string, string> {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function apiFetch(path: string, options: RequestInit = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers as Record<string, string> | undefined),
    };

    let lastResponse: Response | null = null;
    let lastNetworkError: unknown = null;
    for (const baseUrl of API_BASES) {
      try {
        const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
        lastResponse = response;
        if (response.status !== 404) return response;
      } catch (error) {
        lastNetworkError = error;
      }
    }

    if (lastResponse) return lastResponse;
    throw lastNetworkError;
  }

  async function loadMe(activeToken = token) {
    if (!activeToken) return;
    const response = await apiFetch('/auth/me/', { headers: { Authorization: `Bearer ${activeToken}` } });
    if (response.ok) {
      const data = await response.json();
      setUser(data.user);
    }
  }

  async function loadNotifications(activeToken = token) {
    if (!activeToken) return;
    const response = await apiFetch('/notifications/', { headers: { Authorization: `Bearer ${activeToken}` } });
    if (response.ok) {
      const data = await response.json();
      setNotifications(data.notifications || []);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsBusy(true);
    const response = await apiFetch('/auth/login/', { method: 'POST', body: JSON.stringify(loginForm) });
    setIsBusy(false);
    if (!response.ok) {
      setMessage(await readErrorMessage(response));
      return;
    }
    const data = await response.json();
    window.localStorage.setItem('shareRideToken', data.token);
    setToken(data.token);
    setUser(data.user);
    if (!data.user.profile_complete) setMessage('Login successful. Please update your gender in Profile.');
    else setMessage('Login successful. Welcome to your dashboard.');
    navigate('dashboard');
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (registerForm.password !== registerForm.confirm_password) {
      setMessage('Passwords do not match.');
      return;
    }
    setIsBusy(true);
    const response = await apiFetch('/auth/register/', { method: 'POST', body: JSON.stringify(registerForm) });
    setIsBusy(false);
    if (!response.ok) {
      setMessage(await readErrorMessage(response));
      return;
    }
    setMessage('Registration successful. You can now login using your email and password.');
    navigate('login');
  }

  function logout() {
    window.localStorage.removeItem('shareRideToken');
    setToken('');
    setUser(null);
    setNotifications([]);
    navigate('home');
    setMessage('Logged out.');
  }

  async function loadRidesByDate(date: string, options = { showStatus: true }, time = '', buffer = '') {
    setIsBusy(true);
    const params = new URLSearchParams({ ride_date: date });
    if (time && buffer) { params.set('ride_time', time); params.set('buffer_minutes', buffer); }
    const response = await apiFetch(`/rides/?${params.toString()}`);
    setIsBusy(false);
    if (!response.ok) {
      setMessage(`Could not load rides: ${await readErrorMessage(response)}`);
      setRides([]);
      return;
    }
    const data = await response.json();
    setRides(data.rides || []);
    if (options.showStatus) setMessage(`Found ${(data.rides || []).length} ride(s) for ${date}.`);
  }

  async function createRide(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setMessage('Please login before creating a ride.');
      navigate('login');
      return;
    }
    setIsBusy(true);
    const response = await apiFetch('/rides/create/', { method: 'POST', body: JSON.stringify({ ...rideForm, from_address: rideForm.from_address === 'Other' ? rideForm.from_other : rideForm.from_address, to_address: rideForm.to_address === 'Other' ? rideForm.to_other : rideForm.to_address }) });
    setIsBusy(false);
    if (!response.ok) {
      setMessage(`Could not create ride: ${await readErrorMessage(response)}`);
      return;
    }
    setSelectedDate(rideForm.ride_date);
    setFindForm({ ...findForm, ride_date: rideForm.ride_date });
    await loadRidesByDate(rideForm.ride_date, { showStatus: false });
    setMessage('Ride created successfully and listed below.');
  }

  async function requestToJoin(ride: Ride) {
    if (!token) {
      setMessage('Please login before requesting to join a ride.');
      navigate('login');
      return;
    }
    if (ride.is_creator) {
      setMessage('You cannot request to join your own ride.');
      return;
    }
    const requester_phone = window.prompt('Your phone number for ride coordination:');
    if (!requester_phone) return;
    const response = await apiFetch(`/rides/${ride.id}/request/`, { method: 'POST', body: JSON.stringify({ requester_phone }) });
    if (!response.ok) {
      setMessage(await readErrorMessage(response));
      return;
    }
    setMessage('Join request sent. The ride creator will see it in their notifications/dashboard.');
    await loadNotifications();
    if (selectedDate) await loadRidesByDate(selectedDate, { showStatus: false });
  }

  async function updateRequestStatus(ride: Ride, request: JoinRequest, action: 'confirm' | 'reject') {
    if (!ride.is_approver) {
      setMessage('Only the current ride approver can update this request.');
      return;
    }
    const response = await apiFetch(`/rides/${ride.id}/requests/${request.id}/${action}/`, { method: 'POST' });
    if (!response.ok) {
      setMessage(await readErrorMessage(response));
      return;
    }
    setMessage(action === 'confirm' ? 'Request approved. Notifications were sent.' : 'Request denied. The requester was notified.');
    await loadNotifications();
    if (selectedDate) await loadRidesByDate(selectedDate, { showStatus: false });
  }

  async function loadChat(rideId: number) {
    const response = await apiFetch(`/rides/${rideId}/chat/`);
    if (response.ok) {
      const data = await response.json();
      setChatMessages(data.messages || []);
    } else {
      setMessage(await readErrorMessage(response));
    }
  }

  async function sendChat(e: React.FormEvent, rideId = chatRideId) {
    e.preventDefault();
    if (!rideId || !chatText.trim()) return;
    const response = await apiFetch(`/rides/${rideId}/chat/`, { method: 'POST', body: JSON.stringify({ message: chatText }) });
    if (!response.ok) {
      setMessage(await readErrorMessage(response));
      return;
    }
    setChatText('');
    await loadChat(rideId);
  }


  async function markNotificationRead(notificationId: number) {
    const response = await apiFetch(`/notifications/${notificationId}/read/`, { method: 'POST' });
    if (response.ok) await loadNotifications();
  }

  async function updateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const response = await apiFetch('/auth/profile/', { method: 'POST', body: JSON.stringify({ gender: user.gender, id_document: user.id_document }) });
    if (!response.ok) { setMessage(await readErrorMessage(response)); return; }
    const data = await response.json();
    setUser(data.user);
    setMessage('Profile updated.');
  }

  async function leaveRide(ride: Ride) {
    const response = await apiFetch(`/rides/${ride.id}/leave/`, { method: 'POST' });
    if (!response.ok) { setMessage(await readErrorMessage(response)); return; }
    setMessage('You left the ride. The next accepted rider is now the approver when needed.');
    if (selectedDate) await loadRidesByDate(selectedDate, { showStatus: false });
  }

  async function voteRemove(ride: Ride, member: RideMember) {
    const response = await apiFetch(`/rides/${ride.id}/members/${member.id}/vote-remove/`, { method: 'POST' });
    if (!response.ok) { setMessage(await readErrorMessage(response)); return; }
    const data = await response.json();
    setMessage(data.removed ? `${member.name} was removed by majority vote.` : `Vote recorded (${data.votes}/${data.total_members}).`);
    if (selectedDate) await loadRidesByDate(selectedDate, { showStatus: false });
  }

  function renderNavbar() {
    return (
      <nav className="navbar navbar-expand-lg bg-white border-bottom sticky-top">
        <div className="container">
          <button className="navbar-brand btn btn-link text-decoration-none fw-bold" onClick={() => navigate('home')}>Share Ride</button>
          <div className="d-flex flex-wrap gap-2">
            <button className="btn btn-link" onClick={() => navigate('features')}>Features</button>
            <button className="btn btn-link" onClick={() => navigate('about')}>About</button>
            <button className="btn btn-link" onClick={() => navigate('contact')}>Contact</button>
            {user ? (
              <>
                <button className="btn btn-outline-primary" onClick={() => navigate('dashboard')}>Dashboard</button>
                <button className="btn btn-outline-secondary" onClick={logout}>Logout</button>
              </>
            ) : (
              <>
                <button className="btn btn-outline-primary" onClick={() => navigate('login')}>Login</button>
                <button className="btn btn-primary" onClick={() => navigate('register')}>Register</button>
              </>
            )}
          </div>
        </div>
      </nav>
    );
  }

  function renderHome() {
    return (
      <>
        <section className="p-5 bg-light rounded-3 my-4">
          <h1 className="display-5 fw-bold">Share rides safely with verified students and passengers.</h1>
          <p className="lead">Login first, create a ride, find people going on the same date, and request to share.</p>
          <button className="btn btn-primary btn-lg me-2" onClick={() => navigate(user ? 'share' : 'login')}>Start Sharing</button>
          <button className="btn btn-outline-secondary btn-lg" onClick={() => navigate('register')}>Create Account</button>
        </section>
        <section className="row g-3 my-4">
          <div className="col-md-4"><div className="card h-100 p-3"><h3>Problem Statement</h3><p>Travelers often go to the same station or airport but cannot easily find trusted ride partners.</p></div></div>
          <div className="col-md-4"><div className="card h-100 p-3"><h3>Features</h3><p>Verified registration, ride matching by date, join requests, dashboard notifications, and approval control.</p></div></div>
          <div className="col-md-4"><div className="card h-100 p-3"><h3>How It Works</h3><p>Register, login, create or find a ride, request to join, and wait for the ride creator to approve.</p></div></div>
        </section>
        <section className="text-center my-5"><h2>Ready to save money and travel together?</h2><button className="btn btn-success" onClick={() => navigate(user ? 'share' : 'login')}>Go to Share My Ride</button></section>
      </>
    );
  }


  function renderFeatures() {
    return (
      <section className="my-4">
        <h2>Features</h2>
        <div className="row g-3">
          <div className="col-md-4"><div className="card h-100 p-3"><h3>Verified Accounts</h3><p>Passengers register before creating rides or asking to join someone else's ride.</p></div></div>
          <div className="col-md-4"><div className="card h-100 p-3"><h3>Same-Date Matching</h3><p>Find other travelers going to the station or airport on the same ride date.</p></div></div>
          <div className="col-md-4"><div className="card h-100 p-3"><h3>Approval Workflow</h3><p>Ride creators review join requests before sharing the ride coordination details.</p></div></div>
        </div>
      </section>
    );
  }

  function renderLogin() {
    return <section className="auth-card card p-4 my-4"><h2>Login</h2><form onSubmit={handleLogin} className="row g-3"><div className="col-md-4"><label className="form-label">Email</label><input className="form-control" type="email" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} required /></div><div className="col-md-4"><label className="form-label">Password</label><input className="form-control" type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required /></div><div className="col-md-4"><label className="form-label">Gov/College ID upload (optional)</label><input className="form-control" type="file" onChange={(e) => setLoginForm({ ...loginForm, id_document: e.target.files?.[0]?.name || '' })} /></div><div><button className="btn btn-primary" disabled={isBusy}>{isBusy ? 'Please wait...' : 'Login'}</button><button type="button" className="btn btn-link" onClick={() => navigate('register')}>Need an account? Register</button></div></form></section>;
  }


  function renderRegister() {
    return <section className="auth-card card p-4 my-4"><h2>Create your account</h2><form onSubmit={handleRegister} className="row g-3"><div className="col-12"><h4>1. General details</h4></div><div className="col-md-4"><label className="form-label">First Name</label><input className="form-control" value={registerForm.first_name} onChange={(e) => setRegisterForm({ ...registerForm, first_name: e.target.value })} required /></div><div className="col-md-4"><label className="form-label">Last Name</label><input className="form-control" value={registerForm.last_name} onChange={(e) => setRegisterForm({ ...registerForm, last_name: e.target.value })} required /></div><div className="col-md-4"><label className="form-label">Mail ID</label><input className="form-control" type="email" value={registerForm.email} onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })} required /></div><div className="col-12"><hr /><h4>2. Detailed profile</h4></div><div className="col-md-4"><label className="form-label">Gender</label><select className="form-select" value={registerForm.gender} onChange={(e) => setRegisterForm({ ...registerForm, gender: e.target.value })} required><option value="">Select</option><option value="male">Male</option><option value="female">Female</option></select></div><div className="col-md-4"><label className="form-label">Address</label><input className="form-control" value={registerForm.address} onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })} required /></div><div className="col-md-4"><label className="form-label">Gov/College ID upload</label><input className="form-control" type="file" onChange={(e) => setRegisterForm({ ...registerForm, id_document: e.target.files?.[0]?.name || '' })} /></div><div className="col-md-6"><label className="form-label">Gov ID Type</label><select className="form-select" value={registerForm.gov_id_type} onChange={(e) => setRegisterForm({ ...registerForm, gov_id_type: e.target.value })}><option value="aadhaar">Aadhaar</option><option value="passport">Passport</option><option value="driving_license">Driving License</option><option value="voter_id">Voter ID</option><option value="other">Other</option></select></div><div className="col-md-6"><label className="form-label">Gov ID Number</label><input className="form-control" value={registerForm.gov_id_number} onChange={(e) => setRegisterForm({ ...registerForm, gov_id_number: e.target.value })} required /></div><div className="col-12"><hr /><h4>3. Password setup</h4></div><div className="col-md-6"><label className="form-label">Create Password</label><input className="form-control" type="password" value={registerForm.password} onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })} required /></div><div className="col-md-6"><label className="form-label">Confirm Password</label><input className="form-control" type="password" value={registerForm.confirm_password} onChange={(e) => setRegisterForm({ ...registerForm, confirm_password: e.target.value })} required /></div><div><button className="btn btn-primary" disabled={isBusy}>{isBusy ? 'Please wait...' : 'Register'}</button></div></form></section>;
  }


  function renderDashboard() {
    if (!user) return renderLogin();
    return <section className="my-4"><h2>Dashboard</h2><p>Welcome, {user.name}. Use the dashboard links below.</p><div className="row g-3"><div className="col-md-4"><button className="card p-4 w-100 text-start" onClick={() => { setShareTab('create'); navigate('share'); }}><h3>Share My Ride</h3><p>Create rides and approve requests.</p></button></div><div className="col-md-4"><button className="card p-4 w-100 text-start" onClick={() => { setShareTab('status'); navigate('share'); }}><h3>Status</h3><p>Track approvals, denials, pending requests, and ride members.</p></button></div><div className="col-md-4"><button className="card p-4 w-100 text-start" onClick={() => { setShareTab('chat'); navigate('share'); }}><h3>Get to Know</h3><p>Open ride-based group chats.</p></button></div><div className="col-md-4"><button className="card p-4 w-100 text-start" onClick={() => navigate('profile')}><h3>Profile</h3><p>View your registered details.</p></button></div><div className="col-md-4"><button className="card p-4 w-100 text-start" onClick={() => { loadNotifications(); navigate('notifications'); }}><h3>Notifications</h3><p>{notifications.filter((item) => !item.is_read).length} new notification(s).</p></button></div></div></section>;
  }

  function renderProfile() {
    if (!user) return renderLogin();
    return <section className="card p-4 my-4"><h2>Profile</h2>{!user.profile_complete && <div className="alert alert-warning">Please update your gender to complete your profile.</div>}<p><strong>Name:</strong> {user.name}</p><p><strong>Email:</strong> {user.email}</p><form className="row g-3" onSubmit={updateProfile}><div className="col-md-4"><label className="form-label">Gender</label><select className="form-select" value={user.gender} onChange={(e) => setUser({ ...user, gender: e.target.value })} required><option value="">Select</option><option value="male">Male</option><option value="female">Female</option></select></div><div className="col-md-4"><label className="form-label">Gov/College ID document</label><input className="form-control" value={user.id_document} onChange={(e) => setUser({ ...user, id_document: e.target.value })} placeholder="Uploaded file name or link" /></div><div className="col-12"><button className="btn btn-primary">Update Profile</button></div></form><hr /><p><strong>Address:</strong> {user.address}</p><p><strong>Gov ID:</strong> {user.gov_id_type} - {user.gov_id_number}</p></section>;
  }


  function renderNotifications() {
    if (!user) return renderLogin();
    const unread = notifications.filter((item) => !item.is_read).length;
    return <section className="card p-4 my-4"><h2>Notifications</h2><p>{unread} new notification(s).</p>{notifications.length === 0 ? <p>No notifications yet.</p> : <ul className="list-group">{notifications.map((item) => <li className={`list-group-item ${item.is_read ? '' : 'list-group-item-info'}`} key={item.id}><strong>{item.title}</strong><p className="mb-1">{item.message}</p><small>{new Date(item.created_at).toLocaleString()}</small>{!item.is_read && <button className="btn btn-sm btn-outline-primary ms-3" onClick={() => markNotificationRead(item.id)}>Mark as read</button>}</li>)}</ul>}</section>;
  }


  function renderLocationSelect(field: 'from_address' | 'to_address', otherField: 'from_other' | 'to_other', label: string) {
    return <div className="col-md-4"><label className="form-label">{label}</label><select className="form-select" value={rideForm[field]} onChange={(e) => setRideForm({ ...rideForm, [field]: e.target.value })} required><option value="">Select a Surathkal/Mangalore location</option>{SURATHKAL_LOCATIONS.map((location) => <option key={location} value={location}>{location}</option>)}</select>{rideForm[field] === 'Other' && <input className="form-control mt-2" placeholder={`Enter ${label.toLowerCase()}`} value={rideForm[otherField]} onChange={(e) => setRideForm({ ...rideForm, [otherField]: e.target.value })} required />}</div>;
  }

  function renderRideList(showActions = true) {
    return rides.length === 0 ? <p>No rides found for selected date.</p> : <div className="list-group">{rides.map((ride, index) => <div className="list-group-item" key={ride.id}><div className="d-flex justify-content-between flex-wrap gap-2"><div><strong>sharedride{index + 1}: {ride.creator_name}</strong><div>From <strong>{ride.from_address}</strong> to <strong>{ride.to_address}</strong> ({ride.place})</div><div className="small text-muted">ID / Booking Ref: {ride.roll_number} | Phone: {ride.phone_number}</div></div>{showActions && <button className="btn btn-outline-primary btn-sm" disabled={ride.is_creator} onClick={() => requestToJoin(ride)}>{ride.is_creator ? 'Your Ride' : 'Request to Join'}</button>}</div><div className="mt-3"><strong>Status / Join Requests:</strong>{ride.requests.length === 0 ? <p className="small text-muted mb-0">No requests yet. Approvers see requester profile names here until action is taken.</p> : <ul className="mt-2 mb-0">{ride.requests.map((request) => <li key={request.id}>{request.requester_name} ({request.requester_phone}) - <span className={`badge ${request.status === 'accepted' ? 'text-bg-success' : request.status === 'rejected' ? 'text-bg-danger' : 'text-bg-warning'}`}>{request.status}</span>{request.status === 'pending' && ride.is_approver && !request.is_mine && <><button className="btn btn-success btn-sm ms-2" onClick={() => updateRequestStatus(ride, request, 'confirm')}>Approve</button><button className="btn btn-outline-danger btn-sm ms-2" onClick={() => updateRequestStatus(ride, request, 'reject')}>Deny</button></>}</li>)}</ul>}</div></div>)}</div>;
  }

  function rideLabel(ride: Ride, index: number) {
    return `sharedride${index + 1} • ${ride.ride_date} ${ride.ride_time}`;
  }

  function selectedRide() {
    return rides.find((ride) => ride.id === selectedRideId) || rides[0];
  }

  function renderShareRide() {
    if (!user) return renderLogin();
    const activeRide = selectedRide();
    return <section className="my-4 module-shell"><h2>Share My Ride</h2><div className="btn-group flex-wrap mb-3"><button className={`btn ${shareTab === 'create' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setShareTab('create')}>Create a Ride</button><button className={`btn ${shareTab === 'find' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setShareTab('find')}>Find Rides</button><button className={`btn ${shareTab === 'status' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setShareTab('status')}>Status</button><button className={`btn ${shareTab === 'chat' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setShareTab('chat')}>Get to Know</button></div>{shareTab !== 'create' && <div className="card p-3 mb-3"><label className="form-label">Ride selection</label><select className="form-select" value={selectedRideId} onChange={(e) => setSelectedRideId(Number(e.target.value) || '')}><option value="">Select a ride</option>{rides.map((ride, index) => <option key={ride.id} value={ride.id}>{rideLabel(ride, index)} • {ride.from_address} to {ride.to_address}</option>)}</select></div>}{shareTab === 'create' && <div className="card p-4 mb-4"><h3>Create a Ride</h3><form className="row g-3" onSubmit={createRide}>{renderLocationSelect('from_address', 'from_other', 'From address')}{renderLocationSelect('to_address', 'to_other', 'To address')}<div className="col-md-4"><label className="form-label">ID / Booking Reference / Student Roll No.</label><input className="form-control" value={rideForm.roll_number} onChange={(e) => setRideForm({ ...rideForm, roll_number: e.target.value })} required /></div><div className="col-md-4"><label className="form-label">Phone Number</label><input className="form-control" value={rideForm.phone_number} onChange={(e) => setRideForm({ ...rideForm, phone_number: e.target.value })} required /></div><div className="col-md-4"><label className="form-label">Ride Date</label><input type="date" min={new Date().toISOString().slice(0, 10)} className="form-control" value={rideForm.ride_date} onChange={(e) => setRideForm({ ...rideForm, ride_date: e.target.value })} required /></div><div className="col-md-4"><label className="form-label">Ride Time</label><input type="time" className="form-control" value={rideForm.ride_time} onChange={(e) => setRideForm({ ...rideForm, ride_time: e.target.value })} required /></div><div className="col-12"><button className="btn btn-primary" disabled={isBusy}>{isBusy ? 'Please wait...' : 'Create Ride'}</button></div></form></div>}{shareTab === 'find' && <div className="card p-4"><h3>Find Rides</h3><div className="row g-3 mb-3"><div className="col-md-4"><label className="form-label">Date</label><input type="date" className="form-control" value={findForm.ride_date} onChange={(e) => setFindForm({ ...findForm, ride_date: e.target.value })} /></div><div className="col-md-4"><label className="form-label">Time (optional)</label><input type="time" className="form-control" value={findForm.ride_time} onChange={(e) => setFindForm({ ...findForm, ride_time: e.target.value })} /></div><div className="col-md-4"><label className="form-label">Buffer minutes (optional)</label><input className="form-control" type="number" min="0" value={findForm.buffer_minutes} onChange={(e) => setFindForm({ ...findForm, buffer_minutes: e.target.value })} /></div><div className="col-12"><button className="btn btn-outline-secondary" onClick={() => { setSelectedDate(findForm.ride_date); findForm.ride_date && loadRidesByDate(findForm.ride_date, undefined, findForm.ride_time, findForm.buffer_minutes); }}>Find Rides</button></div></div>{renderRideList(true)}</div>}{shareTab === 'status' && <div className="card p-4"><h3>Status</h3>{!activeRide ? <p>Load or select a ride first.</p> : <><h4>{activeRide.from_address} to {activeRide.to_address} on {activeRide.ride_date} at {activeRide.ride_time}</h4>{renderRideList(false)}<h5 className="mt-3">Members</h5><ul className="list-group">{activeRide.members.map((member) => <li className="list-group-item d-flex justify-content-between align-items-center" key={member.id}><span>{member.name} {member.is_approver && <span className="badge text-bg-primary ms-2">Approver</span>}<br /><small>{member.gender} • ID: {member.id_document || 'Not uploaded'} • removal votes: {member.removal_vote_count}</small></span><span>{member.is_me ? <button className="btn btn-outline-danger btn-sm" onClick={() => leaveRide(activeRide)}>Leave ride</button> : <button className="btn btn-outline-warning btn-sm" onClick={() => voteRemove(activeRide, member)}>Vote remove</button>}</span></li>)}</ul></>}</div>}{shareTab === 'chat' && <div className="card p-4"><h3>Get to Know</h3>{!activeRide ? <p>Load or select a ride first.</p> : <><p className="text-muted">Chat for {activeRide.from_address} to {activeRide.to_address} ({activeRide.ride_date} {activeRide.ride_time}).</p><button className="btn btn-outline-secondary btn-sm mb-2" onClick={() => loadChat(activeRide.id)}>Load Chat</button><div className="border rounded p-3 mb-3 chat-box">{chatMessages.length === 0 ? <p className="text-muted mb-0">No messages yet.</p> : chatMessages.map((msg) => <div key={msg.id} className="mb-2"><strong>{msg.sender_name}:</strong> {msg.message}<div className="small text-muted">{new Date(msg.created_at).toLocaleString()}</div></div>)}</div><form className="d-flex gap-2" onSubmit={(e) => sendChat(e, activeRide.id)}><input className="form-control" value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder="Type a message to the ride group" /><button className="btn btn-primary">Send</button></form></>}</div>}</section>;
  }


  function renderPage() {
    if (page === 'login') return renderLogin();
    if (page === 'register') return renderRegister();
    if (page === 'dashboard') return renderDashboard();
    if (page === 'profile') return renderProfile();
    if (page === 'notifications') return renderNotifications();
    if (page === 'share') return renderShareRide();
    if (page === 'features') return renderFeatures();
    if (page === 'about') return <section className="card p-4 my-4"><h2>About Us</h2><h3>Mission</h3><p>Make shared travel easier, safer, and more affordable for people going to the same place on the same date.</p><h3>Vision</h3><p>Build a trusted community where verified users can coordinate rides with confidence.</p></section>;
    if (page === 'contact') return <section className="card p-4 my-4"><h2>Contact</h2><p><strong>Email:</strong> uk93542@gmail.com</p><p><strong>Phone:</strong> 8690214131</p><p><strong>Location:</strong> Ahmedabad, India</p></section>;
    return renderHome();
  }

  return <><div>{renderNavbar()}</div><main className="container py-3">{isProductionApiMisconfigured && <div className="alert alert-warning">Frontend is deployed, but the backend API is still set to localhost. Set API_BASE_URL in Vercel to your Render backend URL.</div>}{message && <div className="alert alert-info">{message}</div>}{renderPage()}</main><footer className="border-top py-4 mt-5"><div className="container text-muted">Share Ride System © 2026</div></footer></>;
}
