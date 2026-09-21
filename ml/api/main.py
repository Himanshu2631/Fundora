"""
Sahayata ML Inference API — Main Application Entrypoint
FastAPI application for Campaign Viability Risk and Trust Score Estimation.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .schemas import (
    HealthResponse,
    PredictorStatusResponse,
    CampaignAssessmentRequest,
    ViabilityPredictionResponse,
    ErrorResponse
)
from .predictor import predictor, ModelArtifactError, InferenceError, ViabilityPredictor
from .dependencies import get_predictor, get_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("sahayata_ml_api")

API_DESCRIPTION = """
# Sahayata ML Inference API

Explainable AI-Based Campaign Viability Risk and Trust Score Estimation Service.

## Research Scope & Objective
This service evaluates donation-based crowdfunding campaigns strictly at **48 hours post-launch** to estimate the empirical probability of funding shortfall:
* **Target**: $y = 1$ if $\\text{raised} < \\text{goal}$ (Underfunded / Viability Risk), $y = 0$ if $\\text{raised} \\ge \\text{goal}$ (Funded / Low Risk).
* **Champion Model**: Random Forest Classifier trained on **56 Multimodal Features** (Metadata, Story Text, Early Dynamics, Visual Assets).
* **Calibration**: Platt Scaling (Sigmoid) fitted on validation data (ECE = 0.0304, Brier = 0.0954).
* **Explainability**: Exact Tree SHAP (`shap.TreeExplainer`) feature attributions.

## Viability Score & Risk Tiers
$$\\text{Risk Probability} = P(y = 1 \\mid x_{48h})$$
$$\\text{Viability Score} = \\text{round}\\Big(\\max(0, \\min(100, (1 - \\text{Risk Probability}) \\times 100))\\Big)$$

* **LOW RISK (70 – 100)**: Strong early traction, high velocity, achievable goal.
* **MEDIUM RISK (40 – 69)**: Moderate traction. Creator updates and peer outreach advised.
* **HIGH RISK (0 – 39)**: High risk of underfunding. Actionable guidance: adjust goal, increase status updates.

> **Ethical & Safety Notice**: High risk indicates a higher probability of campaign underfunding; it does not indicate fraud or malicious intent.
"""

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Loads the champion model and inference components into memory once on startup.
    """
    logger.info("Initializing Sahayata ML Inference API...")
    try:
        predictor.load_artifacts()
        logger.info("Champion model, feature pipeline, and SHAP explainer initialized on startup.")
    except ModelArtifactError as err:
        logger.error(f"Startup model load failed: {str(err)}")
    except Exception as exc:
        logger.error(f"Unexpected error during startup model initialization: {str(exc)}")
    yield
    logger.info("Shutting down Sahayata ML Inference API...")

app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    description=API_DESCRIPTION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Configure CORS with explicit, environment-aware allowed origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Sanitized Exception Handlers (Zero Leakage of Paths, Secrets, or Stack Traces)
@app.exception_handler(ModelArtifactError)
async def model_artifact_error_handler(request: Request, exc: ModelArtifactError):
    logger.error(f"ModelArtifactError on {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"detail": "Model service is currently unavailable. Required ML artifacts are not loaded."}
    )

@app.exception_handler(InferenceError)
async def inference_error_handler(request: Request, exc: InferenceError):
    logger.error(f"InferenceError on {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Inference failure: Unable to complete campaign viability prediction."}
    )

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": str(exc)}
    )

@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error on {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error occurred."}
    )

@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Service Health Check",
    description="Lightweight liveness probe returning service health status.",
    tags=["Health"],
    responses={
        200: {"description": "Service is healthy and operating normally", "model": HealthResponse}
    }
)
async def health_check() -> HealthResponse:
    """
    Returns API health status.
    Expected response: `{"status": "ok"}`
    """
    return HealthResponse(status="ok")

@app.get(
    "/status",
    response_model=PredictorStatusResponse,
    summary="Predictor & Model Status",
    description="Operational diagnostics endpoint reporting champion model in-memory state and calibration status.",
    tags=["Diagnostics"],
    responses={
        200: {"description": "Model operational state retrieved successfully", "model": PredictorStatusResponse}
    }
)
async def predictor_status(
    p: ViabilityPredictor = Depends(get_predictor)
) -> PredictorStatusResponse:
    """
    Diagnostics endpoint reporting champion model in-memory state and calibration status.
    """
    info = p.get_status()
    return PredictorStatusResponse(
        status="ready" if info["is_loaded"] else "not_loaded",
        model_loaded=info["is_loaded"],
        model_type=info["model_type"],
        n_features=info["n_features"],
        calibration_status=info["calibration_status"],
        message=(
            "Champion model is loaded in memory and ready for inference."
            if info["is_loaded"]
            else "Champion model is not loaded."
        )
    )

@app.post(
    "/predict/viability",
    response_model=ViabilityPredictionResponse,
    summary="Estimate Campaign Viability Risk & Score",
    description=(
        "Estimates campaign funding viability risk based strictly on signals from the first 48 hours post-launch:\n\n"
        "1. Extracts 56 multimodal features (16 Metadata, 28 Text, 9 Early Behaviour, 3 Image Metadata).\n"
        "2. Executes Random Forest champion baseline inference.\n"
        "3. Applies validation-fitted Platt scaling probability calibration.\n"
        "4. Computes Campaign Viability Score (0–100) and Risk Level (LOW RISK, MEDIUM RISK, HIGH RISK).\n"
        "5. Computes exact SHAP TreeExplainer attributions and returns top risk and supporting factors.\n\n"
        "**Ethical & Safety Note**: High risk indicates a higher probability of campaign underfunding; "
        "it does not indicate fraud or malicious intent."
    ),
    tags=["Inference"],
    responses={
        200: {"description": "Viability assessment completed successfully", "model": ViabilityPredictionResponse},
        422: {"description": "Validation error in request payload", "model": ErrorResponse},
        500: {"description": "Internal inference error", "model": ErrorResponse},
        503: {"description": "Model artifact unavailable", "model": ErrorResponse}
    }
)
async def predict_campaign_viability(
    payload: CampaignAssessmentRequest,
    p: ViabilityPredictor = Depends(get_predictor)
) -> ViabilityPredictionResponse:
    """
    Campaign viability prediction endpoint.
    """
    return p.predict(payload)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ml.api.main:app", host=settings.HOST, port=settings.PORT, reload=False)
