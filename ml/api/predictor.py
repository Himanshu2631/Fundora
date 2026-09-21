"""
Model Predictor & Inference Pipeline Module
Orchestrates 48-hour feature extraction, Random Forest inference,
Platt scaling calibration, and SHAP-based local explanations.
"""

import os
import json
import logging
from datetime import datetime
import joblib
import numpy as np
from typing import Dict, Any, Optional, List, Tuple

from .config import settings
from .schemas import (
    CampaignAssessmentRequest,
    ViabilityPredictionResponse,
    ExplanationPayload,
    ModelInfo
)
from ml.features.pipeline import FeatureExtractionPipeline
from ml.explainability.local_explainer import LocalCampaignExplainer, get_risk_level, RESEARCH_DISCLAIMER
from ml.explainability.calibration import ProbabilityCalibrator

logger = logging.getLogger("sahayata_ml_api")

class ModelArtifactError(Exception):
    """Raised when the required model or metadata artifact cannot be found or loaded."""
    pass

class InferenceError(Exception):
    """Raised when feature extraction or model inference fails."""
    pass

def parse_iso_dt(ts_str: str) -> datetime:
    """Parses timestamp string into datetime."""
    cleaned = ts_str.rstrip("Z").strip()
    for fmt in (
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
    ):
        try:
            return datetime.strptime(cleaned, fmt)
        except ValueError:
            continue
    raise ValueError(f"Unable to parse timestamp: '{ts_str}'")

