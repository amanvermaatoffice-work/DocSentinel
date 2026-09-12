from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    officer_id: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    officer_id: str
    demo_mode: bool


class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int
    label: str
    confidence: float = 0.0


class ExtractedFields(BaseModel):
    name: str | None = None
    date_of_birth: str | None = None
    document_number: str | None = None
    address: str | None = None
    nationality: str | None = None
    expiry_date: str | None = None
    mrz_line1: str | None = None
    mrz_line2: str | None = None
    field_confidences: dict[str, float] = Field(default_factory=dict)



class ForensicIndicator(BaseModel):
    indicator: str
    description: str
    confidence: float
    region: list[int] | None = None
    score_contribution: int = 0


class ValidationResult(BaseModel):
    check: str
    passed: bool
    message: str
    score_contribution: int = 0


class FaceVerificationResult(BaseModel):
    similarity_score: float
    verdict: Literal["LIKELY MATCH", "POTENTIAL MISMATCH", "UNABLE TO VERIFY"]
    score_contribution: int = 0


class EvidenceItem(BaseModel):
    id: str
    label: str
    description: str
    score_contribution: int
    region: list[int] | None = None
    category: str


class RiskAssessment(BaseModel):
    risk_score: int
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL", "UNABLE TO VERIFY"]
    status: str
    unable_to_verify_reason: str | None = None
    recommended_action: str | None = None
    evidence: list[EvidenceItem]
    weights_used: dict[str, float]


class DocumentAnalysisResult(BaseModel):
    verification_id: str
    document_id: str
    document_type: str
    image_quality: Literal["GOOD", "FAIR", "POOR"]
    ocr_confidence: float
    document_assessment: str
    regions: list[BoundingBox]
    extracted_fields: ExtractedFields
    forensic_indicators: list[ForensicIndicator]
    validation_results: list[ValidationResult]
    face_verification: FaceVerificationResult | None = None
    risk: RiskAssessment
    encounter_id: str | None = None
    demo_scenario: str | None = None
    demo_mode: bool = True


class EncounterSummary(BaseModel):
    encounter_id: str
    timestamp: datetime
    checkpoint: str
    identity_reference: str
    document_reference: str
    face_reference: str
    person_reference: str
    document_type: str
    risk_score: float
    risk_level: str
    status: str


class DashboardStats(BaseModel):
    checkpoint: str
    encounters_processed: int
    suspicious_encounters: int
    high_risk_encounters: int
    pending_reviews: int
    system_status: str
    demo_data: bool = True


class TimelineEntry(BaseModel):
    timestamp: str
    checkpoint: str
    identity_reference: str
    person_reference: str
    risk_level: str
    encounter_id: str


class IdentityTimeline(BaseModel):
    identity_reference: str
    entries: list[TimelineEntry]
    alerts: list[str]


class GraphNode(BaseModel):
    id: str
    label: str
    type: str
    suspicious: bool = False


class GraphEdge(BaseModel):
    source: str
    target: str
    label: str
    suspicious: bool = False


class IdentityGraph(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class FraudPattern(BaseModel):
    pattern_id: str
    observed_in: list[str]
    common_indicators: list[str]
    description: str


class AuditRecordResponse(BaseModel):
    verification_id: str
    timestamp: datetime
    document_hash: str
    risk_result: str
    risk_score: float
    evidence_summary: str
    officer_decision: str
    previous_hash: str
    current_hash: str
    encounter_id: str | None = None


class AuditVerifyResponse(BaseModel):
    intact: bool
    message: str
    records_checked: int


class ReviewRequest(BaseModel):
    verification_id: str
    encounter_id: str
    decision: Literal["CONFIRM FLAG", "DISMISS FLAG", "REQUEST ADDITIONAL VERIFICATION"]
    notes: str = ""


class ReviewResponse(BaseModel):
    success: bool
    review_id: int
    message: str
