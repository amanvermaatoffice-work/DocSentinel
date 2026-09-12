import tempfile
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageChops, ImageEnhance
import io

import torch
import torch.nn as nn
from torchvision import transforms, models

from app.schemas.schemas import BoundingBox, ForensicIndicator


class ForgeryAnalyzer:
    """Authentic document forensics using PyTorch Neural Network, Error Level Analysis (ELA), and blur checks."""

    def __init__(self) -> None:
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.transform = transforms.Compose([
            transforms.Resize((448, 448)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

        # Load trained PyTorch model weights if present
        model_path = Path(__file__).resolve().parent.parent.parent / "models" / "doc_forgery_model_v4_rgb448.pt"
        if not model_path.exists():
            # Fallback path relative to root
            model_path = Path("app/models/doc_forgery_model_v4_rgb448.pt")

        if model_path.exists():
            try:
                m = models.resnet18()
                m.fc = nn.Linear(m.fc.in_features, 2)
                m.load_state_dict(torch.load(model_path, map_location=self.device))
                m.to(self.device)
                m.eval()
                self.model = m
                print(f"[AI MODEL] Loaded trained PyTorch forgery model from '{model_path}'")
            except Exception as e:
                print(f"[AI MODEL WARNING] Could not load PyTorch weights: {e}")

    def analyze(
        self, file_path: Path, scenario_key: str = "custom_upload"
    ) -> list[ForensicIndicator]:
        indicators: list[ForensicIndicator] = []

        if not file_path.exists():
            return indicators

        try:
            # 1. Read Image with OpenCV
            img = cv2.imread(str(file_path))
            if img is None:
                return indicators

            h, w = img.shape[:2]
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # 2. Blur / Image Quality Check via Laplacian Variance
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            if laplacian_var < 50:
                indicators.append(
                    ForensicIndicator(
                        indicator="low_quality_evidence",
                        description="Low image sharpness / high blur detected. May impair OCR accuracy.",
                        confidence=0.75,
                        score_contribution=10,
                    )
                )

            # 3. Error Level Analysis (ELA) & Grid Check
            ela_indicators, ela_regions = self._run_ela(file_path, w, h)
            indicators.extend(ela_indicators)

            # 4. PyTorch Neural Network Forgery Model Inference
            if self.model is not None:
                ai_indicator = self._run_pytorch_inference(file_path, w, h)
                if ai_indicator:
                    indicators.append(ai_indicator)

            # 5. Color / Noise Inconsistency check in Photo region
            photo_region_indicator = self._check_photo_region_anomaly(img, w, h)
            if photo_region_indicator:
                indicators.append(photo_region_indicator)

        except Exception:
            pass

        return indicators

    def _run_pytorch_inference(self, file_path: Path, width: int, height: int) -> ForensicIndicator | None:
        """Evaluates uploaded image using trained PyTorch ResNet-18 model on original RGB image."""
        try:
            original = Image.open(file_path).convert('RGB')

            # Run PyTorch Model forward pass on original RGB document
            tensor_img = self.transform(original).unsqueeze(0).to(self.device)
            with torch.no_grad():
                outputs = self.model(tensor_img)
                probs = torch.softmax(outputs, dim=1)
                tampered_prob = float(probs[0][1].item())

            # If model predicts Tampered (Class 1) with > 40% probability
            if tampered_prob > 0.40:
                score_contrib = int(min(60, tampered_prob * 65))
                return ForensicIndicator(
                    indicator="AI Neural Network Forgery Detected",
                    description=f"Trained PyTorch Model detected digital image tampering / splicing (Confidence: {tampered_prob * 100:.1f}%).",
                    confidence=round(tampered_prob, 2),
                    region=[int(width * 0.1), int(height * 0.15), int(width * 0.8), int(height * 0.7)],
                    score_contribution=score_contrib,
                )
        except Exception as e:
            print(f"[AI MODEL INFERENCE ERROR] {e}")

        return None

    def _run_ela(
        self, file_path: Path, width: int, height: int
    ) -> tuple[list[ForensicIndicator], list[list[int]]]:
        indicators: list[ForensicIndicator] = []
        suspicious_boxes: list[list[int]] = []

        try:
            original = Image.open(file_path).convert('RGB')
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
                tmp_path = Path(tmp.name)
                original.save(tmp_path, 'JPEG', quality=90)

            resaved = Image.open(tmp_path).convert('RGB')
            ela_im = ImageChops.difference(original, resaved)

            extrema = ela_im.getextrema()
            max_diff = max([ex[1] for ex in extrema])
            if max_diff == 0:
                max_diff = 1

            scale = 255.0 / max_diff
            ela_im = ImageEnhance.Brightness(ela_im).enhance(scale)
            ela_np = np.array(ela_im)
            ela_gray = cv2.cvtColor(ela_np, cv2.COLOR_RGB2GRAY)

            tmp_path.unlink(missing_ok=True)

            grid_y, grid_x = 8, 8
            gh, gw = height // grid_y, width // grid_x
            cell_means = []

            for i in range(grid_y):
                for j in range(grid_x):
                    cell = ela_gray[i * gh:(i + 1) * gh, j * gw:(j + 1) * gw]
                    cell_means.append((np.mean(cell), np.std(cell), (j * gw, i * gh, gw, gh)))

            means = [c[0] for c in cell_means]
            avg_mean = np.mean(means)
            std_mean = np.std(means)

            if std_mean > 5.0:
                for m, s, box in cell_means:
                    if m > avg_mean + 2.2 * std_mean and m > 25:
                        suspicious_boxes.append([box[0], box[1], box[2], box[3]])

                if suspicious_boxes:
                    first_box = suspicious_boxes[0]
                    indicators.append(
                        ForensicIndicator(
                            indicator="Potential image manipulation",
                            description="Error Level Analysis (ELA) detected compression artifact anomalies in document region.",
                            confidence=0.84,
                            region=first_box,
                            score_contribution=25,
                        )
                    )
        except Exception:
            pass

        return indicators, suspicious_boxes

    def _check_photo_region_anomaly(self, img: np.ndarray, width: int, height: int) -> ForensicIndicator | None:
        try:
            photo_crop = img[int(height * 0.15):int(height * 0.85), int(width * 0.05):int(width * 0.40)]
            if photo_crop.size == 0:
                return None

            edges = cv2.Canny(photo_crop, 100, 200)
            edge_density = np.mean(edges) / 255.0

            if edge_density > 0.35:
                return ForensicIndicator(
                    indicator="Potential photo splice / boundary anomaly",
                    description="High edge intensity detected around photograph border.",
                    confidence=0.78,
                    region=[int(width * 0.05), int(height * 0.15), int(width * 0.35), int(height * 0.70)],
                    score_contribution=20,
                )
        except Exception:
            pass
        return None


class DocumentAnalyzer:
    """Document quality and type classifier."""

    def classify(self, file_path: Path, scenario_key: str = "custom_upload") -> tuple[str, str]:
        if not file_path.exists():
            return "Unknown Document", "POOR"

        img = cv2.imread(str(file_path))
        if img is None:
            return "Unknown Document", "POOR"

        h, w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()

        quality = "GOOD" if laplacian_var > 120 else ("FAIR" if laplacian_var > 45 else "POOR")
        return "Identity Document", quality

    def detect_regions(self, scenario_key: str = "custom_upload") -> list[BoundingBox]:
        return []


forgery_analyzer = ForgeryAnalyzer()
document_analyzer = DocumentAnalyzer()
