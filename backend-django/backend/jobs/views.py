from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from services.score.scoring import score_image  # feat: v8.0.0 - Importing Score Image function

from .models import Job
from images.models import Image

from services.validator_instance import get_validator

from jobs.tasks import process_job
from jobs.orchestrator import try_mark_job_ready

from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from rest_framework.permissions import IsAuthenticated, AllowAny

class DeleteAllJobsView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        if not request.user.is_staff:
            return Response({"error": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
            
        Job.objects.all().delete()
        return Response({"status": "all jobs deleted"}, status=status.HTTP_204_NO_CONTENT)



@method_decorator(csrf_exempt, name='dispatch')
class CreateJobView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

        job = Job.objects.create(email=email)
        return Response({"job_id": job.id}, status=status.HTTP_201_CREATED)


@method_decorator(csrf_exempt, name='dispatch')
class UploadImageView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, job_id):
        try:
            job = Job.objects.get(id=job_id)  # Retriving the job using job_id
        except Job.DoesNotExist:
            return Response({"error": "Job not found"}, status=404)


        # Allow upload if job is in PENDING (CREATED) state
        if job.status not in [Job.Status.PENDING]:
            return Response({"error": "Images already uploaded or job not in correct state for upload."}, status=400)


        # Uploading image
        files = request.FILES.getlist('images')

        if not files:
            return Response({"error": "No images provided"}, status=400)

        if len(files) > 5:
            return Response({"error": "Max 5 images allowed"}, status=400)

        # feat: v15.1.0 - File size validation (max 10MB per image)
        max_size = 10 * 1024 * 1024  # 10MB
        for f in files:
            if f.size > max_size:
                return Response({"error": f"File '{f.name}' exceeds 10MB size limit."}, status=400)


        # Save images only, validation/scoring will be async
        for f in files:
            Image.objects.create(
                job=job,
                file=f,
                type=Image.Type.INPUT
            )


        # Trigger async validation/scoring
        from jobs.tasks import validate_and_score_images
        validate_and_score_images.delay(job.id)

        return Response({
            "status": "uploaded, validation started",
            "uploaded_count": len(files)
        })


@method_decorator(csrf_exempt, name='dispatch')
class JobStatusView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, job_id):
        try:
            job = Job.objects.get(id=job_id)
        except Job.DoesNotExist:
            return Response({"error": "Job not found"}, status=404)

        input_images = job.images.filter(type=Image.Type.INPUT)
        output_images = job.images.filter(type=Image.Type.OUTPUT)

        return Response({
            "id": job.id,
            "status": job.status,
            "payment_status": "PAID" if job.has_paid() else "PENDING",
            "input_images": [
                img.file.url for img in input_images if img.file
            ],
            "output_images": [
                img.generated_url for img in output_images if img.generated_url
            ],
            "best_image": job.best_image.file.url if job.best_image else None,
            "error": job.error_message
        })


class TrackView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        from analytics.models import Analytics
        from django.db.models import F
        
        # Issue here, If multiple requests happened at the same time, they could read the same value, increment, and overwrite each other—causing lost updates.
        # views_obj.value += 1
        # views_obj.save()
        
        
        # We replaced the increment with Django’s atomic F() expression:
        #tells Django to increment the value directly in the database, so even if multiple requests happen at once, each increment is applied safely and no updates are lost.
        views_obj, _ = Analytics.objects.get_or_create(key="website_views")
        Analytics.objects.filter(pk=views_obj.pk).update(value=F('value') + 1)
        views_obj.refresh_from_db()
        return Response({"status": "tracked", "views": views_obj.value})