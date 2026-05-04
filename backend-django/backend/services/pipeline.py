import logging
logger = logging.getLogger(__name__)

from images.models import Image
from services.generation.generator import generate_headshot
from services.storage.cloudinary_service import upload_to_cloudinary
from services.download.download import download_image

def run_pipeline(job):
    if not job.best_image:
        raise Exception("No best image selected for this job")

    image = job.best_image

    try:
        # Upload original to Cloudinary so Replicate can access it
        image_url = upload_to_cloudinary(image.file.path)

        # Generic prompt — Replicate handles the face analysis internally
        prompt = {
            "prompt": "Ultra-realistic professional headshot, studio lighting, soft shadows, 85mm portrait lens, clean neutral background, sharp focus, photorealistic, corporate LinkedIn profile photo.",
            "negative_prompt": "cartoon, anime, painting, low quality, blurry, watermark",
            "gender": "none"
        }

        output_url = generate_headshot(image_url, prompt)

        image_file = download_image(output_url)

        output_image_obj = Image.objects.create(job=job, type="OUTPUT")
        output_image_obj.file.save(f"output_{job.id}_{image.id}.png", image_file)

        cloudinary_url = upload_to_cloudinary(output_image_obj.file.path)
        output_image_obj.generated_url = cloudinary_url
        output_image_obj.save()

    except Exception as e:
        raise Exception(f"Pipeline failed: {str(e)}")
