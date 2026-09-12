import hashlib
import json
import uuid
from pathlib import Path

from app.config import settings


class AuditService:
    """Tamper-evident hash chain for verification records."""

    GENESIS = "GENESIS"

    def compute_record_hash(
        self,
        previous_hash: str,
        verification_id: str,
        timestamp: str,
        document_hash: str,
        risk_result: str,
        risk_score: float,
        evidence_summary: str,
        officer_decision: str,
    ) -> str:
        payload = json.dumps(
            {
                "previous_hash": previous_hash,
                "verification_id": verification_id,
                "timestamp": timestamp,
                "document_hash": document_hash,
                "risk_result": risk_result,
                "risk_score": risk_score,
                "evidence_summary": evidence_summary,
                "officer_decision": officer_decision,
            },
            sort_keys=True,
        )
        return hashlib.sha256(payload.encode()).hexdigest()

    def hash_document(self, file_path: Path) -> str:
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                hasher.update(chunk)
        return hasher.hexdigest()

    def generate_verification_id(self) -> str:
        return f"VER-{uuid.uuid4().hex[:6].upper()}"

    def verify_chain(self, records: list[dict]) -> tuple[bool, str, int]:
        if not records:
            return True, "No audit records to verify", 0

        previous = self.GENESIS
        for record in records:
            expected = self.compute_record_hash(
                previous_hash=record.get("stored_previous_hash", previous),
                verification_id=record["verification_id"],
                timestamp=record["timestamp"],
                document_hash=record["document_hash"],
                risk_result=record["risk_result"],
                risk_score=record["risk_score"],
                evidence_summary=record["evidence_summary"],
                officer_decision=record["officer_decision"],
            )
            if expected != record["current_hash"]:
                return False, "Audit chain integrity failure — record hash mismatch detected", len(records)
            previous = record["current_hash"]

        return True, "Audit chain intact", len(records)


audit_service = AuditService()
