import asyncio
import base64
import logging
import smtplib
from email.message import EmailMessage
from typing import List, Optional, Tuple

from app.core.config import settings

logger = logging.getLogger(__name__)

# Each attachment is (filename, bytes, mime_type)
Attachment = Tuple[str, bytes, str]


async def send_email(
    subject: str,
    to_email: str,
    plain_body: str,
    html_body: str | None = None,
    attachments: Optional[List[Attachment]] = None,
) -> bool:
    """Send an email over SMTP. Returns True on success, False if not configured or on failure."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP credentials not configured; skipping email to %s", to_email)
        return False
    try:
        await asyncio.to_thread(_send_sync, subject, to_email, plain_body, html_body, attachments)
        logger.info("Email sent to %s: %s", to_email, subject)
        return True
    except Exception:
        logger.exception("Failed to send email to %s", to_email)
        return False


def _send_sync(
    subject: str,
    to_email: str,
    plain_body: str,
    html_body: str | None,
    attachments: Optional[List[Attachment]],
) -> None:
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_USER
    msg["To"] = to_email
    msg.set_content(plain_body)
    if html_body:
        msg.add_alternative(html_body, subtype="html")

    for filename, payload, mime_type in attachments or []:
        msg.add_attachment(
            base64.b64encode(payload),
            maintype=mime_type.split("/")[0],
            subtype=mime_type.split("/")[1] if "/" in mime_type else "octet-stream",
            filename=filename,
        )

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)
