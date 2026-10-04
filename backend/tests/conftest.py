from collections.abc import Generator
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_user, get_db
from app.db.session import Base
from app.main import app
from app.models import (
    AttendanceSession,
    AttendanceSessionStatus,
    Course,
    CourseEnrollment,
    Student,
    Teacher,
    User,
    UserRole,
    UserStatus,
)


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, _record) -> None:  # type: ignore[no-untyped-def]
        connection.create_function("now", 0, lambda: datetime.now(timezone.utc).isoformat(sep=" "))
        connection.create_function("gen_random_uuid", 0, lambda: uuid4().hex)
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, expire_on_commit=False)
    with testing_session() as session:
        yield session
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def attendance_context(db_session: Session) -> dict[str, object]:
    teacher_user = User(
        id=uuid4(),
        email="teacher@example.test",
        hashed_password="unused",
        first_name="Taylor",
        last_name="Teacher",
        role=UserRole.TEACHER,
        status=UserStatus.ACTIVE,
    )
    student_user = User(
        id=uuid4(),
        email="student@example.test",
        hashed_password="unused",
        first_name="Sam",
        last_name="Student",
        role=UserRole.STUDENT,
        status=UserStatus.ACTIVE,
    )
    teacher = Teacher(id=teacher_user.id, employee_id="EMP-TEST", department="Computing")
    student = Student(
        id=student_user.id,
        roll_number="STU-TEST",
        batch_year=2026,
        department="Computing",
    )
    course = Course(
        id=uuid4(),
        course_code="TEST101",
        title="Testing",
        instructor_id=teacher.id,
        semester="Fall 2026",
    )
    db_session.add_all([teacher_user, student_user, teacher, student, course])
    db_session.flush()
    enrollment = CourseEnrollment(course_id=course.id, student_id=student.id, is_active=True)
    db_session.add(enrollment)
    session = AttendanceSession(
        id=uuid4(),
        course_id=course.id,
        instructor_id=teacher.id,
        session_secret="test-secret",
        start_time=datetime.now(timezone.utc),
        status=AttendanceSessionStatus.COMPLETED,
    )
    db_session.add(session)
    db_session.commit()
    return {
        "teacher_user": teacher_user,
        "student_user": student_user,
        "teacher": teacher,
        "student": student,
        "course": course,
        "session": session,
    }


@pytest.fixture
def client(db_session: Session, attendance_context: dict[str, object]) -> Generator[TestClient, None, None]:
    def override_db() -> Generator[Session, None, None]:
        yield db_session

    def override_user() -> User:
        return attendance_context["teacher_user"]  # type: ignore[return-value]

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = override_user
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()
