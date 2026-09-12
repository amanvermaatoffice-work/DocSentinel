from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Border Identity Intelligence System"
    demo_mode: bool = True
    secret_key: str = "demo-secret-change-in-production"
    database_url: str = "sqlite+aiosqlite:///./data/biis.db"
    upload_dir: str = "./data/uploads"
    max_upload_size_mb: int = 10
    allowed_extensions: set[str] = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480
    risk_weights: dict[str, float] = {
        "document_integrity": 0.25,
        "machine_readable": 0.20,
        "image_forensics": 0.20,
        "face_verification": 0.15,
        "encounter_patterns": 0.20,
    }

    class Config:
        env_file = ".env"


settings = Settings()
