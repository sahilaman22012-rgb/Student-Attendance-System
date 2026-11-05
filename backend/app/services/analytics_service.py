from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import ColumnElement

from app.models.course import CourseEnrollment
from app.models.record import AttendanceRecord, AttendanceRecordStatus
from app.models.session import AttendanceSession, AttendanceSessionStatus
from app.models.user import Student, User


LOW_ATTENDANCE_THRESHOLD = 75.0
ATTENDED_STATUSES = (AttendanceRecordStatus.PRESENT, AttendanceRecordStatus.LATE)


def _completed_session_filter() -> ColumnElement[bool]:
    return or_(
        AttendanceSession.status == AttendanceSessionStatus.COMPLETED,
        and_(
            AttendanceSession.status == AttendanceSessionStatus.ACTIVE,
            AttendanceSession.end_time.is_not(None),
            AttendanceSession.end_time <= func.now(),
        ),
    )


def get_student_attendance_summary(db: Session, student_id: UUID, course_id: UUID) -> dict[str, Any]:
    """Return a student's attendance totals for completed sessions in one course."""
    completed_sessions = int(
        db.scalar(
            select(func.count(AttendanceSession.id)).where(
                AttendanceSession.course_id == course_id,
                _completed_session_filter(),
            )
        )
        or 0
    )
    sessions_attended = int(
        db.scalar(
            select(func.count(AttendanceRecord.id))
            .join(AttendanceSession, AttendanceSession.id == AttendanceRecord.session_id)
            .where(
                AttendanceSession.course_id == course_id,
                _completed_session_filter(),
                AttendanceRecord.student_id == student_id,
                AttendanceRecord.status.in_(ATTENDED_STATUSES),
            )
        )
        or 0
    )
    rate = (sessions_attended / completed_sessions * 100.0) if completed_sessions else 0.0
    return {
        "student_id": student_id,
        "course_id": course_id,
        "total_completed_sessions": completed_sessions,
        "sessions_attended": sessions_attended,
        "attendance_rate": round(rate, 2),
        "is_low_attendance": rate < LOW_ATTENDANCE_THRESHOLD,
    }


def get_course_roster_analytics(db: Session, course_id: UUID) -> list[dict[str, Any]]:
    """Return attendance summaries for each active enrollment in roll-number order."""
    roster = db.execute(
        select(Student, User)
        .join(User, User.id == Student.id)
        .join(CourseEnrollment, CourseEnrollment.student_id == Student.id)
        .where(CourseEnrollment.course_id == course_id, CourseEnrollment.is_active.is_(True))
        .order_by(Student.roll_number)
    ).all()
    summaries: list[dict[str, Any]] = []
    for student, user in roster:
        summary = get_student_attendance_summary(db, student.id, course_id)
        summaries.append(
            {
                **summary,
                "roll_number": student.roll_number,
                "student_name": f"{user.first_name} {user.last_name}".strip(),
            }
        )
    return summaries


def get_course_summary_metrics(db: Session, course_id: UUID) -> dict[str, Any]:
    """Return active enrollment and completed-session counts for a course."""
    active_enrollments = int(
        db.scalar(
            select(func.count(CourseEnrollment.id)).where(
                CourseEnrollment.course_id == course_id,
                CourseEnrollment.is_active.is_(True),
            )
        )
        or 0
    )
    completed_sessions = int(
        db.scalar(
            select(func.count(AttendanceSession.id)).where(
                AttendanceSession.course_id == course_id,
                _completed_session_filter(),
            )
        )
        or 0
    )
    return {
        "course_id": course_id,
        "total_active_enrollments": active_enrollments,
        "total_completed_sessions": completed_sessions,
    }
