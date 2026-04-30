import stripe
import logging
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction # ✅ Required for safe saving

from jobs.models import Job
from jobs.orchestrator import try_mark_job_ready
from payments.models import StripeEvent, Payment

stripe.api_key = settings.STRIPE_SECRET_KEY
logger = logging.getLogger(__name__)

def _stripe_webhook_impl(request):
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")

    # --- STEP 1: Verify signature (STRICT) ---
    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.error.SignatureVerificationError) as e:
        logger.error("Invalid payload/signature: %s", str(e))
        return HttpResponse(status=400)

    event_id = event["id"]
    event_type = event["type"]
    logger.info("Stripe event received: %s", event_type)


    if StripeEvent.objects.filter(event_id=event_id).exists():
        logger.info("Duplicate event ignored: %s", event_id)
        return HttpResponse(status=200)
    StripeEvent.objects.create(event_id=event_id, event_type=event_type)


    if event_type == "checkout.session.completed":
        session = event["data"]["object"]
        session_id = session.get("id")
        logger.error("EVENT TYPE: %s", event_type)
        logger.error("SESSION: %s", session)
        metadata = session.get("metadata", {})
        job_id = metadata.get("job_id")
        if not job_id:
            logger.error("Missing job_id in metadata for session %s", session_id)
            return HttpResponse(status=200)
        try:
            job = Job.objects.get(id=job_id)
        except Job.DoesNotExist:
            logger.error("Job %s not found for session %s", job_id, session_id)
            return HttpResponse(status=200)
        except Exception as e:
            logger.exception("DB error fetching job %s: %s", job_id, e)
            return HttpResponse(status=500)
        # --- TEMP: Force job as paid, trigger job directly ---
        try:
            job.has_paid = True
            job.save(update_fields=["has_paid"]) if hasattr(job, "has_paid") else None
            try_mark_job_ready(job)
            job.refresh_from_db()
            logger.info("Orchestrator called. Job status: %s", job.status)
        except Exception as e:
            logger.exception("Processing trigger failed for job %s: %s", job.id, e)
    elif event_type.startswith("payment_intent."):
        logger.info("Ignoring payment_intent event: %s", event_type)
    return HttpResponse(status=200)

@csrf_exempt
def stripe_webhook(request):
    try:
        return _stripe_webhook_impl(request)
    except Exception as e:
        logger.exception("🔥 GLOBAL WEBHOOK CRASH: %s", e)
        return HttpResponse(status=500) # ✅ Tell Stripe to retry