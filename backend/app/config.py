from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    database_url: str = "sqlite:///./myautograph.db"
    cors_origins_raw: str = "http://localhost:5173,http://127.0.0.1:5173"

    class Config:
        env_file = ".env"
        env_prefix = ""

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins_raw.split(",") if origin.strip()]


settings = Settings()
