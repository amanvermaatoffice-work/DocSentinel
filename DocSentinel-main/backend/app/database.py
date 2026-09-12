from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        from sqlalchemy import text
        for col_sql in [
            "ALTER TABLE encounters ADD COLUMN document_path VARCHAR(256)",
            "ALTER TABLE encounters ADD COLUMN selfie_path VARCHAR(256)",
            "ALTER TABLE audit_records ADD COLUMN document_type VARCHAR(64) DEFAULT 'Unknown Document'",
            "ALTER TABLE audit_records ADD COLUMN face_similarity_score FLOAT DEFAULT 0.0",
            "ALTER TABLE audit_records ADD COLUMN document_path VARCHAR(256)",
            "ALTER TABLE audit_records ADD COLUMN selfie_path VARCHAR(256)",
            "ALTER TABLE audit_records ADD COLUMN officer_id VARCHAR(64) DEFAULT 'OFFICER-DEMO'",
        ]:
            try:
                await conn.execute(text(col_sql))
            except Exception:
                pass

