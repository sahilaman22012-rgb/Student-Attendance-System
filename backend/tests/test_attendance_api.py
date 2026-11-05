from datetime import datetime, timezone
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.main import app
from app.models import Student, User, UserRole, UserStatus


def _client_for_user(db_session: Session, user: User) -> TestClient:
    def override_db() -> Session:
        return db_session

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: user
    return TestClient(app)


def test_manual_attendance_persists_and_appears_in_student_summary(
    db_session: Session,
    attendance_context: dict[str, object],
) -> None:
    course = attendance_context["course"]
    student = attendance_context["student"]
    teacher = attendance_context["teacher_user"]
    assert course is not None and student is not None and teacher is not None

    try:
        with _client_for_user(db_session, teacher) as client:
            response = client.post(
                "/api/v1/attendance/manual",
                json={
                    "course_id": str(course.id),
                    "start_time": datetime.now(timezone.utc).isoformat(),
                    "records": [{"student_id": str(student.id), "status": "PRESENT"}],
                },
            )
            assert response.status_code == 201, response.text
            session_id = response.json()["id"]
    finally:
        app.dependency_overrides.clear()

    try:
        with _client_for_user(db_session, student.user) as client:
            summaries = client.get("/api/v1/attendance/me/summary")
            assert summaries.status_code == 200
            summary = next(row for row in summaries.json() if row["course_id"] == str(course.id))
            assert summary["total_completed_sessions"] == 2
            assert summary["sessions_attended"] == 1

            logs = client.get("/api/v1/attendance/me/logs")
            assert logs.status_code == 200
            assert any(row["course_code"] == course.course_code for row in logs.json())
    finally:
        app.dependency_overrides.clear()


def test_qr_attendance_requires_enrollment_and_rejects_duplicate_scans(
    db_session: Session,
    attendance_context: dict[str, object],
) -> None:
    course = attendance_context["course"]
    student = attendance_context["student"]
    teacher = attendance_context["teacher_user"]
    assert course is not None and student is not None and teacher is not None

    try:
        with _client_for_user(db_session, teacher) as client:
            session_response = client.post(
                "/api/v1/attendance/sessions",
                json={"course_id": str(course.id), "duration_minutes": 5},
            )
            assert session_response.status_code == 201, session_response.text
            session_id = session_response.json()["id"]
            token_response = client.get(f"/api/v1/attendance/sessions/{session_id}/token")
            assert token_response.status_code == 200, token_response.text
            nonce = token_response.json()["nonce"]
    finally:
        app.dependency_overrides.clear()

    try:
        with _client_for_user(db_session, student.user) as client:
            scan = {
                "nonce": nonce,
                "device_id": "device-id-for-test-1234",
            }
            response = client.post(f"/api/v1/attendance/sessions/{session_id}/scan", json=scan)
            assert response.status_code == 200, response.text
            duplicate = client.post(f"/api/v1/attendance/sessions/{session_id}/scan", json=scan)
            assert duplicate.status_code == 409
    finally:
        app.dependency_overrides.clear()

    outsider = User(
        id=uuid4(),
        email="not-enrolled@example.test",
        hashed_password="unused",
        first_name="Not",
        last_name="Enrolled",
        role=UserRole.STUDENT,
        status=UserStatus.ACTIVE,
    )
    outsider_student = Student(
        id=outsider.id,
        roll_number="OUT-TEST",
        batch_year=2026,
        department="Computing",
    )
    db_session.add_all([outsider, outsider_student])
    db_session.commit()

    try:
        with _client_for_user(db_session, outsider) as client:
            response = client.post(
                f"/api/v1/attendance/sessions/{session_id}/scan",
                json={"nonce": nonce, "device_id": "outsider-device-123456"},
            )
            assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()
