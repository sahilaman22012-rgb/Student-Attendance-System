from __future__ import annotations

import csv
import re
from io import BytesIO, StringIO
from typing import Iterator
from uuid import UUID
from xml.sax.saxutils import escape

from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.course import Course
from app.models.record import AttendanceRecord
from app.models.session import AttendanceSession
from app.models.user import Student, User


def _course_export_rows(db: Session, course_id: UUID) -> tuple[Course, list[tuple[str, str, str, str]]]:
    course = db.get(Course, course_id)
    if course is None:
        raise LookupError("Course not found")
    rows = db.execute(
        select(
            Student.roll_number,
            User.first_name,
            User.last_name,
            AttendanceRecord.marked_at,
            AttendanceRecord.status,
        )
        .join(User, User.id == Student.id)
        .join(AttendanceRecord, AttendanceRecord.student_id == Student.id)
        .join(AttendanceSession, AttendanceSession.id == AttendanceRecord.session_id)
        .where(AttendanceSession.course_id == course_id)
        .order_by(Student.roll_number, AttendanceRecord.marked_at)
    ).all()
    export_rows = [
        (
            roll_number,
            f"{first_name} {last_name}".strip(),
            marked_at.isoformat(),
            status.value if hasattr(status, "value") else str(status),
        )
        for roll_number, first_name, last_name, marked_at, status in rows
    ]
    return course, export_rows


def generate_course_csv(db: Session, course_id: UUID) -> StreamingResponse:
    """Generate an RFC 4180 CSV export of recorded attendance check-ins."""
    course, rows = _course_export_rows(db, course_id)
    buffer = StringIO(newline="")
    writer = csv.writer(buffer, dialect="excel", lineterminator="\r\n")
    writer.writerow(("Roll Number", "Student Name", "Timestamp", "Attendance Status"))
    writer.writerows(rows)
    content = buffer.getvalue().encode("utf-8")

    def stream() -> Iterator[bytes]:
        yield content

    safe_course_code = re.sub(r"[^A-Za-z0-9_-]+", "_", course.course_code).strip("_") or "course"
    filename = f"{safe_course_code}-attendance.csv"
    return StreamingResponse(
        stream(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def generate_course_pdf(db: Session, course_id: UUID) -> StreamingResponse:
    """Generate an institutional PDF roster report with attendance statuses."""
    course, rows = _course_export_rows(db, course_id)
    output = BytesIO()
    document = SimpleDocTemplate(
        output,
        pagesize=landscape(A4),
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
        title=f"{course.course_code} Attendance Report",
        author="Secure Dynamic QR Attendance System",
    )
    styles = getSampleStyleSheet()
    elements = [
        Paragraph("Attendance Report", styles["Title"]),
        Paragraph(
            f"{escape(course.course_code)} — {escape(course.title)} | Semester: {escape(course.semester)}",
            styles["Heading2"],
        ),
        Paragraph(f"Recorded attendance entries: {len(rows)}", styles["Normal"]),
        Spacer(1, 14),
    ]
    table_data = [["Roll Number", "Student Name", "Timestamp", "Attendance Status"], *rows]
    table = Table(table_data, repeatRows=1, colWidths=[110, 190, 260, 130])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#182443")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CBD2E1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F2F4F8")]),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    elements.append(table)
    document.build(elements)
    content = output.getvalue()

    def stream() -> Iterator[bytes]:
        yield content

    safe_course_code = re.sub(r"[^A-Za-z0-9_-]+", "_", course.course_code).strip("_") or "course"
    filename = f"{safe_course_code}-attendance.pdf"
    return StreamingResponse(
        stream(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
