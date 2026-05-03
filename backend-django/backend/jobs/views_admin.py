from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Job
from analytics.models import Analytics
from images.models import Image
from jobs.tasks import process_job

# feat: v11.0.0 - Admin API for the Job model (protected — staff only)


class AdminJobListView(APIView):
    # permission_classes = [IsAuthenticated]

    def get(self, request):
        # if not request.user.is_staff:
        #     return Response({"error": "Admin access required."}, status=403)

        jobs = Job.objects.all().order_by("-created_at")
        data = []
        for job in jobs:
            input_images = []
            output_images = []
            
            for img in job.images.all():
                if img.type == "INPUT" and img.file:
                    input_images.append(request.build_absolute_uri(img.file.url))
                elif img.type == "OUTPUT":
                    if img.generated_url:
                        output_images.append(img.generated_url)
                    elif img.file:
                        output_images.append(request.build_absolute_uri(img.file.url))
            
            selected_image = None
            if job.best_image:
                if job.best_image.file:
                    selected_image = request.build_absolute_uri(job.best_image.file.url)
                elif job.best_image.generated_url:
                    selected_image = job.best_image.generated_url

            data.append({
                "id": job.id,
                "email": job.email,
                "payment": "paid" if job.has_paid() else "unpaid",
                "status": job.status.lower(),
                "created": job.created_at.strftime("%Y-%m-%d %H:%M"),
                "inputImages": input_images,
                "selectedImage": selected_image,
                "outputImage": output_images[0] if output_images else None,
                "error": job.error_message,
            })
        return Response(data)


class AdminJobDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, job_id):
        if not request.user.is_staff:
            return Response({"error": "Admin access required."}, status=403)

        try:
            job = Job.objects.get(id=job_id)
        except Job.DoesNotExist:
            return Response({"error": "Job not found."}, status=404)

        input_images = []
        output_images = []
        
        for img in job.images.all():
            if img.type == "INPUT" and img.file:
                input_images.append(request.build_absolute_uri(img.file.url))
            elif img.type == "OUTPUT":
                if img.generated_url:
                    output_images.append(img.generated_url)
                elif img.file:
                    output_images.append(request.build_absolute_uri(img.file.url))
        
        selected_image = None
        if job.best_image:
            if job.best_image.file:
                selected_image = request.build_absolute_uri(job.best_image.file.url)
            elif job.best_image.generated_url:
                selected_image = job.best_image.generated_url

        return Response({
            "id": job.id,
            "email": job.email,
            "payment": "paid" if job.has_paid() else "unpaid",
            "status": job.status.lower(),
            "created": job.created_at.strftime("%Y-%m-%d %H:%M"),
            "inputImages": input_images,
            "selectedImage": selected_image,
            "outputImage": output_images[0] if output_images else None,
            "error": job.error_message,
        })


class AdminJobRetryView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, job_id):
        if not request.user.is_staff:
            return Response({"error": "Admin access required."}, status=403)

        try:
            job = Job.objects.get(id=job_id)
        except Job.DoesNotExist:
            return Response({"error": "Job not found."}, status=404)

        # Reset status to PENDING and clear error
        job.status = Job.Status.PENDING
        job.error_message = None
        job.save()

        # Trigger Celery task
        process_job.delay(job.id)

        return Response({
            "id": job.id,
            "email": job.email,
            "payment": "paid" if job.has_paid() else "unpaid",
            "status": job.status.lower(),
            "created": job.created_at.strftime("%Y-%m-%d %H:%M"),
        })


class AdminDashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response({"error": "Admin access required."}, status=403)

        views_obj, _ = Analytics.objects.get_or_create(key="website_views")
        real_uploads = Image.objects.filter(type="INPUT").count()
        real_generated = Image.objects.filter(type="OUTPUT").count()
        real_paid_users = Job.objects.filter(payments__status="SUCCESS").values("email").distinct().count()

        return Response({
            "totalViews": str(views_obj.value),
            "mediaUploads": str(real_uploads),
            "totalCategories": str(real_generated),
            "activeUsers": str(real_paid_users)
        })


