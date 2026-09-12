import uuid
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.db_models import AuditRecord, ReviewRecord
from app.schemas.schemas import (
    AuditRecordResponse,
    AuditVerifyResponse,
    DashboardStats,
    DocumentAnalysisResult,
    EncounterSummary,
    FraudPattern,
    IdentityGraph,
    IdentityTimeline,
    LoginRequest,
    LoginResponse,
    ReviewRequest,
    ReviewResponse,
)
from app.services.audit.audit_service import audit_service
from app.services.demo_data import DEMO_OFFICER, SCENARIO_MAP
from app.services.document_detection.validators import document_validator
from app.services.encounters.encounter_service import encounter_service
from app.services.face_verification.face_verifier import face_verifier
from app.services.forensics.forgery_analyzer import document_analyzer, forgery_analyzer
from app.services.ocr.ocr_service import ocr_service
from app.services.risk_engine.risk_engine import risk_engine

router = APIRouter()
security = HTTPBearer(auto_error=False)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

UPLOAD_DIR = Path(settings.upload_dir)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def create_token(officer_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode(
        {"sub": officer_id, "exp": expire},
        settings.secret_key,
        algorithm=settings.jwt_algorithm,
    )


async def get_current_officer(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> str:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        officer_id = payload.get("sub")
        if not officer_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return officer_id
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc


def validate_upload(file: UploadFile) -> None:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    ext = Path(file.filename).suffix.lower()
    if ext not in settings.allowed_extensions:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed")


async def save_upload(file: UploadFile) -> Path:
    validate_upload(file)
    content = await file.read()
    if len(content) > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large")
    dest = UPLOAD_DIR / f"{uuid.uuid4().hex}{Path(file.filename).suffix.lower()}"
    dest.write_bytes(content)
    return dest


@router.post("/auth/login", response_model=LoginResponse)
async def login(req: LoginRequest) -> LoginResponse:
    if req.officer_id != DEMO_OFFICER["officer_id"] or req.password != DEMO_OFFICER["password"]:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return LoginResponse(
        access_token=create_token(req.officer_id),
        officer_id=req.officer_id,
        demo_mode=settings.demo_mode,
    )


@router.get("/dashboard", response_model=DashboardStats)
async def dashboard(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_officer),
) -> DashboardStats:
    return await encounter_service.get_dashboard_stats(db)


@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    _: str = Depends(get_current_officer),
) -> dict:
    path = await save_upload(file)
    doc_id = ocr_service.generate_document_id()
    return {"document_id": doc_id, "filename": file.filename, "path": str(path)}


@router.post("/documents/analyze", response_model=DocumentAnalysisResult)
async def analyze_document(
    file: UploadFile = File(...),
    scenario: str | None = Form(None),
    selfie: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_officer),
) -> DocumentAnalysisResult:
    doc_path = await save_upload(file)
    selfie_path = await save_upload(selfie) if selfie else None

    fields, regions, ocr_conf, doc_type, scenario_key = ocr_service.extract(doc_path, scenario)
    doc_type, image_quality = document_analyzer.classify(doc_path, scenario_key)
    forensics = forgery_analyzer.analyze(doc_path, scenario_key)
    validations = document_validator.validate(doc_type, fields)
    face_result = face_verifier.verify(doc_path, selfie_path, scenario_key)

    risk = risk_engine.compute(
        scenario_key=scenario_key,
        image_quality=image_quality,
        ocr_confidence=ocr_conf,
        forensics=forensics,
        validations=validations,
        face=face_result,
        identity_alert=False,
    )


    verification_id = audit_service.generate_verification_id()
    document_hash = audit_service.hash_document(doc_path)
    doc_id = ocr_service.generate_document_id()

    result_obj = AuditRecord(
        verification_id=verification_id,
        document_hash=document_hash,
        risk_result=risk.risk_level,
        risk_score=float(risk.risk_score),
        evidence_summary="; ".join(e.label for e in risk.evidence[:5]),
        previous_hash="GENESIS",
        current_hash="",
    )

    last = await db.execute(select(AuditRecord).order_by(AuditRecord.id.desc()).limit(1))
    last_record = last.scalar_one_or_none()
    prev_hash = last_record.current_hash if last_record else audit_service.GENESIS

    ts = datetime.utcnow().isoformat()
    current_hash = audit_service.compute_record_hash(
        previous_hash=prev_hash,
        verification_id=verification_id,
        timestamp=ts,
        document_hash=document_hash,
        risk_result=risk.risk_level,
        risk_score=float(risk.risk_score),
        evidence_summary=result_obj.evidence_summary,
        officer_decision="Pending",
    )

    result_obj.previous_hash = prev_hash
    result_obj.current_hash = current_hash
    db.add(result_obj)
    await db.commit()

    assessment = "SUSPICIOUS" if risk.risk_score > 60 else ("CAUTION" if risk.risk_score > 30 else "NORMAL")
    if risk.risk_level == "UNABLE TO VERIFY":
        assessment = "UNABLE TO VERIFY"

    return DocumentAnalysisResult(
        verification_id=verification_id,
        document_id=doc_id,
        document_type=doc_type.title(),
        image_quality=image_quality,  # type: ignore[arg-type]
        ocr_confidence=ocr_conf,
        document_assessment=assessment,
        regions=regions,
        extracted_fields=fields,
        forensic_indicators=forensics,
        validation_results=validations,
        face_verification=face_result,
        risk=risk,
        demo_scenario=scenario_key,
        demo_mode=settings.demo_mode,
    )


