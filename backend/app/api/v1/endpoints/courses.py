from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.models.course import Course, CourseEnrollment
from app.models.user import Student, Teacher, User, UserRole
from app.schemas.course import CourseCreate, CourseOut, EnrollmentCreate, EnrollmentOut, StudentRosterOut


router = APIRouter(prefix="/courses", tags=["courses"])


@router.post("", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def create_course(
    data: CourseCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(["ADMIN"])),
) -> Course:
    if db.scalar(select(Teacher.id).where(Teacher.id == data.instructor_id)) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Instructor not found")
    course = Course(**data.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.get("", response_model=list[CourseOut])
def list_courses(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "TEACHER", "STUDENT"])),
) -> list[Course]:
    query = select(Course).order_by(Course.course_code).offset(skip).limit(limit)
    if current_user.role == UserRole.TEACHER:
        query = query.where(Course.instructor_id == current_user.id)
    elif current_user.role == UserRole.STUDENT:
        query = query.join(CourseEnrollment).where(
            CourseEnrollment.student_id == current_user.id,
            CourseEnrollment.is_active.is_(True),
        )
    return list(db.scalars(query).unique().all())


@router.post(
    "/{course_id}/enroll",
    response_model=EnrollmentOut,
    status_code=status.HTTP_201_CREATED,
)
def enroll_student(
    course_id: UUID,
    data: EnrollmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "TEACHER"])),
) -> CourseEnrollment:
    course = db.scalar(select(Course).where(Course.id == course_id))
    student = db.scalar(select(Student).where(Student.id == data.student_id))
    if course is None or student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course or student not found")
    if current_user.role == UserRole.TEACHER and course.instructor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned teacher may enroll students",
        )
    enrollment = db.scalar(
        select(CourseEnrollment).where(
            CourseEnrollment.course_id == course_id,
            CourseEnrollment.student_id == data.student_id,
        )
    )
    if enrollment is not None:
        if enrollment.is_active:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Student is already enrolled")
        enrollment.is_active = True
    else:
        enrollment = CourseEnrollment(course_id=course_id, student_id=data.student_id)
        db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment


@router.get("/{course_id}/students", response_model=list[StudentRosterOut])
def course_students(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "TEACHER"])),
) -> list[dict[str, object]]:
    course = db.scalar(select(Course).where(Course.id == course_id))
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    if current_user.role == UserRole.TEACHER and course.instructor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    query = (
        select(User, Student)
        .join(Student, Student.id == User.id)
        .join(CourseEnrollment, CourseEnrollment.student_id == Student.id)
        .where(CourseEnrollment.course_id == course_id, CourseEnrollment.is_active.is_(True))
        .order_by(User.last_name, User.first_name)
    )
    return [
        {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role.value,
            "status": user.status.value,
            "roll_number": student.roll_number,
            "batch_year": student.batch_year,
            "department": student.department,
        }
        for user, student in db.execute(query).all()
    ]
