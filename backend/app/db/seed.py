from __future__ import annotations

import os

from passlib.context import CryptContext
from sqlalchemy import select

from app.core.config import settings
from app.db.session import SessionLocal
from app.models import Course, CourseEnrollment, Student, Teacher, User, UserRole, UserStatus


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def seed_database() -> None:
    """Insert a local-only development dataset after applying database migrations."""
    if settings.ENVIRONMENT == "production":
        raise RuntimeError("The development seed command is disabled in production")
    with SessionLocal.begin() as db:
        if db.scalar(select(User.id).limit(1)) is not None:
            return

        seed_password = os.getenv("SEED_PASSWORD", "")
        if len(seed_password) < 12:
            raise RuntimeError("Set SEED_PASSWORD to a value of at least 12 characters before seeding")
        if len(seed_password.encode("utf-8")) > 72:
            raise RuntimeError("SEED_PASSWORD must be no more than 72 UTF-8 bytes for bcrypt")
        password_hash = pwd_context.hash(seed_password)
        admin = User(
            email="admin@attendance.local",
            hashed_password=password_hash,
            first_name="System",
            last_name="Administrator",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
        )
        teacher_users = [
            User(
                email=f"teacher{number}@attendance.local",
                hashed_password=password_hash,
                first_name=f"Teacher {number}",
                last_name="User",
                role=UserRole.TEACHER,
                status=UserStatus.ACTIVE,
            )
            for number in (1, 2)
        ]
        student_users = [
            User(
                email=f"student{number}@attendance.local",
                hashed_password=password_hash,
                first_name=f"Student {number}",
                last_name="User",
                role=UserRole.STUDENT,
                status=UserStatus.ACTIVE,
            )
            for number in range(1, 11)
        ]
        db.add_all([admin, *teacher_users, *student_users])
        db.flush()

        teachers = [
            Teacher(
                id=user.id,
                employee_id=f"EMP-{number:03d}",
                department="Computer Science",
                office_location=f"Block A-{number}",
            )
            for number, user in enumerate(teacher_users, 1)
        ]
        students = [
            Student(
                id=user.id,
                roll_number=f"STU-{number:03d}",
                batch_year=2026,
                department="Computer Science",
            )
            for number, user in enumerate(student_users, 1)
        ]
        db.add_all([*teachers, *students])
        db.flush()

        courses = [
            Course(
                course_code="CS101",
                title="Introduction to Computer Science",
                description="Core computing concepts and problem solving.",
                instructor_id=teachers[0].id,
                semester="Fall 2026",
            ),
            Course(
                course_code="CS202",
                title="Database Systems",
                description="Relational modeling, SQL, and database design.",
                instructor_id=teachers[1].id,
                semester="Fall 2026",
            ),
        ]
        db.add_all(courses)
        db.flush()
        db.add_all(
            CourseEnrollment(course_id=course.id, student_id=student.id)
            for course in courses
            for student in students
        )


if __name__ == "__main__":
    seed_database()
