from app.config import settings
from app.schemas.schemas import (
    EvidenceItem,
    FaceVerificationResult,
    ForensicIndicator,
    RiskAssessment,
    ValidationResult,
)
from app.services.demo_data import DEMO_ENCOUNTERS


from app.config import settings
from app.schemas.schemas import (
    EvidenceItem,
    FaceVerificationResult,
    ForensicIndicator,
    RiskAssessment,
    ValidationResult,
)


class RiskEngine:
    """Authentic evidence-fusion risk calculation engine."""

    def score_to_level(self, score: int) -> str:
        if score <= 25:
            return "LOW"
        if score <= 60:
            return "MEDIUM"
        if score <= 85:
            return "HIGH"
        return "CRITICAL"

    def compute(
        self,
        scenario_key: str,
        image_quality: str,
        ocr_confidence: float,
        forensics: list[ForensicIndicator],
        validations: list[ValidationResult],
        face: FaceVerificationResult | None,
        identity_alert: bool = False,
        preset_score: int | None = None,
    ) -> RiskAssessment:
        weights = settings.risk_weights
        evidence: list[EvidenceItem] = []
        total = 10  # Base line start score

        for f in forensics:
            total += f.score_contribution
            evidence.append(
                EvidenceItem(
                    id=f.indicator.replace(" ", "_").lower(),
                    label=f.indicator,
                    description=f.description,
                    score_contribution=f.score_contribution,
                    region=f.region,
                    category="image_forensics",
                )
            )

        for v in validations:
            if not v.passed:
                total += v.score_contribution
                evidence.append(
                    EvidenceItem(
                        id=v.check.replace(" ", "_").lower(),
                        label=v.check,
                        description=v.message,
                        score_contribution=v.score_contribution,
                        category="machine_readable",
                    )
                )

        if face:
            if face.verdict == "POTENTIAL MISMATCH":
                total += face.score_contribution
                evidence.append(
                    EvidenceItem(
                        id="face_mismatch",
                        label="Face comparison mismatch",
                        description=f"Similarity score: {face.similarity_score:.0f}% — {face.verdict}",
                        score_contribution=face.score_contribution,
                        category="face_verification",
                    )
                )
            elif face.verdict == "LIKELY MATCH":
                evidence.append(
                    EvidenceItem(
                        id="face_match",
                        label="Face comparison verified",
                        description=f"Similarity score: {face.similarity_score:.0f}% — {face.verdict}",
                        score_contribution=0,
                        category="face_verification",
                    )
                )

        if image_quality == "POOR":
            return RiskAssessment(
                risk_score=min(total + 30, 100),
                risk_level="UNABLE TO VERIFY",
                status="UNABLE TO VERIFY",
                unable_to_verify_reason=(
                    "The submitted document image quality is insufficient for complete security screening."
                ),
                recommended_action="Please upload a clearer image of the document.",
                evidence=evidence,
                weights_used=weights,
            )

        if not evidence:
            evidence.append(
                EvidenceItem(
                    id="doc_integrity_pass",
                    label="Document integrity verified",
                    description="No major physical or digital manipulation indicators detected.",
                    score_contribution=0,
                    category="document_integrity",
                )
            )

        total = min(max(total, 0), 100)
        level = self.score_to_level(total)
        assessment = "SUSPICIOUS" if total > 60 else ("CAUTION" if total > 25 else "NORMAL")
        rec_action = "Manual verification recommended." if total > 35 else "Standard clearance approved."

        return RiskAssessment(
            risk_score=total,
            risk_level=level,  # type: ignore[arg-type]
            status=assessment,
            recommended_action=rec_action,
            evidence=evidence,
            weights_used=weights,
        )


risk_engine = RiskEngine()

