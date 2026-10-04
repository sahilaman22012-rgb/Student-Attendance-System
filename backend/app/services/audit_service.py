from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.audit import AuditLog


def log_security_event(
    db: Session,
    action: str,
    resource_type: str,
    actor_id: UUID | None = None,
    resource_id: UUID | None = None,
    payload: dict[str, Any] | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> AuditLog:
    """Append an audit event and persist it in the caller's transaction."""
    event = AuditLog(
        action=action,
        resource_type=resource_type,
        actor_id=actor_id,
        resource_id=str(resource_id) if resource_id is not None else None,
        payload=payload,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(event)
    db.flush()
    return event
