from django.db import models

class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING"
        SUCCESS = "SUCCESS"
        FAILED  = "FAILED"

    job                 = models.ForeignKey('jobs.Job', on_delete=models.CASCADE, related_name="payments")
    provider            = models.CharField(max_length=50, default="pending")
    provider_payment_id = models.CharField(max_length=255)   # unique enforced via unique_together
    amount              = models.IntegerField()               # in cents / smallest currency unit
    status              = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at          = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("provider", "provider_payment_id")  # safe across multiple payment providers
        indexes = [models.Index(fields=["job", "status"])]     # speeds up has_paid() queries