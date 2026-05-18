import base64
import logging
import resend
from django.conf import settings

logger = logging.getLogger(__name__)

resend.api_key = settings.RESEND_API_KEY


def send_results_email_zip(email, zip_buffer, package, count):
    logger.info(f"Sending zip email to {email} — {count} headshots ({package} package)")

    if not settings.RESEND_API_KEY:
        raise RuntimeError("RESEND_API_KEY is not configured in Django settings")

    package_label = "Instant" if package == "INSTANT" else "Pro"

    subject = f"Your {package_label} AI Headshots Are Ready!"
    body_text = (
        f"Hi there!\n\n"
        f"Your {package_label} package headshots are ready.\n"
        f"We've generated {count} professional headshots for you.\n\n"
        f"Please find your headshots attached as a ZIP file.\n"
        f"Extract the ZIP to view all your photos.\n\n"
        f"Thank you for using HeadshotAI!\n"
    )
    body_html = (
        f"<p>Hi there!</p>"
        f"<p>Your {package_label} package headshots are ready.</p>"
        f"<p>We've generated {count} professional headshots for you.</p>"
        f"<p>Please find your headshots attached as a ZIP file.</p>"
        f"<p>Extract the ZIP to view all your photos.</p>"
        f"<p>Thank you for using HeadshotAI!</p>"
    )

    zip_buffer.seek(0)
    attachment_content = base64.b64encode(zip_buffer.read()).decode("ascii")

    params = {
        "from": settings.DEFAULT_FROM_EMAIL,
        "to": [email],
        "subject": subject,
        "text": body_text,
        "html": body_html,
        "attachments": [
            {
                "filename": f"headshots_{package.lower()}.zip",
                "content": attachment_content,
                "content_type": "application/zip",
            }
        ],
    }

    try:
        response = resend.Emails.send(params)
        logger.info(
            f"Zip email sent successfully to {email}. email_id={getattr(response, 'id', None)}"
        )
    except Exception as e:
        logger.error(f"Failed to send zip email to {email}: {e}")
        raise e