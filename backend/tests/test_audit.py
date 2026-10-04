from uuid import uuid4

from sqlalchemy.orm import Session

from app.models import AuditLog
from app.services.audit_service import log_security_event


def test_security_event_is_appended_to_audit_log(db_session: Session) -> None:
    resource_id = uuid4()
    event = log_security_event(
        db_session,
        action="FAILED_SCAN",
        resource_type="ATTENDANCE_SESSION",
        resource_id=resource_id,
        payload={"reason": "expired_token"},
        ip_address="192.0.2.10",
        user_agent="test-client",
    )
    db_session.commit()

    saved_event = db_session.get(AuditLog, event.id)
    assert saved_event is not None
    assert saved_event.action == "FAILED_SCAN"
    assert saved_event.resource_id == str(resource_id)
    assert saved_event.payload == {"reason": "expired_token"}
