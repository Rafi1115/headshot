SKIN_TONE_MAP = {
    "very_light": "fair skin",
    "light":      "light skin",
    "medium":     "medium skin tone",
    "tan":        "tan skin tone",
    "dark":       "dark skin tone",
    "very_dark":  "deep dark skin tone",
    "unknown":    "natural skin tone"
}

# Variation styles for multi-shot generation
VARIATIONS = [
    {"background": "neutral gray",    "lighting": "soft studio lighting",       "style": "classic corporate"},
    {"background": "white",           "lighting": "bright even lighting",        "style": "clean minimal"},
    {"background": "dark navy",       "lighting": "dramatic rim lighting",       "style": "executive dark"},
    {"background": "light blue",      "lighting": "natural daylight",            "style": "approachable friendly"},
    {"background": "blurred office",  "lighting": "professional indoor light",   "style": "in-office professional"},
    {"background": "gradient gray",   "lighting": "soft diffused light",         "style": "modern LinkedIn"},
    {"background": "warm beige",      "lighting": "warm studio lighting",        "style": "warm professional"},
    {"background": "dark charcoal",   "lighting": "moody dramatic lighting",     "style": "bold executive"},
    {"background": "soft green",      "lighting": "natural outdoor light",       "style": "fresh approachable"},
    {"background": "pure white",      "lighting": "high key lighting",           "style": "bright premium"},
]


def build_prompt(data, variation_index=0):
    age_text    = data.get("age_text", "adult")
    gender_text = data.get("gender_text", "person")
    emotion     = data.get("emotion_text", "neutral expression")
    skin_label  = data.get("skin_text", "unknown")

    skin_phrase = SKIN_TONE_MAP.get(skin_label, "natural skin tone")

    # cycle through variations
    variation = VARIATIONS[variation_index % len(VARIATIONS)]

    positive = (
        f"Same person, identical face, preserve exact facial identity. "
        f"Ultra-realistic professional headshot of a {age_text} {gender_text}, "
        f"{skin_phrase}, {emotion}. "
        f"Minimal changes to original face, maintain facial structure, eyes, nose, lips, skin texture. "
        f"{variation['lighting']}, 85mm portrait lens, shallow depth of field, bokeh. "
        f"{variation['style']} style, {variation['background']} background. "
        f"Corporate LinkedIn profile photo, sharp focus, photorealistic, high detail."
    )

    negative = (
        "different person, changed identity, altered face, distorted face, deformed eyes, "
        "asymmetric face, cartoon, anime, painting, illustration, low quality, blurry, watermark, text"
    )

    return {
        "prompt": positive,
        "negative_prompt": negative,
        "gender": gender_text,
        "variation": variation["style"]
    }