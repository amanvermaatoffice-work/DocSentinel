import hashlib
import json

from app.services.audit.audit_service import AuditService


def test_audit_chain_intact():
    svc = AuditService()
    prev = svc.GENESIS
    records = []
    for i in range(3):
        vid = f"VER-TEST{i}"
        ts = f"2026-09-03T10:0{i}:00"
        doc_hash = hashlib.sha256(f"doc{i}".encode()).hexdigest()
        current = svc.compute_record_hash(
            previous_hash=prev,
            verification_id=vid,
            timestamp=ts,
            document_hash=doc_hash,
            risk_result="LOW",
            risk_score=10.0,
            evidence_summary="test",
            officer_decision="Pending",
        )
        records.append({
            "verification_id": vid,
            "timestamp": ts,
            "document_hash": doc_hash,
            "risk_result": "LOW",
            "risk_score": 10.0,
            "evidence_summary": "test",
            "officer_decision": "Pending",
            "current_hash": current,
            "stored_previous_hash": prev,
        })
        prev = current

    intact, message, count = svc.verify_chain(records)
    assert intact is True
    assert count == 3
    assert "intact" in message.lower()


def test_audit_chain_tampered():
    svc = AuditService()
    prev = svc.GENESIS
    current = svc.compute_record_hash(
        previous_hash=prev,
        verification_id="VER-TAMPER",
        timestamp="2026-09-03T10:00:00",
        document_hash="abc",
        risk_result="LOW",
        risk_score=10.0,
        evidence_summary="test",
        officer_decision="Pending",
    )
    records = [{
        "verification_id": "VER-TAMPER",
        "timestamp": "2026-09-03T10:00:00",
        "document_hash": "abc",
        "risk_result": "LOW",
        "risk_score": 10.0,
        "evidence_summary": "test",
        "officer_decision": "Pending",
        "current_hash": "tampered_hash_value",
        "stored_previous_hash": prev,
    }]
    intact, message, _ = svc.verify_chain(records)
    assert intact is False
    assert "failure" in message.lower() or "mismatch" in message.lower()


def test_risk_levels():
    from app.services.risk_engine.risk_engine import RiskEngine

    engine = RiskEngine()
    assert engine.score_to_level(15) == "LOW"
    assert engine.score_to_level(45) == "MEDIUM"
    assert engine.score_to_level(75) == "HIGH"
    assert engine.score_to_level(90) == "CRITICAL"
