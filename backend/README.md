# AttendIQ backend

The backend is a FastAPI service backed by PostgreSQL and SQLAlchemy. For full-stack local setup, first-admin creation, Docker Compose deployment, and security notes, see the [project README](../README.md).

## Backend commands

Run these commands from this directory after creating and activating a virtual environment and installing `requirements.txt`:

```powershell
Copy-Item .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

Set `DATABASE_URL` in `.env` to a PostgreSQL database before applying migrations.

To insert development-only sample data into an empty database, set `SEED_PASSWORD` in the current process environment and run:

```powershell
python -m app.db.seed
```

For a real installation, create the initial administrator once with `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD`:

```powershell
python -m app.db.bootstrap_admin
```

Run backend tests with:

```powershell
python -m pytest
```
