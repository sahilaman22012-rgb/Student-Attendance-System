import csv
from io import StringIO
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import AttendanceRecord, AttendanceRecordStatus


def test_csv_export_returns_rfc4180_headers_and_data(
    client: TestClient,
    db_session: Session,
    attendance_context: dict[str, object],
) -> None:
    student = attendance_context["student"]
    session = attendance_context["session"]
    course = attendance_context["course"]
    assert student is not None and session is not None and course is not None
    db_session.add(
        AttendanceRecord(
            id=uuid4(),
            session_id=session.id,
            student_id=student.id,
            device_signature_hash="export-device",
            status=AttendanceRecordStatus.PRESENT,
        )
    )
    db_session.commit()

    response = client.get(f"/api/v1/reports/course/{course.id}/export?format=csv")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert response.headers["content-disposition"].endswith('filename="TEST101-attendance.csv"')
    parsed = list(csv.reader(StringIO(response.text, newline="")))
    assert parsed[0] == ["Roll Number", "Student Name", "Timestamp", "Attendance Status"]
    assert parsed[1][0:2] == ["STU-TEST", "Sam Student"]
    assert parsed[1][3] == "PRESENT"
    assert response.text.endswith("\r\n")


def test_pdf_export_returns_pdf_document(client: TestClient, attendance_context: dict[str, object]) -> None:
    course = attendance_context["course"]
    assert course is not None
    response = client.get(f"/api/v1/reports/course/{course.id}/export?format=pdf")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF-")


def test_teacher_cannot_export_another_teachers_course(
    client: TestClient,
    db_session: Session,
    attendance_context: dict[str, object],
) -> None:
    from app.models import Course, Teacher, User, UserRole, UserStatus

    course = attendance_context["course"]
    assert course is not None
    other_user = User(
        id=uuid4(),
        email="other-teacher@example.test",
        hashed_password="unused",
        first_name="Other",
        last_name="Teacher",
        role=UserRole.TEACHER,
        status=UserStatus.ACTIVE,
    )
    db_session.add(other_user)
    db_session.flush()
    other_teacher = Teacher(id=other_user.id, employee_id="EMP-OTHER", department="Computing")
    db_session.add(other_teacher)
    db_session.flush()
    course.instructor_id = other_teacher.id
    db_session.commit()
    response = client.get(f"/api/v1/reports/course/{course.id}/export?format=csv")
    assert response.status_code == 403
