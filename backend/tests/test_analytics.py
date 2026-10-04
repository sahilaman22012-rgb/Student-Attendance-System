from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy.orm import Session

from app.models import AttendanceRecord, AttendanceRecordStatus, AttendanceSession, AttendanceSessionStatus
from app.services.analytics_service import (
    get_course_roster_analytics,
    get_course_summary_metrics,
    get_student_attendance_summary,
)


def test_attendance_rate_and_low_attendance_threshold(db_session: Session, attendance_context: dict[str, object]) -> None:
    student = attendance_context["student"]
    course = attendance_context["course"]
    completed = attendance_context["session"]
    assert student is not None and course is not None and completed is not None
    completed_sessions = [completed]
    for _ in range(3):
        session = AttendanceSession(
            id=uuid4(),
            course_id=course.id,
            instructor_id=completed.instructor_id,
            session_secret=f"secret-{uuid4()}",
            start_time=datetime.now(timezone.utc),
            status=AttendanceSessionStatus.COMPLETED,
        )
        db_session.add(session)
        completed_sessions.append(session)
    incomplete = AttendanceSession(
        id=uuid4(),
        course_id=course.id,
        instructor_id=completed.instructor_id,
        session_secret="scheduled-secret",
        start_time=datetime.now(timezone.utc),
        status=AttendanceSessionStatus.ACTIVE,
    )
    db_session.add(incomplete)
    db_session.flush()
    for index, session in enumerate(completed_sessions):
        if index < 3:
            db_session.add(
                AttendanceRecord(
                    id=uuid4(),
                    session_id=session.id,
                    student_id=student.id,
                    device_signature_hash=f"device-{index}",
                    status=AttendanceRecordStatus.PRESENT if index < 2 else AttendanceRecordStatus.LATE,
                    marked_at=datetime.now(timezone.utc),
                )
            )
    db_session.commit()

    summary = get_student_attendance_summary(db_session, student.id, course.id)
    assert summary["total_completed_sessions"] == 4
    assert summary["sessions_attended"] == 3
    assert summary["attendance_rate"] == 75.0
    assert summary["is_low_attendance"] is False

    db_session.add(
        AttendanceRecord(
            id=uuid4(),
            session_id=completed_sessions[3].id,
            student_id=student.id,
            device_signature_hash="device-extra",
            status=AttendanceRecordStatus.EXCUSED,
            marked_at=datetime.now(timezone.utc),
        )
    )
    db_session.commit()
    summary = get_student_attendance_summary(db_session, student.id, course.id)
    assert summary["sessions_attended"] == 3
    assert summary["is_low_attendance"] is False

    # A roster with only two attended out of four completed sessions falls below 75%.
    db_session.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == completed_sessions[2].id
    ).delete()
    db_session.commit()
    roster = get_course_roster_analytics(db_session, course.id)
    assert roster[0]["attendance_rate"] == 50.0
    assert roster[0]["is_low_attendance"] is True
    metrics = get_course_summary_metrics(db_session, course.id)
    assert metrics["total_active_enrollments"] == 1
    assert metrics["total_completed_sessions"] == 4
