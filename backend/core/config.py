"""Configuración central tipada y validada (pydantic-settings).

Reemplaza progresivamente los ``os.getenv`` dispersos. Por ahora cubre el núcleo
(auth, DB, CORS); el resto de módulos puede seguir usando ``os.getenv`` y coexisten.
``extra="ignore"`` evita que cualquier variable del ``.env`` no declarada aquí rompa
la carga. Importar ``settings`` valida al arranque (falla temprano si falta/está
mal una var crítica), igual que antes hacían security.py/database.py a mano.
"""

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_WEAK_SECRETS = {"", "change-me", "changeme", "secret", "test"}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    # --- Entorno / Auth ---
    env: str = "dev"
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 1440
    auth_accept_bearer: bool = True
    cors_origins: str = ""

    # --- Base de datos ---
    database_url: str = ""
    db_pool_size: int = 10
    db_max_overflow: int = 10
    db_connect_timeout: int = 10

    # --- Observabilidad / app ---
    log_level: str = "INFO"
    latency_threshold_ms: float = 278.0
    app_url: str = "https://genova.ai"
    frontend_url: str = "http://localhost:5173"

    # --- LLM (claves server-only + routing) ---
    llm_timeout_s: float = 120.0
    groq_api_key: str = ""
    openrouter_api_key: str = ""
    opencode_api_key: str = ""
    gemini_api_key: str = ""
    ova_enabled_llms: str = ""

    # --- Proveedores de imágenes ---
    hf_token: str = ""
    siliconflow_api_key: str = ""
    runware_api_key: str = ""
    falai_api_key: str = ""
    ova_max_generated_images: int = 2

    # --- RAG ---
    rag_embedder: str = "gemini"
    rag_disabled: str = ""
    rag_chunk_size: int = 800
    rag_chunk_overlap: int = 150
    rag_max_chunks_per_file: int = 100
    rag_top_k: int = 5
    rag_max_context_chars: int = 6000

    # --- Uploads ---
    upload_max_files: int = 5
    upload_max_file_size_mb: int = 20
    upload_temp_dir: str = ""

    # --- Generación OVA ---
    ova_gen_concurrency: int = 4
    ova_refine: str = "1"
    ova_generation_duration_seconds: int = 14
    ova_output_dir: str = ""
    ova_pg_checkpoint: str = ""
    resource_max_attempts: int = 3
    job_heartbeat_seconds: int = 30
    ova_critic: str = "0"
    ova_reflection_rounds: int = 1
    ova_editor: str = "0"

    # --- Supabase Storage ---
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_storage_bucket: str = "scorm-packages"

    # --- SMTP ---
    smtp_host: str = ""
    smtp_port: int = 465
    smtp_user: str = ""
    smtp_password: str = ""

    @field_validator("jwt_secret")
    @classmethod
    def _strong_secret(cls, v: str) -> str:
        if v in _WEAK_SECRETS or len(v) < 16:
            raise ValueError(
                "JWT_SECRET debe ser un valor aleatorio fuerte (>=16 chars). "
                'Genera con: python -c "import secrets; print(secrets.token_urlsafe(48))"'
            )
        return v


settings = Settings()
