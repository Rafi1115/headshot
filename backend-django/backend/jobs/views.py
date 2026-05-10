from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Job
from images.models import Image
from services.validator_instance import get_validator
from services.score.scoring import score_image
from jobs.tasks import process_job
from jobs.orchestrator import try_mark_job_ready
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.permissions import IsAuthenticated, AllowAny
from analytics.models import Analytics
from django.db.models import F


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
        package = request.data.get('package', 'INSTANT').upper()

        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

        if package not in [Job.Package.INSTANT, Job.Package.PRO]:
            return Response({"error": "Invalid package. Choose INSTANT or PRO."}, status=status.HTTP_400_BAD_REQUEST)

        job = Job.objects.create(email=email, package=package)
        return Response({
            "job_id": job.id,
            "package": job.package,
            "max_input_images": job.get_max_input_images(),
            "output_count": job.get_output_count(),
        }, status=status.HTTP_201_CREATED)


@method_decorator(csrf_exempt, name='dispatch')
class UploadImageView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, job_id):
        try:
            job = Job.objects.get(id=job_id)
        except Job.DoesNotExist:
            return Response({"error": "Job not found"}, status=404)

        if job.status not in [Job.Status.PENDING]:
            return Response({"error": "Images already uploaded or job not in correct state."}, status=400)

        files = request.FILES.getlist('images')

        if not files:
            return Response({"error": "No images provided"}, status=400)

        # enforce per-package limits
        max_allowed = job.get_max_input_images()
        if len(files) > max_allowed:
            return Response({
                "error": f"Package '{job.package}' allows max {max_allowed} image(s)."
            }, status=400)

        max_size = 10 * 1024 * 1024  # 10MB
        for f in files:
            if f.size > max_size:
                return Response({"error": f"File '{f.name}' exceeds 10MB limit."}, status=400)

        for f in files:
            Image.objects.create(job=job, file=f, type=Image.Type.INPUT)

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
            "package": job.package,
            "payment_status": "PAID" if job.has_paid() else "PENDING",
            "input_images": [img.file.url for img in input_images if img.file],
            "output_images": [img.generated_url for img in output_images if img.generated_url],
            "best_image": job.best_image.file.url if job.best_image else None,
            "error": job.error_message
        })


class TrackView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        views_obj, _ = Analytics.objects.get_or_create(key="website_views")
        Analytics.objects.filter(pk=views_obj.pk).update(value=F('value') + 1)
        views_obj.refresh_from_db()
        return Response({"status": "tracked", "views": views_obj.value})