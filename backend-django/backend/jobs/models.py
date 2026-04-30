from django.db import models


#feat: v16.0.0 - Refactored Job model to remove payment_status and use Payment model instead. (Separation of Concerns )
class Job(models.Model):
    class Status(models.TextChoices):
        PENDING    = "PENDING"
        READY      = "READY"
        PROCESSING = "PROCESSING"
        COMPLETED  = "COMPLETED"
        FAILED     = "FAILED"

    email  = models.EmailField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )

    best_image = models.ForeignKey(
        'images.Image',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="selected_for_jobs"
    )

    # ✅ REMOVED images_uploaded — has_input_images() is the single source of truth

    ready_at      = models.DateTimeField(null=True, blank=True)  # ✅ added
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)
    error_message = models.TextField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["status"])]

    def has_input_images(self):
        return self.images.filter(type="INPUT").exists()

    def has_paid(self):
        """
        TEMPORARY: Bypassing payment check for development.
        """
        return True


    def is_ready(self):
        return self.best_image is not None and self.has_paid()

    def __str__(self):
        return f"Job {self.id} - {self.status}"