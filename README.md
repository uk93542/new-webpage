# Share Ride Website Monorepo

Beginner-friendly full-stack starter project for a **ride sharing system** with login, registration, dashboard notifications, and ride matching.

## Project structure

- `frontend/` – React + TypeScript + Webpack + Sass + Bootstrap UI.
- `backend/` – Django backend with MySQL-ready configuration.

## What this app does

1. User registers with name, email, address, government ID details, and password.
2. User logs in with email and password before accessing the dashboard.
3. Logged-in user creates a ride (for any date) with:
   - Name
   - Place option (`station` or `airport`)
   - Roll number
   - Phone number
   - Ride date (supports YYYY-MM-DD and DD-MM-YYYY at API level)
4. Users can view rides on the same date.
5. Users can request to join someone else's ride.
6. Same users cannot request/approve their own ride requests.
7. Ride creator gets an in-app dashboard notification for new requests.
8. Ride creator can confirm requests.
9. On confirmation, backend triggers SMS/WhatsApp notification hooks:
   - direct hook for ride creator + requester,
   - broadcast hook for all users registered for that date.

> **Important**: SMS/WhatsApp require a provider (Twilio/Meta/etc.) and usually paid credits/subscription for production use.

---

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Open: `http://localhost:8080`

### Vercel frontend deployment values

When Vercel asks for build settings, use:

```text
Root Directory: frontend
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

When Vercel asks for environment variables, add this after your Render backend is deployed:

```text
Key: API_BASE_URL
Value: https://your-render-backend-url.onrender.com/api
```

`dist` is only the compiled frontend website folder that Vercel serves to visitors. It does **not** store user-entered ride information. User-entered ride data is sent to the Django backend API and stored in the backend database.

## Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

Backend API runs at: `http://127.0.0.1:8000`

### Render backend deployment values

When Render asks for backend settings, use:

```text
Root Directory: backend
Build Command: pip install -r requirements.txt && python manage.py migrate
Start Command: python -m gunicorn rideshare.wsgi:application
```

Add these Render environment variables:

```text
SECRET_KEY=replace-with-a-long-random-secret
DEBUG=false
ALLOWED_HOSTS=your-render-backend-url.onrender.com
CORS_ALLOWED_ORIGINS=https://your-vercel-frontend-url.vercel.app
USE_MYSQL=false
```

For your Render PostgreSQL subscription, add Render's `DATABASE_URL` environment variable to the backend service. The app will automatically use PostgreSQL when `DATABASE_URL` exists. After adding it, redeploy and run the build command so migrations create the auth/profile/ride tables.

For production with MySQL instead, change `USE_MYSQL=false` to `USE_MYSQL=true` and add your MySQL values from the MySQL notes below.



### Where to see live backend logs on Render

When someone clicks **Create Ride**, **Find Rides**, **Request to Join**, or **Confirm**, the Django backend now writes helpful log lines to stdout. On Render, open:

```text
Render Dashboard -> your backend Web Service -> Logs
```

You should see messages like:

```text
Create ride request received: creator=... place=... roll=... phone=... ride_date=... path=/api/rides/create/
Ride created successfully: ride_id=... ride_date=... phone=...
Ride search received: ride_date=... path=/api/rides/
Ride search completed: ride_date=... results=...
```

If your Render logs show requests to `/rides/create/` or `/rides/` without `/api`, your Vercel `API_BASE_URL` is missing `/api`. Use either of these values in Vercel:

```text
API_BASE_URL=https://your-render-backend-url.onrender.com/api
```

or just:

```text
API_BASE_URL=https://your-render-backend-url.onrender.com
```

The frontend normalizes both values, but after changing Vercel environment variables you must redeploy the frontend.

### Render error: `gunicorn: command not found`

If Render logs show `bash: line 1: gunicorn: command not found`, Render did not install the `gunicorn` package before starting the service. This usually means Render deployed an older GitHub commit or the start command is using a shell command that cannot find the installed executable.

Check these three things:

1. Make sure your latest code is pushed to GitHub. `backend/requirements.txt` must include `gunicorn==23.0.0`.
2. In Render, set the backend start command to:

```text
python -m gunicorn rideshare.wsgi:application
```

3. If Render still uses old dependencies, click **Manual Deploy** and choose **Clear build cache & deploy**.

This repo also includes `backend/Procfile` with the same production start command, so platforms that read Procfiles can start the Django backend correctly.

### If "Could not create ride" appears even after filling all fields

Most common cause is missing database tables.

Run these commands inside `backend/`:

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```

If backend is not running, frontend will also show create/join errors because API calls cannot reach `127.0.0.1:8000`.

---


### Email/SMS/WhatsApp notifications

The current app creates **in-app dashboard notifications** immediately when someone requests to join a ride. Users can see these after login under **Dashboard -> Notifications**.

For real email, SMS, or WhatsApp delivery, you must add a provider account and API keys:

- Email: SendGrid, Mailgun, Amazon SES, or Gmail SMTP for testing.
- SMS: Twilio, MessageBird, or another SMS provider.
- WhatsApp: Meta WhatsApp Cloud API or Twilio WhatsApp.

After choosing a provider, store keys in Render environment variables, for example:

```text
EMAIL_API_KEY=your-provider-key
SMS_API_KEY=your-provider-key
WHATSAPP_ACCESS_TOKEN=your-meta-or-twilio-token
```

Then replace the placeholder print statements in `backend/rides/services.py` with real provider API calls. Do not put provider secrets directly in GitHub.

## MySQL notes

- The backend is configured to use MySQL if environment variables are provided.
- If MySQL variables are missing, it falls back to SQLite for easier local testing.
- For cloud MySQL (AWS RDS, PlanetScale, Azure, etc.) you typically pay based on storage/usage.

Set in `backend/.env`:

```env
USE_MYSQL=true
MYSQL_DB=ride_share
MYSQL_USER=root
MYSQL_PASSWORD=yourpassword
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
```

---

## Suggested SaaS/microservice plan (for future)

- **SMS + WhatsApp**: Twilio or MessageBird
- **Auth**: Firebase Auth / Auth0
- **Background jobs**: Celery + Redis
- **Deploy**:
  - Frontend: Vercel/Netlify
  - Backend: Render/Fly.io/AWS
  - DB: Managed MySQL (RDS/PlanetScale)

For your first version, keep everything in one Django service (already done here). Split to microservices only when traffic and complexity grow.
