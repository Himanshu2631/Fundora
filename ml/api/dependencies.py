"""
FastAPI Dependencies for Sahayata ML API
Provides dependency injection providers for settings and predictor instances.
"""

from .config import settings, Settings
from .predictor import predictor, ViabilityPredictor

def get_settings() -> Settings:
    """Dependency provider for application settings."""
    return settings

def get_predictor() -> ViabilityPredictor:
    """Dependency provider for the initialized model predictor."""
    return predictor
