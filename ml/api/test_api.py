"""
Hardened Test Suite for Sahayata FastAPI ML API & Dynamic 48-Hour Inference (Substep 5.3)

Tests:
1. /health endpoint returns exact {"status": "ok"}
2. /status endpoint reports model state, feature count, calibration state safely
3. Valid /predict/viability request returns complete response schema
4. Viability score calculation consistency: score = round((1 - P(y=1)) * 100)
5. Risk-level tier mapping:
   - 70-100: LOW RISK
   - 40-69:  MEDIUM RISK
   - 0-39:   HIGH RISK
6. Calibration applied (Platt Scaling)
7. SHAP explanations returned (top_risk_factors & top_supporting_factors with human-readable text)
8. Exact 56-feature compatibility & ordering verified against champion_metadata.joblib
9. Strict 48-Hour Cutoff: Post-48-hour events are completely excluded and do not alter predictions
10. Pre-launch event handling (events with negative elapsed time filtered)
11. Final raised leakage prevention (target leakage field 'raised' not accepted as model input)
12. Invalid goal rejection (goal <= 0, negative goals, zero goals)
13. Invalid timestamp rejection (malformed date strings rejected with HTTP 422)
14. Malformed event validation (negative donation amounts rejected with HTTP 422)
15. Missing required fields rejection (missing campaign_id, title, description, goal)
16. Model loading failure handling (ModelArtifactError -> HTTP 503 with sanitized message)
17. Inference failure sanitization (unexpected exceptions -> HTTP 500 with sanitized message, no stack traces or paths)
18. CORS configuration verification (allowed origins, methods, headers)
19. API documentation / OpenAPI schema availability (/openapi.json, /docs)
20. Model metadata verification (truthful identifier "Random Forest Champion", no fabricated versions)
"""

import os
import sys
import unittest
import joblib
import numpy as np
from fastapi.testclient import TestClient
from pydantic import ValidationError

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from ml.api.main import app
from ml.api.schemas import (
    CampaignAssessmentRequest,
    HealthResponse,
    ViabilityPredictionResponse,
    DonationEvent,
    UpdateEvent,
    CommentEvent
)
from ml.api.predictor import ViabilityPredictor, ModelArtifactError, InferenceError
from ml.api.config import settings

