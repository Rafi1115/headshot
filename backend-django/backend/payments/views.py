import stripe
import logging
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from jobs.models import Job
from .models import Payment

logger = logging.getLogger(__name__)
stripe.api_key = settings.STRIPE_SECRET_KEY

# Package prices in cents
PACKAGE_PRICES = {
    "INSTANT": 100,  # $1
    "PRO":     200,  # $2
}

PACKAGE_NAMES = {
    "INSTANT": "Instant Headshots (5-10 photos)",
    "PRO":     "Pro Headshots (20-40 photos)",
}


@method_decorator(csrf_exempt, name='dispatch')
class CreateCheckoutSessionView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, job_id):
        try:
            job = Job.objects.get(id=job_id)
        except Job.DoesNotExist:
            return Response({"error": "Job not found"}, status=404)

        if job.has_paid():
            return Response({"error": "Job already paid"}, status=400)

        package = job.package
        price_amount = PACKAGE_PRICES.get(package, PACKAGE_PRICES["INSTANT"])
        package_name = PACKAGE_NAMES.get(package, "AI Headshot Generation")

        try:
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                mode="payment",
                line_items=[{
                    "price_data": {
                        "currency": "usd",
                        "unit_amount": price_amount,
                        "product_data": {
                            "name": package_name,
                            "description": f"Professional AI-generated headshots — {package} package",
                        },
                    },
                    "quantity": 1,
                }],
                metadata={"job_id": str(job.id)},
                customer_email=job.email,
                success_url=f"{settings.FRONTEND_BASE_URL}/success?job_id={job.id}",
                cancel_url=f"{settings.FRONTEND_BASE_URL}/cancel?job_id={job.id}",
            )
            return Response({"checkout_url": session.url, "session_id": session.id})

        except stripe.StripeError as e:
            logger.error(f"Stripe error for job {job_id}: {e}")
            return Response({"error": str(e)}, status=500)


@csrf_exempt
def stripe_webhook(request):
    payload = request.body
    try:
        event = stripe.Event.construct_from(
            __import__('json').loads(payload), stripe.api_key
        )
    except Exception as e:
        print(f"[WEBHOOK ERROR] {e}")
        return HttpResponse(status=400)

    print(f"[WEBHOOK] Event: {event['type']}")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        metadata = session.metadata or {}
        job_id = metadata.get("job_id") if hasattr(metadata, 'get') else getattr(metadata, 'job_id', None)

        if not job_id:
            return HttpResponse(status=200)

        try:
            job = Job.objects.get(id=job_id)
        except Job.DoesNotExist:
            return HttpResponse(status=200)

        try:
            Payment.objects.get_or_create(
                provider="stripe",
                provider_payment_id=session.id,
                defaults={
                    "job": job,
                    "amount": session.amount_total or 0,
                    "status": Payment.Status.SUCCESS,
                }
            )
        except Exception as e:
            print(f"[WEBHOOK] payment error: {e}")
            return HttpResponse(status=200)

        try:
            if job.status == "FAILED" and job.best_image:
                job.status = "PENDING"
                job.save()
            from jobs.orchestrator import try_mark_job_ready
            try_mark_job_ready(job)
        except Exception as e:
            print(f"[WEBHOOK] orchestrator error: {e}")

    return HttpResponse(status=200)


class AdminPaymentDashboardView(APIView):

    def get(self, request):
        jobs = Job.objects.prefetch_related('payments').order_by('-created_at')
        data = []
        for job in jobs:
            payments = job.payments.all()
            successful = payments.filter(status="SUCCESS")
            data.append({
                "job_id": job.id,
                "email": job.email,
                "package": job.package,
                "status": job.status,
                "created_at": job.created_at.strftime("%Y-%m-%d %H:%M"),
                "payment_status": "PAID" if job.has_paid() else "UNPAID",
                "total_paid_amount": sum(p.amount for p in successful) / 100,
                "successful_payments": [
                    {"id": p.provider_payment_id, "amount": p.amount / 100, "date": p.created_at.strftime("%Y-%m-%d %H:%M")}
                    for p in successful
                ],
            })

        return Response({
            "total_jobs": len(data),
            "paid_jobs": sum(1 for d in data if d["payment_status"] == "PAID"),
            "jobs": data
        })