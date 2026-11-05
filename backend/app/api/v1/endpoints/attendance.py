from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.models.course import Course, CourseEnrollment
from app.models.record import AttendanceRecord, AttendanceRecordStatus
from app.models.session import AttendanceSession, AttendanceSessionStatus, QrToken
from app.models.user import Student, User, UserRole
from app.schemas.attendance import (
    AttendanceSessionOut,
    ManualAttendanceCreate,
    QrScanCreate,
    QrSessionCreate,
    QrTokenOut,
    StudentAttendanceLogOut,
    StudentAttendanceSummaryOut,
)
from app.services.analytics_service import get_student_attendance_summary


router = APIRouter(prefix="/attendance", tags=["attendance"])
ATTENDED = {AttendanceRecordStatus.PRESENT, AttendanceRecordStatus.LATE}


def _utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def _course_for_teacher(db: Session, course_id: UUID, user: User) -> Course:
    course = db.get(Course, course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    if user.role == UserRole.TEACHER and course.instructor_id != user.id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    if not course.is_active:
        raise HTTPException(status_code=409, detail="Course is inactive")
    return course


def _create_token(db: Session, session: AttendanceSession, now: datetime) -> QrToken:
    token = QrToken(
        session_id=session.id,
        token_nonce=secrets.token_urlsafe(32),
        issued_at=now,
        expires_at=now + timedelta(seconds=session.token_ttl_seconds),
    )
    db.add(token)
    db.flush()
    return token


def _complete_if_expired(session: AttendanceSession, now: datetime) -> bool:
    if (
        session.status == AttendanceSessionStatus.ACTIVE
        and session.end_time is not None
        and _utc(session.end_time) <= now
    ):
        session.status = AttendanceSessionStatus.COMPLETED
        return True
    return False


@router.get("/sessions", response_model=list[AttendanceSessionOut])
def list_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "TEACHER"])),
) -> list[dict[str, object]]:
    query = (
        select(AttendanceSession, Course)
        .join(Course, Course.id == AttendanceSession.course_id)
        .order_by(AttendanceSession.start_time.desc())
    )
    if current_user.role == UserRole.TEACHER:
        query = query.where(AttendanceSession.instructor_id == current_user.id)
    results = []
    expired_session_found = False
    for session, course in db.execute(query).all():
        expired_session_found = _complete_if_expired(session, datetime.now(timezone.utc)) or expired_session_found
        enrollment_count = len(
            db.scalars(
                select(CourseEnrollment.id).where(
                    CourseEnrollment.course_id == course.id,
                    CourseEnrollment.is_active.is_(True),
                )
            ).all()
        )
        attended = len(
            db.scalars(
                select(AttendanceRecord.id).where(
                    AttendanceRecord.session_id == session.id,
                    AttendanceRecord.status.in_(ATTENDED),
                )
            ).all()
        )
        results.append(
            {
                "id": session.id,
                "course_id": course.id,
                "course_code": course.course_code,
                "course_title": course.title,
                "start_time": session.start_time,
                "end_time": session.end_time,
                "token_ttl_seconds": session.token_ttl_seconds,
                "status": session.status.value,
                "attendance_rate": round(attended / enrollment_count * 100, 1) if enrollment_count else 0.0,
            }
        )
    if expired_session_found:
        db.commit()
    return results


@router.post("/sessions", response_model=AttendanceSessionOut, status_code=status.HTTP_201_CREATED)
def create_qr_session(
    data: QrSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "TEACHER"])),
) -> AttendanceSession:
    course = _course_for_teacher(db, data.course_id, current_user)
    now = datetime.now(timezone.utc)
    session = AttendanceSession(
        course_id=course.id,
        instructor_id=course.instructor_id,
        session_secret=secrets.token_urlsafe(32),
        start_time=now,
        end_time=now + timedelta(minutes=data.duration_minutes),
        token_ttl_seconds=15,
        status=AttendanceSessionStatus.ACTIVE,
    )
    db.add(session)
    db.flush()
    _create_token(db, session, now)
    db.commit()
    db.refresh(session)
    return session


