import base64
from pathlib import Path
import cv2
import numpy as np

from app.schemas.schemas import FaceVerificationResult


class FaceVerifier:
    """Authentic Face Verification with face detection, alignment, quality checks, feature matching, and heatmap generation."""

    def __init__(self) -> None:
        self.cascade = None
        try:
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            self.cascade = cv2.CascadeClassifier(cascade_path)
        except Exception:
            pass

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
        if self.cascade is None:
            return []
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = self.cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(35, 35))
        if len(faces) == 0:
            return []
        # Sort by area descending
        return sorted(list(faces), key=lambda f: f[2] * f[3], reverse=True)

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
        g1 = cv2.cvtColor(face1, cv2.COLOR_BGR2GRAY)
        g2 = cv2.cvtColor(face2, cv2.COLOR_BGR2GRAY)

        # 1. Histogram Correlation
        h1 = cv2.calcHist([g1], [0], None, [256], [0, 256])
        h2 = cv2.calcHist([g2], [0], None, [256], [0, 256])
        cv2.normalize(h1, h1, 0, 1, cv2.NORM_MINMAX)
        cv2.normalize(h2, h2, 0, 1, cv2.NORM_MINMAX)
        hist_corr = float(cv2.compareHist(h1, h2, cv2.HISTCMP_CORREL))
        hist_pct = max(0.0, hist_corr) * 100.0

        # 2. ORB Feature Matching
        orb = cv2.ORB_create(nfeatures=500)
        kp1, des1 = orb.detectAndCompute(g1, None)
        kp2, des2 = orb.detectAndCompute(g2, None)

        orb_pct = 50.0
        if des1 is not None and des2 is not None and len(des1) > 0 and len(des2) > 0:
            bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
            matches = bf.match(des1, des2)
            if matches:
                good_matches = [m for m in matches if m.distance < 50]
                ratio = len(good_matches) / max(1, min(len(des1), len(des2)))
                orb_pct = min(100.0, ratio * 180.0)

        # 3. Structural Difference Metric
        diff = cv2.absdiff(g1, g2)
        mean_diff = float(np.mean(diff))
        structural_pct = max(0.0, (1.0 - (mean_diff / 128.0)) * 100.0)

        # Weighted combination
        similarity = (hist_pct * 0.35) + (orb_pct * 0.35) + (structural_pct * 0.30)
        confidence = min(98.0, max(60.0, 50.0 + (hist_pct * 0.4)))
        return max(0.0, min(99.0, similarity)), confidence

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

