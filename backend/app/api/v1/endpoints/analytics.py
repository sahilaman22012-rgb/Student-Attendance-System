from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.models.course import Course
from app.models.user import User, UserRole
from app.services.analytics_service import get_course_roster_analytics, get_course_summary_metrics


router = APIRouter(prefix="/analytics", tags=["analytics"])


def _get_authorized_course(db: Session, course_id: UUID, current_user: User) -> Course:
    course = db.scalar(select(Course).where(Course.id == course_id))
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if current_user.role == UserRole.TEACHER and course.instructor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return course


@router.get("/course/{course_id}/roster")
def course_roster_analytics(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "TEACHER"])),
) -> list[dict[str, Any]]:
    _get_authorized_course(db, course_id, current_user)
    return get_course_roster_analytics(db, course_id)


@router.get("/course/{course_id}/summary")
def course_summary_analytics(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "TEACHER"])),
) -> dict[str, Any]:
    _get_authorized_course(db, course_id, current_user)
    return get_course_summary_metrics(db, course_id)
