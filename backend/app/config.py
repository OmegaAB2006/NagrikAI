from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # IBM watsonx AI
    IBM_API_KEY: str = "aXB8S0VhsI2v_bwaJ5NHks2ndgReCdtWjLiyBTAHyCPR"
    IBM_MODEL: str = "ibm/granite-4-h-small"
    IBM_VISION_MODEL: str = "meta-llama/llama-4-maverick-17b-128e-instruct-fp8"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./nagrikAI.db"
    DATABASE_SYNC_URL: str = "sqlite:///./nagrikAI.db"

    # Security
    SECRET_KEY: str = "nagrikAI-secret-key-change-in-production-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # Redis (optional)
    REDIS_URL: str = "redis://localhost:6379"

    # App
    APP_NAME: str = "NagrikAI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ALLOWED_ORIGINS: list = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Operational Limits
    MAX_TOKENS_PER_REQUEST: int = 8192
    MAX_AGENT_ITERATIONS: int = 10
    MAX_WORKFLOW_TIME_SECONDS: int = 120
    MAX_FILE_SIZE_MB: int = 10

    # IBM watsonx Project
    IBM_PROJECT: str = "858f90ab-a928-4103-8fff-9f4da13b9e29"

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