@router.get("/sessions/{session_id}/token", response_model=QrTokenOut)
def current_qr_token(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "TEACHER"])),
) -> dict[str, object]:
    session = db.get(AttendanceSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Attendance session not found")
    if current_user.role == UserRole.TEACHER and session.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    now = datetime.now(timezone.utc)
    if _complete_if_expired(session, now):
        db.commit()
        raise HTTPException(status_code=409, detail="Attendance session is not active")
    if session.status != AttendanceSessionStatus.ACTIVE or session.end_time is None:
        raise HTTPException(status_code=409, detail="Attendance session is not active")

    token = db.scalar(
        select(QrToken)
        .where(
            QrToken.session_id == session.id,
            QrToken.is_revoked.is_(False),
            QrToken.expires_at > now,
        )
        .order_by(QrToken.issued_at.desc())
        .limit(1)
    )
    if token is None:
        token = _create_token(db, session, now)
        db.commit()
    return {
        "session_id": token.session_id,
        "nonce": token.token_nonce,
        "expires_at": token.expires_at,
    }


@router.post("/sessions/{session_id}/end", response_model=AttendanceSessionOut)
def end_qr_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "TEACHER"])),
) -> AttendanceSession:
    session = db.get(AttendanceSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Attendance session not found")
    if current_user.role == UserRole.TEACHER and session.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    if session.status == AttendanceSessionStatus.ACTIVE:
        session.status = AttendanceSessionStatus.COMPLETED
        session.end_time = datetime.now(timezone.utc)
        db.commit()
        db.refresh(session)
    return session


@router.get("/sessions/{session_id}/records")
def session_records(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "TEACHER"])),
) -> list[dict[str, object]]:
    session = db.get(AttendanceSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Attendance session not found")
    if current_user.role == UserRole.TEACHER and session.instructor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    rows = db.execute(
        select(AttendanceRecord, Student, User)
        .join(Student, Student.id == AttendanceRecord.student_id)
        .join(User, User.id == Student.id)
        .where(AttendanceRecord.session_id == session.id)
        .order_by(AttendanceRecord.marked_at.desc())
    ).all()
    return [
        {
            "id": record.id,
            "student_id": student.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "roll_number": student.roll_number,
            "status": record.status.value,
            "marked_at": record.marked_at,
        }
        for record, student, user in rows
    ]


@router.post("/manual", response_model=AttendanceSessionOut, status_code=status.HTTP_201_CREATED)
def submit_manual_attendance(
    data: ManualAttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "TEACHER"])),
) -> AttendanceSession:
    course = _course_for_teacher(db, data.course_id, current_user)
    enrollments = list(
        db.scalars(
            select(CourseEnrollment).where(
                CourseEnrollment.course_id == course.id,
                CourseEnrollment.is_active.is_(True),
            )
        ).all()
    )
    expected = {enrollment.student_id for enrollment in enrollments}
    submitted = [record.student_id for record in data.records]
    if len(submitted) != len(set(submitted)) or set(submitted) != expected:
        raise HTTPException(
            status_code=400,
            detail="Attendance must include exactly one status for every active enrolled student",
        )

    session = AttendanceSession(
        course_id=course.id,
        instructor_id=course.instructor_id,
        session_secret=secrets.token_urlsafe(32),
        start_time=data.start_time,
        end_time=datetime.now(timezone.utc),
        token_ttl_seconds=15,
        status=AttendanceSessionStatus.COMPLETED,
    )
    db.add(session)
    db.flush()
    db.add_all(
        AttendanceRecord(
            session_id=session.id,
            student_id=record.student_id,
            device_signature_hash=hashlib.sha256(
                f"manual:{session.id}:{record.student_id}".encode()
            ).hexdigest(),
            status=AttendanceRecordStatus(record.status),
        )
        for record in data.records
    )
    db.commit()
    db.refresh(session)
    return session


