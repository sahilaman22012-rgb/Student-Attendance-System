from datetime import datetime, timezone
from uuid import uuid4

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import AttendanceRecord, AttendanceRecordStatus


def _record(session_id, student_id, signature: str) -> AttendanceRecord:  # type: ignore[no-untyped-def]
    return AttendanceRecord(
        id=uuid4(),
        session_id=session_id,
        student_id=student_id,
        device_signature_hash=signature,
        status=AttendanceRecordStatus.PRESENT,
        marked_at=datetime.now(timezone.utc),
    )


def test_duplicate_student_checkin_is_rejected(db_session: Session, attendance_context: dict[str, object]) -> None:
    session = attendance_context["session"]
    student = attendance_context["student"]
    assert session is not None and student is not None
    db_session.add(_record(session.id, student.id, "device-one"))
    db_session.commit()
    db_session.add(_record(session.id, student.id, "device-two"))
    with pytest.raises(IntegrityError):
        db_session.commit()


def test_device_cannot_be_reused_in_same_session(db_session: Session, attendance_context: dict[str, object]) -> None:
    session = attendance_context["session"]
    first_student = attendance_context["student"]
    assert session is not None and first_student is not None
    from app.models import Student, User, UserRole, UserStatus

    second_user = User(
        id=uuid4(),
        email="student2@example.test",
        hashed_password="unused",
        first_name="Alex",
        last_name="Learner",
        role=UserRole.STUDENT,
        status=UserStatus.ACTIVE,
    )
    second_student = Student(
        id=second_user.id,
        roll_number="STU-TEST-2",
        batch_year=2026,
        department="Computing",
    )
    db_session.add_all([second_user, second_student])
    db_session.flush()
    db_session.add(_record(session.id, first_student.id, "shared-device"))
    db_session.commit()
    db_session.add(_record(session.id, second_student.id, "shared-device"))
    with pytest.raises(IntegrityError):
        db_session.commit()
