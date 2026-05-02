from django.urls import path
from .views import CreateCheckoutSessionView, stripe_webhook, AdminPaymentDashboardView

urlpatterns = [
    path('<int:job_id>/checkout/', CreateCheckoutSessionView.as_view()),
    path('webhook/', stripe_webhook),
    path('dashboard/', AdminPaymentDashboardView.as_view()),
]