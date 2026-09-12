from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import EncounterRecord
from app.schemas.schemas import (
    DashboardStats,
    EncounterSummary,
    FraudPattern,
    GraphEdge,
    GraphNode,
    IdentityGraph,
    IdentityTimeline,
    TimelineEntry,
)
from app.services.demo_data import DEMO_ENCOUNTERS, FRAUD_PATTERNS


class EncounterService:
    async def seed_demo_data(self, db: AsyncSession) -> None:
        result = await db.execute(select(EncounterRecord).limit(1))
        if result.scalar_one_or_none():
            return

        for enc in DEMO_ENCOUNTERS:
            record = EncounterRecord(
                encounter_id=enc["encounter_id"],
                timestamp=datetime.fromisoformat(enc["timestamp"]),
                checkpoint=enc["checkpoint"],
                identity_reference=enc["identity_reference"],
                document_reference=enc["document_reference"],
                face_reference=enc["face_reference"],
                person_reference=enc["person_reference"],
                document_type=enc["document_type"],
                risk_score=enc["risk_score"],
                risk_level=enc["risk_level"],
                status=enc["status"],
            )
            db.add(record)
        await db.commit()

    async def get_all(self, db: AsyncSession) -> list[EncounterSummary]:
        result = await db.execute(select(EncounterRecord).order_by(EncounterRecord.timestamp.desc()))
        records = result.scalars().all()
        return [
            EncounterSummary(
                encounter_id=r.encounter_id,
                timestamp=r.timestamp,
                checkpoint=r.checkpoint,
                identity_reference=r.identity_reference,
                document_reference=r.document_reference,
                face_reference=r.face_reference,
                person_reference=r.person_reference,
                document_type=r.document_type,
                risk_score=r.risk_score,
                risk_level=r.risk_level,
                status=r.status,
            )
            for r in records
        ]

    async def get_by_id(self, db: AsyncSession, encounter_id: str) -> EncounterSummary | None:
        result = await db.execute(
            select(EncounterRecord).where(EncounterRecord.encounter_id == encounter_id)
        )
        r = result.scalar_one_or_none()
        if not r:
            return None
        return EncounterSummary(
            encounter_id=r.encounter_id,
            timestamp=r.timestamp,
            checkpoint=r.checkpoint,
            identity_reference=r.identity_reference,
            document_reference=r.document_reference,
            face_reference=r.face_reference,
            person_reference=r.person_reference,
            document_type=r.document_type,
            risk_score=r.risk_score,
            risk_level=r.risk_level,
            status=r.status,
        )

    async def get_dashboard_stats(self, db: AsyncSession) -> DashboardStats:
        encounters = await self.get_all(db)
        return DashboardStats(
            checkpoint="Checkpoint A — Indo-Nepal Border (DEMO)",
            encounters_processed=248,
            suspicious_encounters=17,
            high_risk_encounters=5,
            pending_reviews=8,
            system_status="Operational — DEMO MODE",
            demo_data=True,
        )

    async def get_identity_timeline(self, db: AsyncSession, identity_ref: str) -> IdentityTimeline:
        result = await db.execute(
            select(EncounterRecord)
            .where(
                (EncounterRecord.identity_reference == identity_ref)
                | (EncounterRecord.person_reference == identity_ref.replace("ID-", "PERSON-"))
            )
            .order_by(EncounterRecord.timestamp)
        )
        records = result.scalars().all()

        if not records:
            person_ref = identity_ref.replace("ID-REF", "PERSON-REF")
            result = await db.execute(
                select(EncounterRecord)
                .where(EncounterRecord.person_reference == person_ref)
                .order_by(EncounterRecord.timestamp)
            )
            records = result.scalars().all()

        entries = [
            TimelineEntry(
                timestamp=r.timestamp.strftime("%H:%M"),
                checkpoint=r.checkpoint,
                identity_reference=r.identity_reference,
                person_reference=r.person_reference,
                risk_level=r.risk_level,
                encounter_id=r.encounter_id,
            )
            for r in records
        ]

        alerts: list[str] = []
        identity_refs = {r.identity_reference for r in records}
        person_refs = {r.person_reference for r in records}
        if len(identity_refs) > 1 and len(person_refs) == 1:
            alerts.append(
                "POTENTIAL IDENTITY INCONSISTENCY: Same biometric reference associated "
                "with different identity references across encounters. Pattern requires officer review."
            )

        return IdentityTimeline(identity_reference=identity_ref, entries=entries, alerts=alerts)

    async def get_identity_graph(self, db: AsyncSession, identity_ref: str) -> IdentityGraph:
        timeline = await self.get_identity_timeline(db, identity_ref)
        nodes: list[GraphNode] = []
        edges: list[GraphEdge] = []

        person_ref = identity_ref.replace("ID-REF", "PERSON-REF")
        nodes.append(GraphNode(id=person_ref, label=person_ref, type="person"))
        nodes.append(GraphNode(id=identity_ref, label=identity_ref, type="identity"))

        suspicious_identities = set()
        if timeline.alerts:
            suspicious_identities = {e.identity_reference for e in timeline.entries}

        for entry in timeline.entries:
            enc_id = entry.encounter_id
            doc_id = f"DOC-{entry.identity_reference.split('-')[-1]}"
            cp_id = entry.checkpoint.replace(" ", "_")

            if not any(n.id == enc_id for n in nodes):
                nodes.append(GraphNode(id=enc_id, label=enc_id, type="encounter"))
            if not any(n.id == doc_id for n in nodes):
                nodes.append(
                    GraphNode(
                        id=doc_id,
                        label=doc_id,
                        type="document",
                        suspicious=entry.identity_reference in suspicious_identities,
                    )
                )
            if not any(n.id == cp_id for n in nodes):
                nodes.append(GraphNode(id=cp_id, label=entry.checkpoint, type="checkpoint"))

            edges.extend([
                GraphEdge(source=cp_id, target=enc_id, label="Encountered at"),
                GraphEdge(source=enc_id, target=person_ref, label="Associated with"),
                GraphEdge(source=enc_id, target=doc_id, label="Presented", suspicious=entry.identity_reference in suspicious_identities),
                GraphEdge(
                    source=doc_id,
                    target=entry.identity_reference,
                    label="Identity",
                    suspicious=entry.identity_reference in suspicious_identities,
                ),
            ])

        return IdentityGraph(nodes=nodes, edges=edges)

    def get_fraud_patterns(self) -> list[FraudPattern]:
        return [FraudPattern(**p) for p in FRAUD_PATTERNS]

    async def check_identity_alert(self, db: AsyncSession, person_reference: str) -> bool:
        result = await db.execute(
            select(EncounterRecord).where(EncounterRecord.person_reference == person_reference)
        )
        records = result.scalars().all()
        if len(records) < 2:
            return False
        identity_refs = {r.identity_reference for r in records}
        return len(identity_refs) > 1


encounter_service = EncounterService()