@router.post("/sessions/{session_id}/scan")
def scan_qr_token(
    session_id: UUID,
    data: QrScanCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["STUDENT"])),
) -> dict[str, str | UUID | datetime]:
    session = db.get(AttendanceSession, session_id)
    now = datetime.now(timezone.utc)
    if session is None:
        raise HTTPException(status_code=409, detail="Attendance session is not active")
    if _complete_if_expired(session, now):
        db.commit()
        raise HTTPException(status_code=409, detail="Attendance session is not active")
    if session.status != AttendanceSessionStatus.ACTIVE or session.end_time is None:
        raise HTTPException(status_code=409, detail="Attendance session is not active")

    enrolled = db.scalar(
        select(CourseEnrollment.id).where(
            CourseEnrollment.course_id == session.course_id,
            CourseEnrollment.student_id == current_user.id,
            CourseEnrollment.is_active.is_(True),
        )
    )
    if enrolled is None:
        raise HTTPException(status_code=403, detail="You are not enrolled in this course")

    token = db.scalar(
        select(QrToken).where(
            QrToken.session_id == session.id,
            QrToken.token_nonce == data.nonce,
            QrToken.is_revoked.is_(False),
            QrToken.expires_at > now,
        )
    )
    if token is None:
        raise HTTPException(status_code=400, detail="QR token is invalid or expired")

    existing = db.scalar(
        select(AttendanceRecord.id).where(
            AttendanceRecord.session_id == session.id,
            AttendanceRecord.student_id == current_user.id,
        )
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="Attendance already recorded for this session")

    device_hash = hashlib.sha256(data.device_id.encode()).hexdigest()
    record = AttendanceRecord(
        session_id=session.id,
        student_id=current_user.id,
        qr_token_id=token.id,
        device_signature_hash=device_hash,
        ip_address=request.client.host if request.client else None,
        status=AttendanceRecordStatus.PRESENT,
    )
    db.add(record)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="This device or student has already checked in") from None
    db.refresh(record)
    return {
        "status": record.status.value,
        "student_id": current_user.id,
        "marked_at": record.marked_at,
    }


@router.get("/me/summary", response_model=list[StudentAttendanceSummaryOut])
def my_attendance_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["STUDENT"])),
) -> list[dict[str, object]]:
    enrollments = db.execute(
        select(Course, CourseEnrollment)
        .join(CourseEnrollment, CourseEnrollment.course_id == Course.id)
        .where(CourseEnrollment.student_id == current_user.id, CourseEnrollment.is_active.is_(True))
        .order_by(Course.course_code)
    ).all()
    summaries = []
    for course, _enrollment in enrollments:
        summary = get_student_attendance_summary(db, current_user.id, course.id)
        summaries.append(
            {
                "course_id": course.id,
                "course_code": course.course_code,
                "course_title": course.title,
                "total_completed_sessions": summary["total_completed_sessions"],
                "sessions_attended": summary["sessions_attended"],
                "attendance_rate": summary["attendance_rate"],
                "is_low_attendance": summary["is_low_attendance"],
            }
        )
    return summaries


@router.get("/me/logs", response_model=list[StudentAttendanceLogOut])
def my_attendance_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["STUDENT"])),
) -> list[dict[str, object]]:
    rows = db.execute(
        select(AttendanceRecord, AttendanceSession, Course)
        .join(AttendanceSession, AttendanceSession.id == AttendanceRecord.session_id)
        .join(Course, Course.id == AttendanceSession.course_id)
        .where(AttendanceRecord.student_id == current_user.id)
        .order_by(AttendanceRecord.marked_at.desc())
    ).all()
    return [
        {
            "id": record.id,
            "course_code": course.course_code,
            "course_title": course.title,
            "marked_at": record.marked_at,
            "status": record.status.value,
            "method": "QR scan" if record.qr_token_id else "Teacher manual",
        }
        for record, _session, course in rows
    ]
