"""
Pydantic Schema Definitions for Sahayata ML API
Defines robustly validated request and response structures for campaign viability assessment.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, field_validator, model_validator

def validate_timestamp_string(v: str) -> str:
    """Validates that a string conforms to a recognized timestamp format."""
    cleaned = v.rstrip("Z").strip()
    parsed = False
    for fmt in (
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
    ):
        try:
            datetime.strptime(cleaned, fmt)
            parsed = True
            break
        except ValueError:
            continue
    if not parsed:
        raise ValueError(
            f"Invalid timestamp format: '{v}'. Expected ISO 8601 (e.g. '2026-09-01T10:00:00Z') or 'YYYY-MM-DD HH:MM:SS'."
        )
    return v

class HealthResponse(BaseModel):
    """Health check response schema."""
    status: str = Field(default="ok", description="Service health status", examples=["ok"])

class DonationEvent(BaseModel):
    """Individual donation event."""
    amount: float = Field(
        ...,
        gt=0.0,
        le=1e8,
        description="Donation amount in USD (must be positive, <= $100,000,000)",
        examples=[50.0]
    )
    seconds_elapsed: Optional[float] = Field(
        None,
        ge=0.0,
        le=1e9,
        description="Non-negative seconds elapsed since campaign launch date",
        examples=[3600.0]
    )
    timestamp: Optional[str] = Field(
        None,
        description="ISO timestamp of donation event",
        examples=["2026-09-01T11:00:00Z"]
    )

    @field_validator("timestamp")
    @classmethod
    def validate_timestamp(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return validate_timestamp_string(v)
        return v

    @model_validator(mode="after")
    def check_time_provided(self):
        if self.seconds_elapsed is None and self.timestamp is None:
            raise ValueError("Each donation must specify either 'seconds_elapsed' (>= 0) or 'timestamp'.")
        return self

class UpdateEvent(BaseModel):
    """Creator update event."""
    seconds_elapsed: Optional[float] = Field(
        None,
        ge=0.0,
        le=1e9,
        description="Non-negative seconds elapsed since campaign launch date",
        examples=[7200.0]
    )
    timestamp: Optional[str] = Field(
        None,
        description="ISO timestamp of update event",
        examples=["2026-09-01T12:00:00Z"]
    )

    @field_validator("timestamp")
    @classmethod
    def validate_timestamp(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return validate_timestamp_string(v)
        return v

    @model_validator(mode="after")
    def check_time_provided(self):
        if self.seconds_elapsed is None and self.timestamp is None:
            raise ValueError("Each update event must specify either 'seconds_elapsed' (>= 0) or 'timestamp'.")
        return self

class CommentEvent(BaseModel):
    """Supporter comment event."""
    seconds_elapsed: Optional[float] = Field(
        None,
        ge=0.0,
        le=1e9,
        description="Non-negative seconds elapsed since campaign launch date",
        examples=[5400.0]
    )
    timestamp: Optional[str] = Field(
        None,
        description="ISO timestamp of comment event",
        examples=["2026-09-01T11:30:00Z"]
    )

    @field_validator("timestamp")
    @classmethod
    def validate_timestamp(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return validate_timestamp_string(v)
        return v

    @model_validator(mode="after")
    def check_time_provided(self):
        if self.seconds_elapsed is None and self.timestamp is None:
            raise ValueError("Each comment event must specify either 'seconds_elapsed' (>= 0) or 'timestamp'.")
        return self

class CampaignAssessmentRequest(BaseModel):
    """
    Campaign assessment request schema for 48-hour viability risk estimation.
    Enforces strict 48-hour cutoff, input bounds, and temporal validation.
    """
    campaign_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Unique campaign identifier",
        examples=["CAMP_2026_001"]
    )
    title: str = Field(
        ...,
        min_length=1,
        max_length=300,
        description="Campaign headline / title",
        examples=["Emergency Medical Fund for Alex"]
    )
    description: str = Field(
        ...,
        min_length=1,
        max_length=100000,
        description="Full text narrative/story of the campaign",
        examples=["We are raising funds for surgery and immediate hospital recovery costs..."]
    )
    goal: float = Field(
        ...,
        gt=0.0,
        le=1e9,
        description="Target funding amount in USD (must be positive and <= $1,000,000,000)",
        examples=[10000.0]
    )
    category: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Cause category (e.g., Medical, Memorial, Animals, Emergency, Financial Hardship, Other)",
        examples=["Medical"]
    )
    country: str = Field(
        default="US",
        min_length=2,
        max_length=50,
        description="Origin country ISO code or name",
        examples=["US"]
    )
    city: Optional[str] = Field(
        default="",
        max_length=100,
        description="Origin city",
        examples=["Seattle"]
    )
    launch_date: str = Field(
        ...,
        description="Launch timestamp (ISO format or YYYY-MM-DD HH:MM:SS)",
        examples=["2026-09-01T10:00:00Z"]
    )

    # Dynamic 48-hour events
    donations: Optional[List[DonationEvent]] = Field(
        default_factory=list,
        max_length=50000,
        description="List of donation events received"
    )
    updates: Optional[List[UpdateEvent]] = Field(
        default_factory=list,
        max_length=10000,
        description="List of creator updates posted"
    )
    comments: Optional[List[CommentEvent]] = Field(
        default_factory=list,
        max_length=50000,
        description="List of supporter comments posted"
    )

    # Direct raw arrays (MDCC format compatibility)
    donation_time: Optional[List[float]] = Field(
        default=None,
        description="Array of donation timestamps in seconds since launch"
    )
    donation_amount: Optional[List[float]] = Field(
        default=None,
        description="Array of donation amounts in USD"
    )
    update_time: Optional[List[float]] = Field(
        default=None,
        description="Array of update timestamps in seconds since launch"
    )
    comment_time: Optional[List[float]] = Field(
        default=None,
        description="Array of comment timestamps in seconds since launch"
    )

    # Visual assets metadata
    has_cover_photo: Optional[bool] = Field(
        default=True,
        description="Whether campaign has a cover photo"
    )
    num_body_photos: Optional[int] = Field(
        default=0,
        ge=0,
        le=500,
        description="Count of supporting photos in story"
    )
    cover_photo: Optional[str] = Field(
        default=None,
        description="Cover photo URL or identifier"
    )
    num_photo_main_body: Optional[int] = Field(
        default=None,
        ge=0,
        le=500,
        description="Body photo count alias"
    )

    @field_validator("campaign_id", "title", "description", "category", "country")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Field cannot be empty or whitespace-only.")
        return s

    @field_validator("launch_date")
    @classmethod
    def validate_launch_date(cls, v: str) -> str:
        return validate_timestamp_string(v)

    @model_validator(mode="after")
    def validate_raw_arrays(self):
        """Validates consistency of raw arrays if provided."""
        if self.donation_time is not None and self.donation_amount is not None:
            if len(self.donation_time) != len(self.donation_amount):
                raise ValueError("Length of 'donation_time' must match 'donation_amount'.")
            for t in self.donation_time:
                if t < 0:
                    raise ValueError("Donation timestamp cannot be negative.")
            for amt in self.donation_amount:
                if amt <= 0:
                    raise ValueError("Donation amount must be strictly positive (> 0).")
        return self

class FactorExplanation(BaseModel):
    """Explanation details for an individual feature factor."""
    feature_name: str = Field(..., description="Technical feature identifier")
    title: str = Field(..., description="Human-readable feature title")
    group: str = Field(..., description="Feature group (Metadata, Text, Early Behaviour, Image Metadata)")
    feature_value: float = Field(..., description="Raw numerical feature value")
    formatted_value: str = Field(..., description="Formatted value with domain units")
    shap_value: float = Field(..., description="Signed SHAP attribution value")
    impact_percentage: float = Field(..., description="Attribution impact as percentage of total risk")
    explanation: str = Field(..., description="Human-readable directional explanation")

class ExplanationPayload(BaseModel):
    """SHAP-based transparent explanation container."""
    base_rate_risk: float = Field(..., description="Baseline risk probability in training population")
    top_risk_factors: List[str] = Field(..., description="Top human-readable factors increasing funding risk")
    top_supporting_factors: List[str] = Field(..., description="Top human-readable factors supporting viability")
    detailed_risk_factors: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Granular factor details for risk-increasing features"
    )
    detailed_supporting_factors: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Granular factor details for viability-supporting features"
    )

class ModelInfo(BaseModel):
    """Metadata for active champion classifier."""
    name: str = Field(default="Random Forest Champion", description="Champion model identifier")
    model_type: str = Field(default="RandomForestClassifier", description="Underlying model class")
    n_features: int = Field(default=56, description="Total number of input features")
    calibration: str = Field(default="Platt Scaling (Sigmoid)", description="Post-hoc probability calibration method")

class ViabilityPredictionResponse(BaseModel):
    """
    Standardized response for campaign viability estimation endpoint.
    """
    campaign_id: str = Field(..., description="Campaign identifier")
    risk_probability: float = Field(..., description="Calibrated risk probability P(y=1) in [0.0, 1.0]")
    viability_score: int = Field(..., ge=0, le=100, description="Campaign Viability Score in [0, 100]")
    risk_level: str = Field(..., description="Viability tier: LOW RISK (70-100), MEDIUM RISK (40-69), or HIGH RISK (0-39)")
    prediction_horizon_hours: int = Field(default=48, description="Prediction cutoff in hours after launch")
    model: ModelInfo = Field(default_factory=ModelInfo, description="Active champion model info")
    explanation: ExplanationPayload = Field(..., description="SHAP feature attribution explanation")
    research_disclaimer: str = Field(
        default=(
            "The model provides decision support for campaign funding viability and does not "
            "determine whether a campaign is fraudulent or legitimate. High risk indicates a higher "
            "probability of campaign underfunding; it does not indicate fraud or malicious intent."
        ),
        description="Research and ethics safety notice"
    )

class PredictorStatusResponse(BaseModel):
    """Schema for model initialization and pipeline status queries."""
    status: str = Field(..., description="Predictor status code ('ready' or 'not_loaded')")
    model_loaded: bool = Field(..., description="Whether champion model is loaded in memory")
    model_type: Optional[str] = Field(None, description="Model class name")
    n_features: Optional[int] = Field(None, description="Number of expected input features")
    calibration_status: Optional[str] = Field(None, description="Identified calibration state")
    message: str = Field(..., description="Human-readable status description")

class ErrorResponse(BaseModel):
    """Standardized error response schema."""
    detail: str = Field(..., description="Sanitized, human-readable error explanation")
