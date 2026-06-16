# Share Ride Website Monorepo

Beginner-friendly full-stack starter project for a **ride sharing system**.

## Project structure

- `frontend/` – React + TypeScript + Webpack + Sass + Bootstrap UI.
- `backend/` – Django backend with MySQL-ready configuration.

## What this app does

1. User creates a ride (for any date) with:
1. User creates a future ride with:
   - Name
   - Place option (`station` or `airport`)
   - Roll number
   - Phone number
   - Ride date (supports YYYY-MM-DD and DD-MM-YYYY at API level)
2. Users can view rides on the same date.
3. Users can request to join a ride.
4. Ride creator can confirm request.
5. On confirmation, backend triggers SMS/WhatsApp notification hooks:
   - direct hook for ride creator + requester,
   - broadcast hook for all users registered for that date.
   - Ride date
2. Users can view rides on the same date.
3. Users can request to join a ride.
4. Ride creator can confirm request.
5. On confirmation, backend triggers notification hooks for SMS + WhatsApp.

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

For production with MySQL, change `USE_MYSQL=false` to `USE_MYSQL=true` and add your MySQL values from the MySQL notes below.


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
