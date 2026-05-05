"""
Async validation and scoring task
Feat: v15.2.0- This new Celery task validates and scores uploaded images asynchronously. It retrieves all input images for a given job, runs them through the validator, and scores the valid ones. The best image is selected based on the highest score and set as the job's best_image. If all images fail validation, the job status is set to FAILED with an appropriate error message. This task is triggered after images are uploaded to ensure that only valid and high-quality images are processed in the pipeline.

jobs/tasks.py
Feat: version 5.0.1 - Implemented Celery task for processing jobs asynchronously. This task retrieves a job by its ID, updates its status to "PROCESSING", runs the pipeline (which includes validation, analysis, and generation), and then updates the job status to "COMPLETED" or "FAILED" based on the outcome. This enhancement allows for efficient handling of long-running tasks without blocking the main application thread, improving overall performance and user experience.

Feat: v16.0.0 - Descriptive per-image rejection reasons are now collected and surfaced
in job.error_message so the frontend can show the user exactly why their photos failed.
"""
import logging
from celery import shared_task
from jobs.models import Job
from images.models import Image
from services.email.email_service import send_results_email

from django.db import transaction
from services.pipeline import run_pipeline
from services.validator_instance import get_validator
from services.score.scoring import score_image

@shared_task
def validate_and_score_images(job_id):
    # Validates and scores all input images for a job.
    # Deletes invalid images.
    # Scores valid images and selects the best one.
    # Updates job.best_image or marks job as FAILED if none valid.
    # feat: v16.0.0 - Collects per-image rejection reasons for frontend display.
    logger = logging.getLogger(__name__)

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

            # feat: v16.0.0 — Build a descriptive error from per-image rejection reasons
            # Strip the "Validation failed: " prefix so frontend gets clean reasons
            reasons = []
            for r in rejected_images:
                reason = r["reason"]
                reason = reason.replace("Validation failed: ", "").replace("validation failed: ", "")
                reasons.append(reason)

            if reasons:
                # Deduplicate while preserving order
                seen = set()
                unique_reasons = []
                for r in reasons:
                    if r not in seen:
                        seen.add(r)
                        unique_reasons.append(r)
                job.error_message = "Validation failed: " + "; ".join(unique_reasons[:3])
            else:
                job.error_message = "All images failed validation"

            job.save()
            logger.warning(f"[VALIDATE] All images failed for job {job.id}. Reasons: {reasons}")
            return

        # Select best image by score
        valid_images.sort(key=lambda x: x.score or 0, reverse=True)
        best_image = valid_images[0]
        job.best_image = best_image
        job.save()
        logger.info(f"[VALIDATE] Best image for job {job.id}: {best_image.file.name}")

        # Trigger orchestrator to check if payment is also done and start processing
        from jobs.orchestrator import try_mark_job_ready
        try_mark_job_ready(job)


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3}
)
def process_job(self, job_id):
    # Processes a job:
    # Checks idempotency and payment.
    # Runs the pipeline (validation, analysis, generation).
    # Marks job as COMPLETED or FAILED.
    # Sends results email (non-blocking).
    logger = logging.getLogger(__name__)

    with transaction.atomic():
        try:
            job = Job.objects.select_for_update().get(id=job_id)
        except Job.DoesNotExist:
            logger.error(f"[PROCESS] Job {job_id} not found.")
            return

        # Idempotency guard
        if job.status in [Job.Status.COMPLETED]:
            logger.info(f"[PROCESS] Job {job.id} already completed. Skipping.")
            return

        job.status = Job.Status.PROCESSING
        job.save()

    try:
        logger.info(f"[PROCESS] Running pipeline for job {job_id}")
        run_pipeline(job)

        # Ensure at least one output image exists
        output_images = job.images.filter(type=Image.Type.OUTPUT)
        urls = [img.generated_url for img in output_images if img.generated_url]
        if not urls:
            raise Exception("Pipeline finished but no output images were saved to DB.")

        job.status = Job.Status.COMPLETED
        job.save()

        try:
            send_results_email(job.email, urls)
        except Exception as e:
            logger.error(f"[PROCESS] Email delivery failed for Job {job.id}: {e}")

        logger.info(f"[PROCESS] Job {job.id} completed successfully.")

    except Exception as e:
        job.status = Job.Status.FAILED
        job.error_message = str(e)
        job.save()
        logger.error(f"[PROCESS] Job {job.id} failed: {e}")
        logger.error(f"[JOB {job.id}] Critical Failure: {e}")