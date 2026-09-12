import numpy as np
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock
from PIL import Image

from app.services.ocr.ocr_service import ocr_service
from app.services.face_verification.face_verifier import face_verifier
from app.services.forensics.forgery_analyzer import forgery_analyzer


def test_ocr_name_filtering():
    # Test case 1: Garbled strings and strings without vowels or matching regex
    blocks = [
        ("ofline XMLL", 0.90, (10, 10, 50, 20)),  # Garbled/invalid
        ("XYZ QWRT", 0.85, (10, 10, 50, 20)),    # No vowels
        ("Aman Verma", 0.50, (10, 10, 50, 20)),   # Low confidence (<= 0.55)
        ("Aman Verma", 0.80, (10, 10, 50, 20)),   # Valid candidate
    ]
    fields, regions, avg_conf = ocr_service._parse_fields(blocks, 500, 500)
    assert fields.name == "Aman Verma"
    assert fields.field_confidences["name"] == 80.0


def test_ocr_name_rejects_garbled_completely():
    blocks = [
        ("ofline XMLL", 0.90, (10, 10, 50, 20)),
        ("XYZ", 0.85, (10, 10, 50, 20)),
        ("12345", 0.99, (10, 10, 50, 20)),
    ]
    fields, regions, avg_conf = ocr_service._parse_fields(blocks, 500, 500)
    assert fields.name is None


def test_face_verification_similarity_identical_faces():
    # Two identical mock crops
    img = np.full((160, 160, 3), 128, dtype=np.uint8)
    sim, conf = face_verifier._compute_similarity(img, img)
    # Identical face encodings produce dist == 0 -> sim == 99.0
    assert sim >= 65.0
    assert conf >= 75.0


def test_forgery_pytorch_threshold(tmp_path, capsys):
    test_img = tmp_path / "test_doc.jpg"
    Image.new("RGB", (200, 200), color=(255, 255, 255)).save(test_img)

    # Mock PyTorch model output: tampered_prob = 0.55
    # Old threshold (0.40) would trigger false positive, new threshold (0.75) must NOT trigger.
    mock_model = MagicMock()
    # Logits resulting in softmax [0.45, 0.55]
    import torch
    mock_model.return_value = torch.tensor([[0.0, 0.20067]])

    with patch.object(forgery_analyzer, "model", mock_model):
        indicator = forgery_analyzer._run_pytorch_inference(test_img, 200, 200)
        assert indicator is None

        # Check debug print was called
        captured = capsys.readouterr()
        assert "[AI MODEL INFERENCE] tampered_prob:" in captured.out

    # Now test tampered_prob = 0.85 (> 0.75)
    mock_model.return_value = torch.tensor([[0.0, 1.7346]])
    with patch.object(forgery_analyzer, "model", mock_model):
        indicator = forgery_analyzer._run_pytorch_inference(test_img, 200, 200)
        assert indicator is not None
        assert indicator.indicator == "AI Neural Network Forgery Detected"
