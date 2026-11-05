from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


AttendanceStatus = Literal["PRESENT", "LATE", "EXCUSED", "ABSENT"]


class AttendanceMark(BaseModel):
    student_id: UUID
    status: AttendanceStatus


class ManualAttendanceCreate(BaseModel):
    course_id: UUID
    start_time: datetime
    records: list[AttendanceMark] = Field(min_length=1)


class QrSessionCreate(BaseModel):
    course_id: UUID
    duration_minutes: int = Field(default=5, ge=1, le=60)


class QrScanCreate(BaseModel):
    nonce: str = Field(min_length=20, max_length=255)
    device_id: str = Field(min_length=16, max_length=128)


class AttendanceSessionOut(BaseModel):
    id: UUID
    course_id: UUID
    start_time: datetime
    end_time: datetime | None
    token_ttl_seconds: int
    status: str
    course_code: str | None = None
    course_title: str | None = None
    attendance_rate: float | None = None


class QrTokenOut(BaseModel):
    session_id: UUID
    nonce: str
    expires_at: datetime


class StudentAttendanceSummaryOut(BaseModel):
    course_id: UUID
    course_code: str
    course_title: str
    total_completed_sessions: int
    sessions_attended: int
    attendance_rate: float
    is_low_attendance: bool


class StudentAttendanceLogOut(BaseModel):
    id: UUID
    course_code: str
    course_title: str
    marked_at: datetime
    status: str
    method: str
