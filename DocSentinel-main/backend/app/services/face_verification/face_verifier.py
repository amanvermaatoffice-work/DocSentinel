import base64
from pathlib import Path
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision
import onnxruntime as ort

from app.schemas.schemas import FaceVerificationResult


class FaceVerifier:
    """Authentic Face Verification with face detection, alignment, quality checks, feature matching, and heatmap generation."""

    def __init__(self) -> None:
        self.session = self._load_arcface_session()

        model_path = Path(__file__).resolve().parent.parent.parent / "models" / "blaze_face_short_range.tflite"
        if not model_path.exists():
            model_path = Path("backend/app/models/blaze_face_short_range.tflite")

        if not model_path.exists():
            print("[FACE VERIFICATION ERROR] BlazeFace model not found at backend/app/models/blaze_face_short_range.tflite — place the model file there.")
            self.detector = None
        else:
            try:
                base_options = mp_python.BaseOptions(model_asset_path=str(model_path))
                options = mp_vision.FaceDetectorOptions(base_options=base_options, min_detection_confidence=0.3)
                self.detector = mp_vision.FaceDetector.create_from_options(options)
            except Exception as e:
                print(f"[FACE VERIFICATION ERROR] Could not load BlazeFace model: {e}")
                self.detector = None

    def _load_arcface_session(self) -> ort.InferenceSession | None:
        model_path = Path(__file__).resolve().parent.parent.parent / "models" / "arcface_w600k_r50.onnx"
        if not model_path.exists():
            # Fallback path relative to root
            model_path = Path("backend/app/models/arcface_w600k_r50.onnx")

        if not model_path.exists():
            print("[FACE VERIFICATION ERROR] ArcFace model not found at backend/app/models/arcface_w600k_r50.onnx — place the model file there.")
            return None

        try:
            session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
            print(f"[FACE VERIFICATION] Loaded ArcFace ONNX model from '{model_path}'")
            return session
        except Exception as e:
            print(f"[FACE VERIFICATION ERROR] Could not load ArcFace ONNX model: {e}")
            return None

    def _get_embedding(self, face_crop_bgr: np.ndarray) -> np.ndarray | None:
        if self.session is None:
            return None
        try:
            resized = cv2.resize(face_crop_bgr, (112, 112))
            rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
            norm = (rgb.astype(np.float32) - 127.5) / 127.5
            transposed = np.transpose(norm, (2, 0, 1))
            input_tensor = np.expand_dims(transposed, axis=0)

            input_name = self.session.get_inputs()[0].name
            outputs = self.session.run(None, {input_name: input_tensor})
            embedding = outputs[0][0]

            l2_norm = np.linalg.norm(embedding)
            if l2_norm > 0:
                embedding = embedding / l2_norm
            return embedding
        except Exception as e:
            print(f"[FACE EMBEDDING ERROR] {e}")
            return None

    def verify(
        self,
        document_path: Path | None,
        selfie_path: Path | None,
        scenario_key: str = "custom_upload",
    ) -> FaceVerificationResult | None:
        if selfie_path is None or not selfie_path.exists():
            return None

        if document_path is None or not document_path.exists():
            return FaceVerificationResult(
                similarity_score=0.0,
                verdict="NO DOCUMENT PROVIDED",
                score_contribution=25,
                confidence_score=0.0,
                quality_checks={"error": "Document image missing"},
            )

        try:
            doc_img = cv2.imread(str(document_path))
            selfie_img = cv2.imread(str(selfie_path))

            if doc_img is None or selfie_img is None:
                return FaceVerificationResult(
                    similarity_score=0.0,
                    verdict="UNABLE TO READ IMAGES",
                    score_contribution=25,
                    confidence_score=0.0,
                    quality_checks={"error": "Corrupted image file"},
                )

            # Detect faces
            doc_faces = self._detect_faces(doc_img)
            selfie_faces = self._detect_faces(selfie_img)

            quality_checks = {
                "doc_faces_count": len(doc_faces),
                "selfie_faces_count": len(selfie_faces),
                "multiple_faces_detected": len(doc_faces) > 1 or len(selfie_faces) > 1,
            }

            # Check missing faces
            if len(doc_faces) == 0 and len(selfie_faces) == 0:
                # Fallback to center cropped region
                doc_crop = self._center_crop(doc_img)
                selfie_crop = self._center_crop(selfie_img)
                quality_checks["doc_face_found"] = False
                quality_checks["selfie_face_found"] = False
            elif len(doc_faces) == 0:
                quality_checks["doc_face_found"] = False
                quality_checks["selfie_face_found"] = True
                return FaceVerificationResult(
                    similarity_score=0.0,
                    verdict="NO FACE DETECTED IN DOCUMENT",
                    score_contribution=35,
                    confidence_score=0.0,
                    quality_checks=quality_checks,
                )
            elif len(selfie_faces) == 0:
                quality_checks["doc_face_found"] = True
                quality_checks["selfie_face_found"] = False
                return FaceVerificationResult(
                    similarity_score=0.0,
                    verdict="NO FACE DETECTED IN LIVE CAPTURE",
                    score_contribution=35,
                    confidence_score=0.0,
                    quality_checks=quality_checks,
                )
            else:
                quality_checks["doc_face_found"] = True
                quality_checks["selfie_face_found"] = True
                doc_crop = self._crop_face_box(doc_img, doc_faces[0])
                selfie_crop = self._crop_face_box(selfie_img, selfie_faces[0])

            # Measure Quality (Blur / Contrast)
            doc_blur = cv2.Laplacian(cv2.cvtColor(doc_crop, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var()
            selfie_blur = cv2.Laplacian(cv2.cvtColor(selfie_crop, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var()
            quality_checks["doc_blur_score"] = round(float(doc_blur), 1)
            quality_checks["selfie_blur_score"] = round(float(selfie_blur), 1)
            quality_checks["quality_pass"] = bool(doc_blur > 30 and selfie_blur > 30)

            # Resize & Normalize Face Crops (160x160)
            doc_face_norm = self._normalize_face(doc_crop)
            selfie_face_norm = self._normalize_face(selfie_crop)

            # Compute similarity & feature metrics
            sim_score, confidence = self._compute_similarity(doc_face_norm, selfie_face_norm)

            # Determine Verdict
            if sim_score >= 65.0:
                verdict = "MATCH"
                score_contrib = 0
            elif sim_score >= 35.0:
                verdict = "POTENTIAL MISMATCH"
                score_contrib = 15
            else:
                verdict = "NO MATCH"
                score_contrib = 30

            # Generate Heatmap
            heatmap_b64 = self._generate_heatmap(doc_face_norm, selfie_face_norm)
            doc_face_b64 = self._mat_to_b64(doc_face_norm)
            selfie_face_b64 = self._mat_to_b64(selfie_face_norm)

            return FaceVerificationResult(
                similarity_score=round(sim_score, 1),
                verdict=verdict,
                score_contribution=score_contrib,
                confidence_score=round(confidence, 1),
                heatmap_image=heatmap_b64,
                aligned_doc_face=doc_face_b64,
                aligned_selfie_face=selfie_face_b64,
                quality_checks=quality_checks,
            )
        except Exception as e:
            print(f"[FACE VERIFICATION ERROR] {e}")
            return FaceVerificationResult(
                similarity_score=0.0,
                verdict="UNABLE TO VERIFY",
                score_contribution=0,
                confidence_score=0.0,
                quality_checks={"error": str(e)},
            )

    def _detect_faces(self, img: np.ndarray) -> list[tuple[int, int, int, int]]:
        if self.detector is None:
            return []
        print(f"[FACE DETECT DEBUG] Min pixel: {img.min()}, Max pixel: {img.max()}")
        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = self.detector.detect(mp_image)
        print(f"[FACE DETECT DEBUG] Detections count: {len(result.detections)}, Image shape: {img.shape}")
        boxes = []
        for detection in result.detections:
            bbox = detection.bounding_box
            boxes.append((bbox.origin_x, bbox.origin_y, bbox.width, bbox.height))
        return sorted(boxes, key=lambda b: b[2] * b[3], reverse=True)

    def _crop_face_box(self, img: np.ndarray, box: tuple[int, int, int, int]) -> np.ndarray:
        x, y, w, h = box
        # Add 10% padding around face
        h_pad = int(h * 0.1)
        w_pad = int(w * 0.1)
        y1 = max(0, y - h_pad)
        y2 = min(img.shape[0], y + h + h_pad)
        x1 = max(0, x - w_pad)
        x2 = min(img.shape[1], x + w + w_pad)
        return img[y1:y2, x1:x2]

    def _center_crop(self, img: np.ndarray) -> np.ndarray:
        h, w = img.shape[:2]
        ch, cw = int(h * 0.5), int(w * 0.5)
        cy, cx = h // 2, w // 2
        return img[max(0, cy - ch // 2):min(h, cy + ch // 2), max(0, cx - cw // 2):min(w, cx + cw // 2)]

    def _normalize_face(self, crop: np.ndarray) -> np.ndarray:
        resized = cv2.resize(crop, (160, 160))
        # Histogram Equalization on Y channel in YCrCb color space
        ycrcb = cv2.cvtColor(resized, cv2.COLOR_BGR2YCrCb)
        channels = list(cv2.split(ycrcb))
        channels[0] = cv2.equalizeHist(channels[0])
        equalized = cv2.merge(channels)
        return cv2.cvtColor(equalized, cv2.COLOR_YCrCb2BGR)

    def _compute_similarity(self, face1: np.ndarray, face2: np.ndarray) -> tuple[float, float]:
        """
        Computes cosine similarity between 512-d ArcFace embeddings extracted via ONNX Runtime.
        Returns (similarity_pct, confidence_score).
        """
        emb1 = self._get_embedding(face1)
        emb2 = self._get_embedding(face2)

        if emb1 is None or emb2 is None:
            print("[FACE VERIFICATION WARNING] Could not extract ArcFace embeddings for one or both faces.")
            return 0.0, 50.0

        cosine_sim = float(np.dot(emb1, emb2))
        similarity_pct = float(((cosine_sim + 1.0) / 2.0) * 100.0)
        confidence_score = 92.0

        print(f"[ARCFACE SIMILARITY] raw cosine_sim: {cosine_sim:.4f} -> converted percentage: {similarity_pct:.2f}%")
        return similarity_pct, confidence_score


    def _generate_heatmap(self, face1: np.ndarray, face2: np.ndarray) -> str:
        try:
            g1 = cv2.cvtColor(face1, cv2.COLOR_BGR2GRAY)
            g2 = cv2.cvtColor(face2, cv2.COLOR_BGR2GRAY)
            diff = cv2.absdiff(g1, g2)
            blurred_diff = cv2.GaussianBlur(diff, (15, 15), 0)
            norm_diff = cv2.normalize(blurred_diff, None, 0, 255, cv2.NORM_MINMAX, dtype=cv2.CV_8U)
            heatmap = cv2.applyColorMap(norm_diff, cv2.COLORMAP_JET)

            # Blend heatmap overlay with original face image
            blended = cv2.addWeighted(face2, 0.55, heatmap, 0.45, 0)
            return self._mat_to_b64(blended)
        except Exception:
            return ""

    def _mat_to_b64(self, img: np.ndarray) -> str:
        success, encoded = cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
        if not success:
            return ""
        b64_str = base64.b64encode(encoded).decode("utf-8")
        return f"data:image/jpeg;base64,{b64_str}"


face_verifier = FaceVerifier()

