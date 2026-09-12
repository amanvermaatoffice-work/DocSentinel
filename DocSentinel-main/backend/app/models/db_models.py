from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class EncounterRecord(Base):
    __tablename__ = "encounters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    encounter_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    checkpoint: Mapped[str] = mapped_column(String(64))
    identity_reference: Mapped[str] = mapped_column(String(32), index=True)
    document_reference: Mapped[str] = mapped_column(String(32))
    face_reference: Mapped[str] = mapped_column(String(32))
    person_reference: Mapped[str] = mapped_column(String(32), index=True)
    document_type: Mapped[str] = mapped_column(String(32), default="passport")
    risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    risk_level: Mapped[str] = mapped_column(String(16), default="LOW")
    status: Mapped[str] = mapped_column(String(32), default="processed")


    document_path: Mapped[str] = mapped_column(String(256), nullable=True)
    selfie_path: Mapped[str] = mapped_column(String(256), nullable=True)


class AuditRecord(Base):
    __tablename__ = "audit_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    verification_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    document_hash: Mapped[str] = mapped_column(String(64))
    risk_result: Mapped[str] = mapped_column(String(16))
    risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    evidence_summary: Mapped[str] = mapped_column(Text)
    officer_decision: Mapped[str] = mapped_column(String(32), default="Pending")
    previous_hash: Mapped[str] = mapped_column(String(64), default="GENESIS")
    current_hash: Mapped[str] = mapped_column(String(64))
    encounter_id: Mapped[str] = mapped_column(String(32), nullable=True)
    document_type: Mapped[str] = mapped_column(String(64), default="Unknown Document")
    face_similarity_score: Mapped[float] = mapped_column(Float, default=0.0)
    document_path: Mapped[str] = mapped_column(String(256), nullable=True)
    selfie_path: Mapped[str] = mapped_column(String(256), nullable=True)
    officer_id: Mapped[str] = mapped_column(String(64), default="OFFICER-DEMO")


class ReviewRecord(Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    verification_id: Mapped[str] = mapped_column(String(32), index=True)
    encounter_id: Mapped[str] = mapped_column(String(32))
    decision: Mapped[str] = mapped_column(String(32))
    notes: Mapped[str] = mapped_column(Text, default="")
    officer_id: Mapped[str] = mapped_column(String(32))
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
