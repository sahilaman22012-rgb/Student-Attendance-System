# AttendIQ

AttendIQ is a full-stack attendance application with a FastAPI/PostgreSQL backend and a React/Vite frontend. It supports administrator-managed accounts and courses, teacher-managed manual attendance, short-lived QR attendance sessions, and student attendance records and reports.

## Run locally

### Backend

Requirements: Python 3.11+ and PostgreSQL 13+.

In PowerShell:

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env` and set `DATABASE_URL` to a database you own, then apply migrations and optionally create local sample data:

```powershell
alembic upgrade head
$env:SEED_PASSWORD = "Use-a-unique-local-password"
python -m app.db.seed
uvicorn app.main:app --reload
```

The development seed creates `admin@attendance.local`, two teachers, and ten students. They all receive the password provided through `SEED_PASSWORD`. The seed only inserts data into an empty database and is disabled in production. API docs are available at `http://localhost:8000/docs` in development.

If upgrading a database created by an earlier release, back it up and verify that its schema matches the initial migration before stamping it: run `alembic stamp 0001_initial`, then `alembic upgrade head`. Do not run that stamp against a new or partially initialized database.

To create the first administrator without sample data, set `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` in the backend process environment and run:

```powershell
python -m app.db.bootstrap_admin
```

This command refuses to run if an administrator already exists.

### Frontend

In another PowerShell window:

```powershell
cd frontend
npm ci
npm run dev
```

Open the Vite URL (normally `http://localhost:5173`). The Vite development server proxies `/api` to `http://localhost:8000`. QR camera scanning works on `localhost` or a secure HTTPS origin; browsers block camera access on ordinary remote HTTP pages.

## Docker Compose

Docker Compose starts PostgreSQL, runs database migrations before starting the API, and serves the production frontend:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and replace both placeholder secrets with unique random values. `APP_ORIGIN` must be the public HTTPS origin used by the browser. The backend now builds its PostgreSQL connection URL from separate settings, so database passwords containing `@` or other URL-special characters are handled safely. Then:

```powershell
docker compose up --build -d
```

The frontend is available at `http://localhost:8080` by default. For real deployments, put it behind an HTTPS reverse proxy/load balancer and set `APP_ORIGIN` to that HTTPS address. Do not expose the database port publicly. On Windows, create the first admin with the interactive helper. It checks/synchronizes the database password and backend connection before prompting for account details, then uses the running backend rather than creating a one-off container:

```powershell
.\scripts\create-admin.ps1
```

The helper asks for the email and asks for the password twice without displaying it. The password must be 12–72 UTF-8 bytes. The bootstrap command refuses to run if an administrator already exists. On other platforms, run `python -m app.db.bootstrap_admin` inside the running backend container after securely setting those environment variables for that command.

The Compose stack is a deployable container baseline, not a complete managed hosting setup: TLS termination, domain/DNS, backups, monitoring, and provider-specific secrets still need to be configured for the chosen host.

## Tests and checks

```powershell
cd backend
python -m pytest
alembic history
```

```powershell
cd frontend
npm run lint
npm run build
```

## Security and operations

- Never commit `.env` files or use the local seed in production.
- Use a unique random `SECRET_KEY` (at least 32 characters) and a unique database password.
- Configure production with `ENVIRONMENT=production`, PostgreSQL, and explicit HTTPS `CORS_ORIGINS`. The production API disables Swagger/OpenAPI routes.
- Back up PostgreSQL and test restore procedures before production use.
- Rotate credentials if they have ever been shared or committed.
