from django.db import models

class Job(models.Model):
    class Status(models.TextChoices):
        PENDING    = "PENDING"
        READY      = "READY"
        PROCESSING = "PROCESSING"
        COMPLETED  = "COMPLETED"
        FAILED     = "FAILED"

    class Package(models.TextChoices):
        INSTANT = "INSTANT"
        PRO     = "PRO"

    email   = models.EmailField()
    package = models.CharField(
        max_length=10,
        choices=Package.choices,
        default=Package.INSTANT
    )
    status  = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )

    best_image    = models.ForeignKey(
        'images.Image',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="selected_for_jobs"
    )

    ready_at      = models.DateTimeField(null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)
    error_message = models.TextField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["status"])]

    def has_input_images(self):
        return self.images.filter(type="INPUT").exists()

    def has_paid(self):
        return self.payments.filter(status="SUCCESS").exists()

    def is_ready(self):
        return self.best_image is not None and self.has_paid()

    def get_output_count(self):
        # How many headshots to generate based on package
        if self.package == self.Package.PRO:
            return 20  # min of 20-40 range
        return 5  # min of 5-10 range for instant

    def get_max_input_images(self):
        if self.package == self.Package.PRO:
            return 5
        return 1

    def __str__(self):
        return f"Job {self.id} - {self.package} - {self.status}"