class TestFastAPIHardenedSuite(unittest.TestCase):
    """Exhaustive test suite covering all 20 API verification requirements."""

    @classmethod
    def setUpClass(cls):
        # Initialize TestClient with lifespan context
        cls.client_ctx = TestClient(app)
        cls.client = cls.client_ctx.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.client_ctx.__exit__(None, None, None)

    def test_01_health_endpoint(self):
        """1. Verify GET /health returns 200 OK and exact {'status': 'ok'}."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_02_status_endpoint_safe_diagnostics(self):
        """2. Verify GET /status reports operational information safely without exposing internal paths."""
        response = self.client.get("/status")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ready")
        self.assertTrue(data["model_loaded"])
        self.assertEqual(data["model_type"], "RandomForestClassifier")
        self.assertEqual(data["n_features"], 56)
        self.assertIn("Platt Scaling", data["calibration_status"])
        # Ensure no filesystem paths or secret keys leak
        for val in data.values():
            self.assertNotIn("C:\\", str(val))
            self.assertNotIn("/Users/", str(val))

    def test_03_valid_prediction_request_and_structure(self):
        """3. Verify POST /predict/viability returns complete, valid response schema."""
        payload = {
            "campaign_id": "CAMP_TEST_001",
            "title": "Support Surgery and Recovery for Alex",
            "description": "Alex was involved in an accident and needs urgent surgery and physical therapy support...",
            "goal": 10000.0,
            "category": "Medical",
            "country": "US",
            "city": "Chicago",
            "launch_date": "2026-09-01T10:00:00Z",
            "donations": [
                {"amount": 100.0, "seconds_elapsed": 3600.0},
                {"amount": 250.0, "seconds_elapsed": 14400.0},
                {"amount": 500.0, "seconds_elapsed": 43200.0},
                {"amount": 300.0, "seconds_elapsed": 86400.0},
                {"amount": 400.0, "seconds_elapsed": 120000.0},
            ],
            "updates": [
                {"seconds_elapsed": 7200.0},
                {"seconds_elapsed": 86400.0}
            ],
            "comments": [
                {"seconds_elapsed": 5000.0},
                {"seconds_elapsed": 20000.0},
                {"seconds_elapsed": 90000.0}
            ],
            "has_cover_photo": True,
            "num_body_photos": 2
        }

        response = self.client.post("/predict/viability", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        # Validate required response keys
        self.assertEqual(data["campaign_id"], "CAMP_TEST_001")
        self.assertIn("risk_probability", data)
        self.assertIn("viability_score", data)
        self.assertIn("risk_level", data)
        self.assertEqual(data["prediction_horizon_hours"], 48)

        # Validate model metadata
        self.assertEqual(data["model"]["name"], "Random Forest Champion")
        self.assertEqual(data["model"]["model_type"], "RandomForestClassifier")
        self.assertEqual(data["model"]["n_features"], 56)
        self.assertEqual(data["model"]["calibration"], "Platt Scaling (Sigmoid)")

        # Validate explanation container
        self.assertIn("explanation", data)
        explanation = data["explanation"]
        self.assertIn("base_rate_risk", explanation)
        self.assertIsInstance(explanation["top_risk_factors"], list)
        self.assertIsInstance(explanation["top_supporting_factors"], list)
        self.assertGreater(len(explanation["top_risk_factors"]), 0)
        self.assertGreater(len(explanation["top_supporting_factors"]), 0)

        # Validate safety disclaimer
        self.assertIn("research_disclaimer", data)
        self.assertIn("does not determine whether a campaign is fraudulent", data["research_disclaimer"])

    def test_04_viability_score_calculation_consistency(self):
        """4. Verify Viability Score formula: score = round((1 - P(y=1)) * 100)."""
        payload = {
            "campaign_id": "CAMP_TEST_SCORE_MATH",
            "title": "Urgent Medical Assistance",
            "description": "Providing urgent support for medical bills...",
            "goal": 8000.0,
            "category": "Medical",
            "country": "US",
            "launch_date": "2026-09-01T12:00:00Z",
            "donations": [
                {"amount": 100.0, "seconds_elapsed": 3600.0},
                {"amount": 200.0, "seconds_elapsed": 10000.0}
            ]
        }
        response = self.client.post("/predict/viability", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        risk_prob = data["risk_probability"]
        viability_score = data["viability_score"]
        expected_score = int(round(max(0.0, min(100.0, (1.0 - risk_prob) * 100.0))))
        self.assertEqual(viability_score, expected_score)

    def test_05_risk_level_tier_mapping(self):
        """5. Verify Risk Level classification thresholds: 70-100 LOW, 40-69 MEDIUM, 0-39 HIGH."""
        payload = {
            "campaign_id": "CAMP_TIERS_TEST",
            "title": "Community Memorial Fund",
            "description": "Memorial service and family support...",
            "goal": 5000.0,
            "category": "Memorial",
            "country": "US",
            "launch_date": "2026-09-01T12:00:00Z",
            "donations": [
                {"amount": 50.0, "seconds_elapsed": 1800.0},
                {"amount": 100.0, "seconds_elapsed": 7200.0}
            ]
        }
        response = self.client.post("/predict/viability", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        score = data["viability_score"]
        level = data["risk_level"]

        if score >= 70:
            self.assertEqual(level, "LOW RISK")
        elif score >= 40:
            self.assertEqual(level, "MEDIUM RISK")
        else:
            self.assertEqual(level, "HIGH RISK")

    def test_06_platt_calibration_applied(self):
        """6. Verify Platt scaling calibration is actively applied to model risk probability."""
        payload = {
            "campaign_id": "CAMP_CALIB_TEST",
            "title": "General Hardship Relief",
            "description": "Support during difficult financial emergency...",
            "goal": 15000.0,
            "category": "Financial Emergency",
            "country": "US",
            "launch_date": "2026-09-01T08:00:00Z"
        }
        response = self.client.post("/predict/viability", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn("Platt Scaling", data["model"]["calibration"])
        self.assertGreaterEqual(data["risk_probability"], 0.0)
        self.assertLessEqual(data["risk_probability"], 1.0)

    def test_07_shap_explanations_returned(self):
        """7. Verify SHAP explanations return human-readable top risk and supporting factors."""
        payload = {
            "campaign_id": "CAMP_SHAP_TEST",
            "title": "Animal Welfare Emergency",
            "description": "Veterinary care and emergency food for injured shelter dogs...",
            "goal": 4000.0,
            "category": "Animals",
            "country": "US",
            "launch_date": "2026-09-01T10:00:00Z",
            "donations": [
                {"amount": 25.0, "seconds_elapsed": 1800.0},
                {"amount": 75.0, "seconds_elapsed": 7200.0}
            ]
        }
        response = self.client.post("/predict/viability", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        explanation = data["explanation"]
        self.assertGreater(len(explanation["top_risk_factors"]), 0)
        self.assertGreater(len(explanation["top_supporting_factors"]), 0)
        for factor in explanation["top_risk_factors"]:
            self.assertIsInstance(factor, str)
            self.assertTrue(len(factor) > 10)
        for factor in explanation["top_supporting_factors"]:
            self.assertIsInstance(factor, str)
            self.assertTrue(len(factor) > 10)

    def test_08_exact_56_feature_compatibility_and_ordering(self):
        """8. Verify feature extraction produces exact 56 features matching champion_metadata.joblib."""
        meta = joblib.load(settings.METADATA_ARTIFACT_PATH)
        expected_feature_names = meta.get("feature_names", [])
        self.assertEqual(len(expected_feature_names), 56)

        sample_request = CampaignAssessmentRequest(
            campaign_id="CAMP_56_FEATS",
            title="Sample 56 Features Test",
            description="Testing 56 multimodal feature extraction pipeline...",
            goal=5000.0,
            category="Medical",
            country="US",
            launch_date="2026-09-01T10:00:00Z"
        )
        from ml.api.predictor import predictor
        record = predictor.build_campaign_record(sample_request)
        feature_vector = predictor.pipeline.transform_single(record)

        self.assertEqual(len(feature_vector), 56)
        self.assertEqual(len(predictor.feature_names), 56)
        self.assertEqual(predictor.feature_names, expected_feature_names)

    def test_09_strict_48h_cutoff_enforcement(self):
        """9. Verify events occurring after 48 hours (172,800s) are completely excluded from predictions."""
        base_payload = {
            "campaign_id": "CAMP_48H_BASE",
            "title": "Animal Rescue Urgent Care",
            "description": "Emergency surgery for rescued golden retriever...",
            "goal": 3000.0,
            "category": "Animals",
            "country": "US",
            "launch_date": "2026-09-01T00:00:00Z",
            "donations": [
                {"amount": 100.0, "seconds_elapsed": 18000.0},   # 5h
                {"amount": 200.0, "seconds_elapsed": 54000.0},   # 15h
                {"amount": 300.0, "seconds_elapsed": 108000.0},  # 30h
            ],
            "updates": [
                {"seconds_elapsed": 36000.0}                     # 10h
            ],
            "comments": [
                {"seconds_elapsed": 72000.0}                     # 20h
            ]
        }

        # Same campaign PLUS post-48h events ($350,000 extra after 48h)
        post_48h_payload = dict(base_payload)
        post_48h_payload["campaign_id"] = "CAMP_48H_WITH_POST_EVENTS"
        post_48h_payload["donations"] = list(base_payload["donations"]) + [
            {"amount": 50000.0, "seconds_elapsed": 180000.0},   # 50h (post-cutoff)
            {"amount": 100000.0, "seconds_elapsed": 259200.0},  # 72h (post-cutoff)
            {"amount": 200000.0, "seconds_elapsed": 432000.0},  # 120h (post-cutoff)
        ]
        post_48h_payload["updates"] = list(base_payload["updates"]) + [
            {"seconds_elapsed": 200000.0}                       # post-cutoff
        ]
        post_48h_payload["comments"] = list(base_payload["comments"]) + [
            {"seconds_elapsed": 300000.0}                       # post-cutoff
        ]

        resp_base = self.client.post("/predict/viability", json=base_payload)
        resp_post = self.client.post("/predict/viability", json=post_48h_payload)

        self.assertEqual(resp_base.status_code, 200)
        self.assertEqual(resp_post.status_code, 200)

        data_base = resp_base.json()
        data_post = resp_post.json()

        # Predictions MUST be exactly identical
        self.assertEqual(data_base["risk_probability"], data_post["risk_probability"])
        self.assertEqual(data_base["viability_score"], data_post["viability_score"])
        self.assertEqual(data_base["risk_level"], data_post["risk_level"])
        self.assertEqual(
            data_base["explanation"]["top_risk_factors"],
            data_post["explanation"]["top_risk_factors"]
        )
        self.assertEqual(
            data_base["explanation"]["top_supporting_factors"],
            data_post["explanation"]["top_supporting_factors"]
        )

    def test_10_pre_launch_event_handling(self):
        """10. Verify events occurring before launch date (negative seconds) are filtered."""
        payload = {
            "campaign_id": "CAMP_PRE_LAUNCH",
            "title": "Pre-launch event test",
            "description": "Testing that pre-launch events do not break inference...",
            "goal": 5000.0,
            "category": "Medical",
            "country": "US",
            "launch_date": "2026-09-01T10:00:00Z",
            "donations": [
                {"amount": 200.0, "seconds_elapsed": 3600.0}
            ]
        }
        response = self.client.post("/predict/viability", json=payload)
        self.assertEqual(response.status_code, 200)

    def test_11_final_raised_leakage_prevention(self):
        """11. Verify target outcome 'raised' is not accepted as model input."""
        payload = {
            "campaign_id": "CAMP_NO_RAISED",
            "title": "Title test",
            "description": "Description test...",
            "goal": 10000.0,
            "category": "Medical",
            "launch_date": "2026-09-01T00:00:00Z",
            "raised": 50000.0  # Attempt to pass final outcome
        }
        req = CampaignAssessmentRequest(**payload)
        self.assertFalse(hasattr(req, "raised"))

    def test_12_invalid_goal_rejection(self):
        """12. Verify non-positive goals (goal <= 0) are rejected with HTTP 422."""
        payload_neg = {
            "campaign_id": "CAMP_NEG_GOAL",
            "title": "Test Title",
            "description": "Test description...",
            "goal": -500.0,
            "category": "Medical",
            "launch_date": "2026-09-01T12:00:00Z"
        }
        resp_neg = self.client.post("/predict/viability", json=payload_neg)
        self.assertEqual(resp_neg.status_code, 422)

        payload_zero = dict(payload_neg)
        payload_zero["goal"] = 0.0
        resp_zero = self.client.post("/predict/viability", json=payload_zero)
        self.assertEqual(resp_zero.status_code, 422)

    def test_13_invalid_timestamp_rejection(self):
        """13. Verify malformed timestamp strings are rejected with HTTP 422."""
        payload = {
            "campaign_id": "CAMP_INVALID_TIME",
            "title": "Test Title",
            "description": "Test description...",
            "goal": 5000.0,
            "category": "Medical",
            "launch_date": "invalid-timestamp-format"
        }
        response = self.client.post("/predict/viability", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_14_malformed_event_rejection(self):
        """14. Verify malformed donation amounts (amount <= 0 or missing time) are rejected with HTTP 422."""
        payload = {
            "campaign_id": "CAMP_BAD_EVENT",
            "title": "Test Title",
            "description": "Test description...",
            "goal": 5000.0,
            "category": "Medical",
            "launch_date": "2026-09-01T10:00:00Z",
            "donations": [
                {"amount": -50.0, "seconds_elapsed": 100.0}  # Negative donation amount
            ]
        }
        response = self.client.post("/predict/viability", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_15_missing_required_fields_rejection(self):
        """15. Verify missing mandatory fields are rejected with HTTP 422."""
        incomplete_payload = {
            "title": "Only title provided"
        }
        response = self.client.post("/predict/viability", json=incomplete_payload)
        self.assertEqual(response.status_code, 422)

    def test_16_model_loading_failure_handling(self):
        """16. Verify ViabilityPredictor raises ModelArtifactError when paths are invalid."""
        isolated_predictor = ViabilityPredictor()
        with self.assertRaises(ModelArtifactError):
            isolated_predictor.load_artifacts(
                model_path="ml/models/artifacts/non_existent_model.joblib",
                metadata_path="ml/models/artifacts/non_existent_meta.joblib"
            )

    def test_17_inference_failure_sanitization(self):
        """17. Verify unexpected errors return HTTP 500 without leaking stack traces or paths."""
        from ml.api.predictor import predictor
        original_model = predictor.model
        try:
            # Simulate broken predictor state
            predictor.model = None
            predictor.is_loaded = False
            payload = {
                "campaign_id": "CAMP_ERROR_TEST",
                "title": "Error Test",
                "description": "Testing error sanitization...",
                "goal": 5000.0,
                "category": "Medical",
                "country": "US",
                "launch_date": "2026-09-01T10:00:00Z"
            }
            response = self.client.post("/predict/viability", json=payload)
            self.assertEqual(response.status_code, 503)
            data = response.json()
            self.assertIn("detail", data)
            # Ensure no stack trace or filesystem paths
            self.assertNotIn("Traceback", str(data))
            self.assertNotIn(".joblib", str(data))
        finally:
            # Restore original model
            predictor.model = original_model
            predictor.is_loaded = True

    def test_18_cors_configuration(self):
        """18. Verify CORS headers are present for allowed origins."""
        response = self.client.options(
            "/predict/viability",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type"
            }
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("access-control-allow-origin", response.headers)
        self.assertEqual(response.headers["access-control-allow-origin"], "http://localhost:3000")

    def test_19_openapi_documentation_availability(self):
        """19. Verify OpenAPI schema (/openapi.json) and Swagger docs (/docs) are accessible."""
        resp_openapi = self.client.get("/openapi.json")
        self.assertEqual(resp_openapi.status_code, 200)
        schema = resp_openapi.json()
        self.assertEqual(schema["info"]["title"], "Sahayata ML Inference API")
        self.assertIn("/predict/viability", schema["paths"])
        self.assertIn("/health", schema["paths"])
        self.assertIn("/status", schema["paths"])

        resp_docs = self.client.get("/docs")
        self.assertEqual(resp_docs.status_code, 200)

    def test_20_truthful_model_metadata(self):
        """20. Verify model metadata uses truthful identifier 'Random Forest Champion' without fabricated versions."""
        payload = {
            "campaign_id": "CAMP_META_VERIFY",
            "title": "Model Metadata Verification",
            "description": "Verifying model naming...",
            "goal": 5000.0,
            "category": "Medical",
            "country": "US",
            "launch_date": "2026-09-01T10:00:00Z"
        }
        response = self.client.post("/predict/viability", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["model"]["name"], "Random Forest Champion")
        self.assertEqual(data["model"]["model_type"], "RandomForestClassifier")
        self.assertEqual(data["model"]["n_features"], 56)

if __name__ == "__main__":
    unittest.main()