@router.post("/documents/ocr")
async def ocr_document(
    file: UploadFile = File(...),
    scenario: str | None = Form(None),
    _: str = Depends(get_current_officer),
) -> dict:
    path = await save_upload(file)
    fields, regions, confidence, doc_type, scenario_key = ocr_service.extract(path, scenario)
    return {
        "document_type": doc_type,
        "ocr_confidence": confidence,
        "extracted_fields": fields.model_dump(),
        "regions": [r.model_dump() for r in regions],
        "demo_mode": settings.demo_mode,
        "scenario": scenario_key,
    }


@router.post("/documents/forensics")
async def forensics_document(
    file: UploadFile = File(...),
    scenario: str | None = Form(None),
    _: str = Depends(get_current_officer),
) -> dict:
    path = await save_upload(file)
    scenario_key = ocr_service.detect_scenario(path.name, scenario)
    indicators = forgery_analyzer.analyze(path, scenario_key)
    return {
        "indicators": [i.model_dump() for i in indicators],
        "demo_mode": settings.demo_mode,
    }


@router.post("/face/verify")
async def verify_face(
    document: UploadFile = File(...),
    selfie: UploadFile = File(...),
    scenario: str | None = Form(None),
    _: str = Depends(get_current_officer),
) -> dict:
    doc_path = await save_upload(document)
    selfie_path = await save_upload(selfie)
    scenario_key = ocr_service.detect_scenario(doc_path.name, scenario)
    result = face_verifier.verify(doc_path, selfie_path, scenario_key)
    return {"result": result.model_dump() if result else None, "demo_mode": settings.demo_mode}


@router.get("/encounters", response_model=list[EncounterSummary])
async def list_encounters(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_officer),
) -> list[EncounterSummary]:
    return await encounter_service.get_all(db)


@router.get("/encounters/{encounter_id}", response_model=EncounterSummary)
async def get_encounter(
    encounter_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_officer),
) -> EncounterSummary:
    enc = await encounter_service.get_by_id(db, encounter_id)
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found")
    return enc


@router.get("/identity/{identity_id}/timeline", response_model=IdentityTimeline)
async def identity_timeline(
    identity_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_officer),
) -> IdentityTimeline:
    return await encounter_service.get_identity_timeline(db, identity_id)


@router.get("/identity/{identity_id}/graph", response_model=IdentityGraph)
async def identity_graph(
    identity_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_officer),
) -> IdentityGraph:
    return await encounter_service.get_identity_graph(db, identity_id)


@router.get("/fraud-patterns", response_model=list[FraudPattern])
async def fraud_patterns(_: str = Depends(get_current_officer)) -> list[FraudPattern]:
    return encounter_service.get_fraud_patterns()


@router.post("/reviews", response_model=ReviewResponse)
async def submit_review(
    req: ReviewRequest,
    db: AsyncSession = Depends(get_db),
    officer_id: str = Depends(get_current_officer),
) -> ReviewResponse:
    review = ReviewRecord(
        verification_id=req.verification_id,
        encounter_id=req.encounter_id,
        decision=req.decision,
        notes=req.notes,
        officer_id=officer_id,
    )
    db.add(review)

    result = await db.execute(
        select(AuditRecord).where(AuditRecord.verification_id == req.verification_id)
    )
    audit = result.scalar_one_or_none()
    if audit:
        audit.officer_decision = req.decision

    await db.commit()
    await db.refresh(review)
    return ReviewResponse(success=True, review_id=review.id, message=f"Review recorded: {req.decision}")


@router.get("/audit/{verification_id}", response_model=AuditRecordResponse)
async def get_audit(
    verification_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_officer),
) -> AuditRecordResponse:
    result = await db.execute(
        select(AuditRecord).where(AuditRecord.verification_id == verification_id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Audit record not found")
    return AuditRecordResponse(
        verification_id=record.verification_id,
        timestamp=record.timestamp,
        document_hash=record.document_hash,
        risk_result=record.risk_result,
        risk_score=record.risk_score,
        evidence_summary=record.evidence_summary,
        officer_decision=record.officer_decision,
        previous_hash=record.previous_hash,
        current_hash=record.current_hash,
        encounter_id=record.encounter_id,
    )


@router.get("/audit", response_model=list[AuditRecordResponse])
async def list_audit(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_officer),
) -> list[AuditRecordResponse]:
    result = await db.execute(select(AuditRecord).order_by(AuditRecord.timestamp.desc()))
    records = result.scalars().all()
    return [
        AuditRecordResponse(
            verification_id=r.verification_id,
            timestamp=r.timestamp,
            document_hash=r.document_hash,
            risk_result=r.risk_result,
            risk_score=r.risk_score,
            evidence_summary=r.evidence_summary,
            officer_decision=r.officer_decision,
            previous_hash=r.previous_hash,
            current_hash=r.current_hash,
            encounter_id=r.encounter_id,
        )
        for r in records
    ]


@router.post("/audit/verify", response_model=AuditVerifyResponse)
async def verify_audit_chain(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_officer),
) -> AuditVerifyResponse:
    result = await db.execute(select(AuditRecord).order_by(AuditRecord.id))
    records = result.scalars().all()
    chain = []
    prev = audit_service.GENESIS
    for r in records:
        chain.append({
            "verification_id": r.verification_id,
            "timestamp": r.timestamp.isoformat(),
            "document_hash": r.document_hash,
            "risk_result": r.risk_result,
            "risk_score": r.risk_score,
            "evidence_summary": r.evidence_summary,
            "officer_decision": r.officer_decision,
            "current_hash": r.current_hash,
            "stored_previous_hash": r.previous_hash,
        })
        prev = r.current_hash

    intact, message, count = audit_service.verify_chain(chain)
    return AuditVerifyResponse(intact=intact, message=message, records_checked=count)
