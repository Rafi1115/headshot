import logging
logger = logging.getLogger(__name__)

from images.models import Image
from services.generation.generator import generate_multiple_headshots
from services.storage.cloudinary_service import upload_to_cloudinary
from services.download.download import download_image


def run_pipeline(job):
    if not job.best_image:
        raise Exception("No best image selected for this job")

    image = job.best_image
    count = job.get_output_count()  # 5 for INSTANT, 20 for PRO

    logger.info(f"[PIPELINE] Job {job.id} | Package: {job.package} | Generating {count} headshots")

    try:
        # Upload original to Cloudinary so Replicate can access it
        image_url = upload_to_cloudinary(image.file.path)

        # Base prompt data — build_prompt handles variations internally
        prompt_data = {
            "age_text": "adult",
            "gender_text": "person",
            "emotion_text": "neutral expression",
            "skin_text": "unknown"
        }

        # Generate all headshots with variations
        urls = generate_multiple_headshots(image_url, prompt_data, count)

        if not urls:
            raise Exception("No headshots were generated successfully.")

        # Save each output image to DB
        for i, output_url in enumerate(urls):
            try:
                image_file = download_image(output_url)
                output_image_obj = Image.objects.create(job=job, type="OUTPUT")
                output_image_obj.file.save(
                    f"output_{job.id}_{i+1}.png",
                    image_file
                )
                output_image_obj.generated_url = output_url
                output_image_obj.save()
                logger.info(f"[PIPELINE] Saved output {i+1}/{len(urls)} for job {job.id}")
            except Exception as e:
                logger.error(f"[PIPELINE] Failed to save output {i+1}: {e}")

        logger.info(f"[PIPELINE] Job {job.id} done. {len(urls)} headshots saved.")

    except Exception as e:
        raise Exception(f"Pipeline failed: {str(e)}")