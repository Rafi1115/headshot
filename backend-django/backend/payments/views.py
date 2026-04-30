from django.shortcuts import render
import stripe

from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings
from jobs.models import Job


# Create your views here.
stripe.api_key = settings.STRIPE_SECRET_KEY


class CreateCheckoutSessionView(APIView):
    def post(self, request, job_id):
        print(f"DEBUG: CreateCheckoutSessionView hit for job_id: {job_id}")
        try:
            job = Job.objects.get(id=job_id)
        except Job.DoesNotExist:
            return Response({"error": "Job not found"}, status=404)

        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="payment",
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": "AI Headshot Generation"
                    },
                    "unit_amount": 500,
                },
                "quantity": 1,
            }],
            success_url=f"{settings.FRONTEND_BASE_URL}/success",
            cancel_url=f"{settings.FRONTEND_BASE_URL}/",
            metadata={
                "job_id": str(job.id),
                "email": job.email
            }
        )

        from payments.models import Payment
        Payment.objects.create(
            job=job,
            provider="stripe",
            provider_payment_id=session.id,
            amount=500,
            status=Payment.Status.PENDING
        )

        return Response({"checkout_url": session.url})