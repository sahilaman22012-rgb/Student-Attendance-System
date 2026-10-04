from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.models.course import Course
from app.models.user import User, UserRole
from app.services.report_service import generate_course_csv, generate_course_pdf


router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/course/{course_id}/export")
def export_course_report(
    course_id: UUID,
    format: Literal["csv", "pdf"] = Query(default="csv"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "TEACHER"])),
) -> StreamingResponse:
    course = db.scalar(select(Course).where(Course.id == course_id))
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if current_user.role == UserRole.TEACHER and course.instructor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    try:
        if format == "csv":
            return generate_course_csv(db, course_id)
        return generate_course_pdf(db, course_id)
    except LookupError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found") from None