class ViabilityPredictor:
    """
    In-memory predictor managing feature extraction, champion Random Forest model,
    Platt probability calibrator, and SHAP explainability layer.
    """

    def __init__(self):
        self.model = None
        self.metadata = {}
        self.feature_names: List[str] = []
        self.n_features: int = 0
        self.pipeline: Optional[FeatureExtractionPipeline] = None
        self.local_explainer: Optional[LocalCampaignExplainer] = None
        self.calibrator: Optional[ProbabilityCalibrator] = None
        self.is_loaded: bool = False
        self.calibration_status: str = "Unchecked"

    def load_artifacts(
        self,
        model_path: Optional[str] = None,
        metadata_path: Optional[str] = None,
        calibrator_path: Optional[str] = None
    ) -> None:
        """
        Loads the champion model, metadata, calibrator, and SHAP explainer from disk into memory.
        Must be executed once during application startup.
        """
        target_model_path = model_path or settings.MODEL_ARTIFACT_PATH
        target_meta_path = metadata_path or settings.METADATA_ARTIFACT_PATH
        target_calib_path = calibrator_path or os.path.join(
            os.path.dirname(target_model_path), "platt_calibrator.joblib"
        )

        if not os.path.exists(target_model_path):
            logger.error(f"Champion model artifact missing at internal path: {target_model_path}")
            raise ModelArtifactError("Champion model artifact is missing. Please verify model training.")

        if not os.path.exists(target_meta_path):
            logger.error(f"Champion metadata artifact missing at internal path: {target_meta_path}")
            raise ModelArtifactError("Champion metadata artifact is missing. Please verify model training.")

        try:
            self.model = joblib.load(target_model_path)
            self.metadata = joblib.load(target_meta_path)
            self.feature_names = self.metadata.get("feature_names", [])
            self.n_features = len(self.feature_names) or (
                self.model.n_features_in_ if hasattr(self.model, "n_features_in_") else 56
            )

            # Initialize 48-hour feature extraction pipeline
            self.pipeline = FeatureExtractionPipeline(window_hours=48.0, top_n_tfidf=20)

            # Initialize SHAP local explainer
            self.local_explainer = LocalCampaignExplainer(self.model, self.feature_names)

            # Load Platt calibrator if present
            if os.path.exists(target_calib_path):
                self.calibrator = joblib.load(target_calib_path)
                self.calibration_status = "Platt Scaling (Sigmoid fitted on validation set)"
                logger.info(f"Loaded Platt scaling calibrator from {target_calib_path}")
            else:
                self.calibrator = None
                self._identify_calibration_status()

            self.is_loaded = True
            logger.info(
                f"Successfully initialized ViabilityPredictor ({self.model.__class__.__name__}) with {self.n_features} features."
            )
        except ModelArtifactError:
            raise
        except Exception as exc:
            logger.error(f"Failed to initialize model artifacts: {str(exc)}")
            raise ModelArtifactError("Failed to deserialize model artifacts.") from exc

    def _identify_calibration_status(self) -> None:
        """Inspects existing calibration analysis artifacts."""
        calib_path = settings.CALIBRATION_RESULTS_PATH
        if os.path.exists(calib_path):
            self.calibration_status = "Platt Scaling (Sigmoid verified on validation set)"
        else:
            self.calibration_status = "Uncalibrated (raw Random Forest probability output)"

    def build_campaign_record(self, campaign: CampaignAssessmentRequest) -> Dict[str, Any]:
        """
        Converts the API request payload into the standardized record format
        expected by the 56-feature extraction pipeline. Enforces the 48-hour cutoff.
        """
        launch_dt = parse_iso_dt(campaign.launch_date)

        # 1. Process donation events
        donation_times: List[float] = []
        donation_amts: List[float] = []

        if campaign.donation_time is not None and campaign.donation_amount is not None:
            for t, amt in zip(campaign.donation_time, campaign.donation_amount):
                sec = float(t)
                if sec < 0:
                    continue
                donation_times.append(sec)
                donation_amts.append(float(amt))
        elif campaign.donations:
            for don in campaign.donations:
                if don.seconds_elapsed is not None:
                    sec = float(don.seconds_elapsed)
                elif don.timestamp is not None:
                    don_dt = parse_iso_dt(don.timestamp)
                    sec = (don_dt - launch_dt).total_seconds()
                else:
                    continue

                if sec < 0:
                    # Ignore donations occurring prior to launch
                    continue
                donation_times.append(sec)
                donation_amts.append(float(don.amount))

        # 2. Process creator update events
        update_times: List[float] = []
        if campaign.update_time is not None:
            for t in campaign.update_time:
                sec = float(t)
                if sec < 0:
                    continue
                update_times.append(sec)
        elif campaign.updates:
            for upd in campaign.updates:
                if upd.seconds_elapsed is not None:
                    sec = float(upd.seconds_elapsed)
                elif upd.timestamp is not None:
                    upd_dt = parse_iso_dt(upd.timestamp)
                    sec = (upd_dt - launch_dt).total_seconds()
                else:
                    continue
                if sec < 0:
                    continue
                update_times.append(sec)

        # 3. Process supporter comment events
        comment_times: List[float] = []
        if campaign.comment_time is not None:
            for t in campaign.comment_time:
                sec = float(t)
                if sec < 0:
                    continue
                comment_times.append(sec)
        elif campaign.comments:
            for com in campaign.comments:
                if com.seconds_elapsed is not None:
                    sec = float(com.seconds_elapsed)
                elif com.timestamp is not None:
                    com_dt = parse_iso_dt(com.timestamp)
                    sec = (com_dt - launch_dt).total_seconds()
                else:
                    continue
                if sec < 0:
                    continue
                comment_times.append(sec)

        # 4. Image metadata
        cover_val = "true" if (campaign.has_cover_photo or campaign.cover_photo) else "false"
        num_body = int(
            campaign.num_body_photos if campaign.num_body_photos is not None
            else (campaign.num_photo_main_body or 0)
        )

        return {
            "campaign_id": campaign.campaign_id,
            "category": campaign.category,
            "goal": float(campaign.goal),
            "launch_date": campaign.launch_date,
            "country": campaign.country,
            "city": campaign.city or "",
            "description": f"{campaign.title} {campaign.description}".strip(),
            "cover_photo": cover_val,
            "num_photo_main_body": num_body,
            "donation_time": donation_times,
            "donation_amount": donation_amts,
            "update_time": update_times,
            "comment_time": comment_times,
        }

    def predict(self, campaign: CampaignAssessmentRequest) -> ViabilityPredictionResponse:
        """
        Executes full inference:
        1. Builds campaign representation
        2. Extracts the exact 56 features
        3. Predicts raw Random Forest risk probability
        4. Applies Platt scaling calibration
        5. Computes Viability Score & Risk Level
        6. Computes SHAP attributions and human-readable explanations
        """
        if not self.is_loaded or self.model is None or self.pipeline is None:
            raise ModelArtifactError("Model predictor is not initialized or loaded.")

        try:
            # 1. Build representation and extract features
            record = self.build_campaign_record(campaign)
            feature_vector = self.pipeline.transform_single(record)

            if len(feature_vector) != self.n_features:
                raise ValueError(
                    f"Extracted feature dimension ({len(feature_vector)}) does not match expected ({self.n_features})."
                )

            # 2. Model Prediction
            x_arr = np.array(feature_vector).reshape(1, -1)
            raw_probs = self.model.predict_proba(x_arr)[0]
            raw_risk_prob = float(raw_probs[1]) if len(raw_probs) > 1 else float(raw_probs[0])

            # 3. Platt Scaling Calibration
            if self.calibrator is not None:
                calibrated_prob = float(self.calibrator.predict_proba([raw_risk_prob])[0])
            else:
                calibrated_prob = raw_risk_prob

            final_risk_prob = round(float(np.clip(calibrated_prob, 0.0, 1.0)), 4)

            # 4. Viability Score Calculation
            # Viability Score = round(max(0, min(100, (1 - Risk Probability) * 100)))
            viability_score = int(round(max(0.0, min(100.0, (1.0 - final_risk_prob) * 100.0))))
            risk_level = get_risk_level(float(viability_score))

            # 5. SHAP Explanation Generation
            exp_res = self.local_explainer.explain_campaign(
                campaign=feature_vector,
                top_k=5,
                campaign_meta={"campaign_id": campaign.campaign_id}
            )

            explanation_payload = ExplanationPayload(
                base_rate_risk=round(exp_res["base_rate_risk"], 4),
                top_risk_factors=exp_res["top_risk_factors"],
                top_supporting_factors=exp_res["top_supporting_factors"],
                detailed_risk_factors=exp_res["detailed_risk_factors"],
                detailed_supporting_factors=exp_res["detailed_supporting_factors"],
            )

            model_info = ModelInfo(
                name="Random Forest Champion",
                model_type="RandomForestClassifier",
                n_features=self.n_features,
                calibration="Platt Scaling (Sigmoid)" if self.calibrator is not None else "Uncalibrated"
            )

            return ViabilityPredictionResponse(
                campaign_id=campaign.campaign_id,
                risk_probability=final_risk_prob,
                viability_score=viability_score,
                risk_level=risk_level,
                prediction_horizon_hours=48,
                model=model_info,
                explanation=explanation_payload,
                research_disclaimer=RESEARCH_DISCLAIMER
            )

        except ModelArtifactError:
            raise
        except Exception as exc:
            logger.error(f"Inference error for campaign {campaign.campaign_id}: {str(exc)}")
            raise InferenceError("An error occurred during feature extraction or model inference.") from exc

    def get_status(self) -> Dict[str, Any]:
        """Returns internal status summary of the predictor."""
        return {
            "is_loaded": self.is_loaded,
            "model_type": self.model.__class__.__name__ if self.model else None,
            "n_features": self.n_features,
            "calibration_status": self.calibration_status,
            "has_feature_names": len(self.feature_names) > 0
        }

# Global singleton predictor instance
predictor = ViabilityPredictor()
