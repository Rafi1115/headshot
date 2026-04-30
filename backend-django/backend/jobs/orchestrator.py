from django.utils import timezone
from django.db import transaction
from jobs.models import Job
from jobs.tasks import process_job
import logging

logger = logging.getLogger(__name__)

def try_mark_job_ready(job):
    """
    Job Readiness Trigger — called after both image scoring and the payment webhook.
    
    This acts as the final gatekeeper before expensive AI generation begins.
    It guarantees that we have both a valid scored image AND a successful payment.
    """
    # STRICT GATE: Require the scoring task to finish (best_image is set) AND payment to be complete
    if job.best_image is not None and job.has_paid():
        
        # Only trigger if the job hasn't already been marked as READY or PROCESSING
        if job.status == Job.Status.PENDING:
            
            # 1. Update the database state
            job.status = Job.Status.READY
            job.ready_at = timezone.now()
            job.save(update_fields=["status", "ready_at"])
            
            # 2. Trigger the Celery worker SAFELY
            # Using transaction.on_commit ensures the worker doesn't try to fetch 
            # the job from the database before the READY status is actually saved.
            transaction.on_commit(lambda: process_job.delay(job.id))
            
            logger.info(f"Job {job.id} marked as READY and triggered generation processing.")
        else:
            logger.info(f"Job {job.id} is already past PENDING status (Current: {job.status}).")
    else:
        logger.info(f"Job {job.id} not ready yet. Has best image: {job.best_image is not None}, Has paid (Bypassed): {job.has_paid()}")