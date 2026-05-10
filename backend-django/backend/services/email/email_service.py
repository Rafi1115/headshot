import logging
from django.core.mail import EmailMessage
from django.conf import settings

logger = logging.getLogger(__name__)


def send_results_email_zip(email, zip_buffer, package, count):
    logger.info(f"Sending zip email to {email} — {count} headshots ({package} package)")

    package_label = "Instant" if package == "INSTANT" else "Pro"

    subject = f"Your {package_label} AI Headshots Are Ready!"
    body = (
        f"Hi there!\n\n"
        f"Your {package_label} package headshots are ready.\n"
        f"We've generated {count} professional headshots for you.\n\n"
        f"Please find your headshots attached as a ZIP file.\n"
        f"Extract the ZIP to view all your photos.\n\n"
        f"Thank you for using HeadshotAI!\n"
    )

    msg = EmailMessage(
        subject=subject,
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[email],
    )
    msg.attach(f"headshots_{package.lower()}.zip", zip_buffer.read(), "application/zip")

    try:
        msg.send(fail_silently=False)
        logger.info(f"Zip email sent successfully to {email}")
    except Exception as e:
        logger.error(f"Failed to send zip email to {email}: {e}")
        raise e