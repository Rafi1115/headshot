import cv2
import numpy as np
from deepface import DeepFace


# ---------------------------------------------------------------------------------------------------------------------------------------------
# 📸 Blur -------------------------------------------------------------------------------------------------------------------------------------
# ---------------------------------------------------------------------------------------------------------------------------------------------
def get_blur_score(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    return cv2.Laplacian(gray, cv2.CV_64F).var()

def assess_blur(score):
    if score < 50:
        return "blurry"
    elif score < 100:
        return "slightly_blurry"
    return "sharp"


# ---------------------------------------------------------------------------------------------------------------------------------------------
# 🎯 Age Group (wide buckets — tolerates DeepFace ±7yr errors) --------------------------------------------------------------------------------
# ----------------------------------------------------------------------------------------------------------------------------------------------
def get_age_group(age):
    if age < 18:
        return "teen"
    elif age < 35:
        return "young"
    elif age < 60:
        return "adult"
    return "old"


# -----------------------------------------------------------------------------------------------------------------------------------------------
# 🎨 Skin Tone (LAB L-channel — lighting invariant)----------------------------------------------------------------------------------------------
# ------------------------------------------------------------------------------------------------------------------------------------------------
def get_skin_tone(face_img_bgr):
    h, w = face_img_bgr.shape[:2]
    cx, cy = w // 2, h // 2
    sample = face_img_bgr[
        int(cy * 0.6):int(cy * 1.2),
        int(cx * 0.6):int(cx * 1.4)
    ]
    if sample.size == 0:
        return {"label": "unknown", "rgb": None}

    lab = cv2.cvtColor(sample, cv2.COLOR_BGR2LAB)
    L = lab[:, :, 0].mean()

    if L > 200:   label = "very_light"
    elif L > 170: label = "light"
    elif L > 140: label = "medium"
    elif L > 110: label = "tan"
    elif L > 75:  label = "dark"
    else:         label = "very_dark"

    avg_bgr = sample.mean(axis=(0, 1))
    r, g, b = avg_bgr[::-1]
    return {
        "label": label,
        "rgb": [int(r), int(g), int(b)],
        "luminance": round(float(L), 2)
    }


# ---------------------------------------------------------------------------------------------------------------------------------------------
# 🧭 Pose (only works with retinaface/mtcnn backends)------------------------------------------------------------------------------------------
# ---------------------------------------------------------------------------------------------------------------------------------------------
def estimate_pose(landmarks):
    if not landmarks:
        return "unknown"
    left_eye = landmarks.get("left_eye")
    right_eye = landmarks.get("right_eye")
    nose = landmarks.get("nose")
    if not (left_eye and right_eye and nose):
        return "unknown"
    left_dist = abs(nose[0] - left_eye[0])
    right_dist = abs(right_eye[0] - nose[0])
    ratio = left_dist / (right_dist + 1e-6)
    if 0.8 < ratio < 1.2:
        return "front-facing"
    elif ratio <= 0.8:
        return "looking right"
    return "looking left"


# ---------------------------------------------------------------------------------------------------------------------------------------------
# 🧠 MAIN ANALYZER ----------------------------------------------------------------------------------------------------------------------------
# ---------------------------------------------------------------------------------------------------------------------------------------------
def analyze_face(image_path, include_embedding=False):
    """
    Main face analysis function.
    include_embedding=False by default — only pass True at generation time.
    """
    image = cv2.imread(image_path)
    if image is None:
        return {"error": "Invalid image"}

    # --- Blur Check ---
    blur_score = get_blur_score(image)
    blur_status = assess_blur(blur_score)
    # Note: We do not return {"error": "Image too blurry"} here because validation
    # already performed a face-crop blur check, and full-image blur check often
    # fails for sharp photos with flat/solid backgrounds.

    # --- Face Detection (fast → accurate fallback) ---
    backends = ["opencv", "mtcnn", "retinaface"]
    faces = []
    used_backend = None

    for backend in backends:
        try:
            faces = DeepFace.extract_faces(
                img_path=image_path,
                detector_backend=backend,
                enforce_detection=True,
                align=True
            )
            if len(faces) == 1:
                used_backend = backend
                break
        except ValueError:
            continue

    if not faces:
        return {"error": "No face detected"}
    if len(faces) > 1:
        return {"error": "Multiple faces detected"}

    face_obj = faces[0]
    face_img_rgb = (face_obj["face"] * 255).astype(np.uint8)
    face_img_bgr = cv2.cvtColor(face_img_rgb, cv2.COLOR_RGB2BGR)
    landmarks = face_obj.get("landmarks", {})

    # --- Attribute Analysis ---
    try:
        analysis = DeepFace.analyze(
            img_path=face_img_bgr,
            actions=["age", "gender", "emotion"],
            detector_backend="skip",
            enforce_detection=False,
            silent=True
        )
        if isinstance(analysis, list):
            analysis = analysis[0]

        raw_age = int(analysis["age"])
        gender_dict = analysis["gender"]
        emotion_dict = analysis["emotion"]
        gender_label = max(gender_dict, key=gender_dict.get)
        emotion_label = max(emotion_dict, key=emotion_dict.get)

    except Exception as e:
        return {"error": f"Analysis failed: {str(e)}"}

    # --- Embedding (optional — only at generation time) ---
    embedding = None
    if include_embedding:
        try:
            embedding_data = DeepFace.represent(
                img_path=face_img_bgr,
                model_name="ArcFace",
                detector_backend="skip",
                enforce_detection=False
            )
            embedding = embedding_data[0]["embedding"][:10]
        except Exception as e:
            return {"error": f"Embedding failed: {str(e)}"}

    # --- Build Result ---
    skin_tone = get_skin_tone(face_img_bgr)

    result = {
        "age_group": get_age_group(raw_age),
        "age_raw": raw_age,
        "gender": {
            "label": gender_label.lower(),
            "confidence": round(float(gender_dict[gender_label]), 2)
        },
        "emotion": {
            "dominant": emotion_label,
            "confidence": round(float(emotion_dict[emotion_label]), 2)
        },
        "skin_tone": skin_tone,
        "pose": estimate_pose(landmarks),
        "detector_used": used_backend,
        "image_quality": {
            "blur_score": round(float(blur_score), 2),
            "quality": blur_status
        }
    }

    if include_embedding:
        result["embedding"] = embedding

    return result



# -------------------------------------------------------------------------------------------------------------------------------------------
# 🎯 NORMALIZATION LAYER (analysis → prompt-ready) ------------------------------------------------------------------------------------------
# --------------------------------------------------------------------------------------------------------------------------------------------
def normalize_analysis(data):
    age = data.get("age_raw", 25)
    age_group = data.get("age_group", "adult")
    gender = data.get("gender", {}).get("label", "person")
    emotion = data.get("emotion", {}).get("dominant", "neutral").lower()

    # --- Age-aware gender text ---
    if age < 16:
        gender_text = "girl" if gender == "woman" else "boy"
    else:
        gender_text = "woman" if gender == "woman" else "man"

    # --- Flatten emotion ---
    if emotion in ["happy", "surprise"]:
        emotion_text = "slight smile"
    else:
        emotion_text = "neutral expression"

    # --- Age text ---
    age_text = f"{age_group}"  # just "teen", "young", "adult", "old"

    return {
        "age_text": age_text,
        "gender_text": gender_text,
        "emotion_text": emotion_text,
        "skin_text": data.get("skin_tone", {}).get("label", "medium")
    }