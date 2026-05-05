import cv2
import mediapipe as mp
from pathlib import Path


MAX_IMAGE_DIM = 1024   # Resize any image larger than this before detection
MIN_FACE_SIZE = 40     # was 60 — now accepts smaller/further away faces


class ImageValidator:
    def __init__(self, model_asset_path: str):
        if not Path(model_asset_path).exists():
            raise FileNotFoundError(f"Model not found: {model_asset_path}")

        BaseOptions = mp.tasks.BaseOptions
        FaceDetector = mp.tasks.vision.FaceDetector
        FaceDetectorOptions = mp.tasks.vision.FaceDetectorOptions

        options = FaceDetectorOptions(
            base_options=BaseOptions(model_asset_path=model_asset_path),
            min_detection_confidence=0.2  # was 0.3 — more aggressive face detection
        )

        self.detector = FaceDetector.create_from_options(options)

    def close(self):
        """Release MediaPipe native resources."""
        if self.detector:
            self.detector.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    # --------------------------------------------------
    # 🔧 Resize large images before MediaPipe (FIXES HANGING)
    # --------------------------------------------------
    def _resize_if_needed(self, image):
        h, w = image.shape[:2]
        max_dim = max(h, w)
        if max_dim <= MAX_IMAGE_DIM:
            return image, 1.0  # no resize needed

        scale = MAX_IMAGE_DIM / max_dim
        new_w = int(w * scale)
        new_h = int(h * scale)
        resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
        return resized, scale

    # --------------------------------------------------
    # 📸 Blur Detection (adaptive threshold based on face size)
    # --------------------------------------------------
    def _is_blurry(self, face_crop, base_threshold=45):
        # was 80 — now only rejects genuinely unusable blurry photos
        # Normal selfies and phone photos typically score 50-200+
        if face_crop.size == 0:
            return True

        gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        variance = cv2.Laplacian(gray, cv2.CV_64F).var()

        # Smaller crops have lower variance naturally — scale threshold down
        h, w = face_crop.shape[:2]
        area = h * w
        scale_factor = min(1.0, area / (150 * 150))  # normalize against 150x150 baseline
        adjusted_threshold = base_threshold * scale_factor

        return variance < adjusted_threshold

    # --------------------------------------------------
    # ✅ Validate
    # --------------------------------------------------
    def validate(self, image_path):
        img = cv2.imread(image_path)
        if img is None:
            return False, "Invalid image path or unreadable file", None

        # Basic dimension sanity check
        h_orig, w_orig = img.shape[:2]
        if h_orig < 100 or w_orig < 100:
            return False, "Validation failed: Image too small (min 100x100)", None

        # FIX: Resize before passing to MediaPipe to prevent hanging
        img_resized, scale = self._resize_if_needed(img)

        rgb = cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

        result = self.detector.detect(mp_image)
        faces = result.detections or []

        # 1. No face
        if len(faces) == 0:
            return False, "Validation failed: No face detected", None

        # 2. Multiple faces
        if len(faces) > 1:
            return False, "Validation failed: Multiple faces detected", None

        # 3. Extract bounding box (scaled back to original image coords)
        bbox = faces[0].bounding_box
        x = int(bbox.origin_x / scale)
        y = int(bbox.origin_y / scale)
        w = int(bbox.width / scale)
        h = int(bbox.height / scale)

        # Face too small to be useful
        if w < MIN_FACE_SIZE or h < MIN_FACE_SIZE:
            return False, f"Validation failed: Face too small ({w}x{h}px)", None

        # Safe crop on ORIGINAL resolution image
        h_img, w_img = img.shape[:2]
        x = max(0, x)
        y = max(0, y)
        w = min(w_img - x, w)
        h = min(h_img - y, h)
        face_crop = img[y:y+h, x:x+w]

        # 4. Blur check on face crop
        if self._is_blurry(face_crop):
            return False, "Validation failed: Face is blurry", None

        # Return face bbox for downstream use (analyzer can use this)
        face_info = {"x": x, "y": y, "w": w, "h": h}
        return True, "Validation passed: Valid image", face_info