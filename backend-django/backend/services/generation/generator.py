import replicate
import os
import logging

logger = logging.getLogger(__name__)
client = replicate.Client(api_token=os.getenv("REPLICATE_API_TOKEN"))
client.poll_interval = 5.0


def generate_headshot(image_url, prompt):
    positive = prompt.get("prompt")
    gender_input = str(prompt.get("gender", "none")).lower()

    if gender_input in ["man", "boy", "male"]:
        gender = "male"
    elif gender_input in ["woman", "girl", "female"]:
        gender = "female"
    else:
        gender = "none"

    logger.info(f"[GENERATE] prompt={positive[:80]}... gender={gender}")

    output = client.run(
        "flux-kontext-apps/professional-headshot",
        input={
            "input_image": image_url,
            "background": "neutral",
            "gender": gender,
            "aspect_ratio": "1:1",
            "output_format": "png",
            "prompt": positive,
        }
    )
    return output.url


def generate_multiple_headshots(image_url, prompt_data, count):
    """
    Generate `count` headshots with different style variations.
    Returns list of URLs.
    """
    from services.generation.prompt_builder import build_prompt

    urls = []
    failed = 0

    for i in range(count):
        try:
            varied_prompt = build_prompt(prompt_data, variation_index=i)
            logger.info(f"[GENERATE] Shot {i+1}/{count} — variation: {varied_prompt.get('variation')}")
            url = generate_headshot(image_url, varied_prompt)
            if url:
                urls.append(url)
        except Exception as e:
            logger.error(f"[GENERATE] Shot {i+1} failed: {e}")
            failed += 1

    logger.info(f"[GENERATE] Done. {len(urls)} succeeded, {failed} failed.")
    return urls