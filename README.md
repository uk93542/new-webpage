# Share Ride Website Monorepo

Beginner-friendly full-stack starter project for a **ride sharing system**.

## Project structure

- `frontend/` – React + TypeScript + Webpack + Sass + Bootstrap UI.
- `backend/` – Django backend with MySQL-ready configuration.

## What this app does

1. User creates a ride (for any date) with:
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

> **Important**: SMS/WhatsApp require a provider (Twilio/Meta/etc.) and usually paid credits/subscription for production use.

---

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Open: `http://localhost:8080`

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
