"""
Configuration Settings for Sahayata ML API
Centralizes server host, port, allowed origins, and artifact paths.
"""

import os
from typing import List

class Settings:
    """Application settings with environment variable fallbacks."""

    def __init__(self):
        # Server settings
        self.API_TITLE: str = "Sahayata ML Inference API"
        self.API_VERSION: str = "1.0.0"
        self.API_DESCRIPTION: str = (
            "Explainable AI-Based Campaign Viability Risk and Trust Score Estimation API"
        )
        self.HOST: str = os.getenv("SAHAYATA_ML_HOST", "127.0.0.1")
        self.PORT: int = int(os.getenv("SAHAYATA_ML_PORT", "8000"))

        # CORS settings
        allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
        if allowed_origins_env:
            self.ALLOWED_ORIGINS: List[str] = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
        else:
            self.ALLOWED_ORIGINS: List[str] = [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:8000",
                "http://127.0.0.1:8000",
            ]

        # Artifact locations
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        self.MODEL_ARTIFACT_PATH: str = os.getenv(
            "MODEL_ARTIFACT_PATH",
            os.path.join(base_dir, "models", "artifacts", "random_forest_champion.joblib")
        )
        self.METADATA_ARTIFACT_PATH: str = os.getenv(
            "METADATA_ARTIFACT_PATH",
            os.path.join(base_dir, "models", "artifacts", "champion_metadata.joblib")
        )
        self.CALIBRATION_RESULTS_PATH: str = os.getenv(
            "CALIBRATION_RESULTS_PATH",
            os.path.join(base_dir, "experiments", "results", "explainability", "calibration_analysis.json")
        )

settings = Settings()
