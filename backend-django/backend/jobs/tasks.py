import io
import os
import zipfile
import logging
import requests

from celery import shared_task
from django.db import transaction

from jobs.models import Job
from images.models import Image
from services.email.email_service import send_results_email_zip
from services.pipeline import run_pipeline
from services.validator_instance import get_validator
from services.score.scoring import score_image

logger = logging.getLogger(__name__)


@shared_task
def validate_and_score_images(job_id):
    with transaction.atomic():
        try:
            job = Job.objects.select_for_update().get(id=job_id)
        except Job.DoesNotExist:
            logger.error(f"[VALIDATE] Job {job_id} not found.")
            return

        images = job.images.filter(type=Image.Type.INPUT)
        valid_images = []
        rejected_images = []

        for img in images:
            try:
                valid, msg, face_info = get_validator().validate(img.file.path)
            except Exception as e:
                logger.error(f"[VALIDATE] Error validating {img.file.name}: {e}")
                valid = False
                msg = str(e)
                face_info = None

            if not valid:
                rejected_images.append({"file": img.file.name, "reason": msg})
                img.delete()
                continue

            try:
                score = score_image(img.file.path, face_info)
            except Exception as e:
                logger.error(f"[VALIDATE] Error scoring {img.file.name}: {e}")
                score = 0

            img.score = score
            img.save()
            valid_images.append(img)

        if not valid_images:
            job.status = Job.Status.FAILED
            reasons = []
            for r in rejected_images:
                reason = r["reason"].replace("Validation failed: ", "").replace("validation failed: ", "")
                reasons.append(reason)

            seen = set()
            unique_reasons = []
            for r in reasons:
                if r not in seen:
                    seen.add(r)
                    unique_reasons.append(r)

            job.error_message = "Validation failed: " + "; ".join(unique_reasons[:3]) if unique_reasons else "All images failed validation"
            job.save()
            logger.warning(f"[VALIDATE] All images failed for job {job.id}.")
            return

        valid_images.sort(key=lambda x: x.score or 0, reverse=True)
        best_image = valid_images[0]
        job.best_image = best_image
        job.save()

        from jobs.orchestrator import try_mark_job_ready
        try_mark_job_ready(job)


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3}
)
def process_job(self, job_id):
    with transaction.atomic():
        try:
            job = Job.objects.select_for_update().get(id=job_id)
        except Job.DoesNotExist:
            logger.error(f"[PROCESS] Job {job_id} not found.")
            return

        if job.status in [Job.Status.COMPLETED]:
            logger.info(f"[PROCESS] Job {job.id} already completed. Skipping.")
            return

        job.status = Job.Status.PROCESSING
        job.save()

    try:
        logger.info(f"[PROCESS] Running pipeline for job {job_id}")
        run_pipeline(job)

        output_images = job.images.filter(type=Image.Type.OUTPUT)
        urls = [img.generated_url for img in output_images if img.generated_url]

        if not urls:
            raise Exception("Pipeline finished but no output images were saved.")

        # Download all images and zip them
        logger.info(f"[PROCESS] Zipping {len(urls)} images for job {job_id}")
        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for i, url in enumerate(urls):
                try:
                    resp = requests.get(url, timeout=30)
                    resp.raise_for_status()
                    ext = "png" if "png" in url else "jpg"
                    zf.writestr(f"headshot_{i+1}.{ext}", resp.content)
                except Exception as e:
                    logger.warning(f"[PROCESS] Failed to download image {url}: {e}")

        zip_buffer.seek(0)

        job.status = Job.Status.COMPLETED
        job.save()

        try:
            send_results_email_zip(job.email, zip_buffer, job.package, len(urls))
        except Exception as e:
            logger.error(f"[PROCESS] Email delivery failed for Job {job.id}: {e}")

        logger.info(f"[PROCESS] Job {job.id} completed with {len(urls)} headshots.")

    except Exception as e:
        job.status = Job.Status.FAILED
        job.error_message = str(e)
        job.save()
        logger.error(f"[PROCESS] Job {job.id} failed: {e}")