"""
Model Trainer Module
Provides standard training, evaluation, and serialization utilities for baseline models
and the champion Random Forest model on the MDCC dataset.
"""

import os
import joblib
import numpy as np
from typing import Dict, Any, Tuple, Optional, List
from sklearn.ensemble import RandomForestClassifier
from ml.evaluation.metrics import calculate_metrics

class ModelTrainer:
    """
    Trains and saves ML models with deterministic hyperparameters.
    """

    def __init__(self, artifact_dir: Optional[str] = None):
        self.artifact_dir = artifact_dir or os.path.abspath(os.path.join(os.path.dirname(__file__), "artifacts"))
        os.makedirs(self.artifact_dir, exist_ok=True)

    def train_champion_random_forest(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: Optional[np.ndarray] = None,
        y_val: Optional[np.ndarray] = None,
        X_test: Optional[np.ndarray] = None,
        y_test: Optional[np.ndarray] = None,
        feature_names: Optional[List[str]] = None,
        save_model: bool = True
    ) -> Tuple[RandomForestClassifier, Dict[str, Any]]:
        """
        Trains the champion Random Forest classifier:
        - 56 Multimodal engineered features
        - n_estimators=50, max_depth=7, min_samples_split=15, class_weight='balanced', random_state=42
        """
        rf = RandomForestClassifier(
            n_estimators=50,
            max_depth=7,
            min_samples_split=15,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1
        )
        rf.fit(X_train, y_train)

        results = {
            "model_type": "RandomForestClassifier",
            "hyperparameters": {
                "n_estimators": 50,
                "max_depth": 7,
                "min_samples_split": 15,
                "class_weight": "balanced",
                "random_state": 42
            },
            "feature_names": feature_names or [],
            "n_features": len(feature_names) if feature_names else X_train.shape[1]
        }

        if X_val is not None and y_val is not None:
            val_probs = rf.predict_proba(X_val)[:, 1]
            results["val_metrics"] = calculate_metrics(y_val.tolist(), val_probs.tolist())

        if X_test is not None and y_test is not None:
            test_probs = rf.predict_proba(X_test)[:, 1]
            results["test_metrics"] = calculate_metrics(y_test.tolist(), test_probs.tolist())

        if save_model:
            model_path = os.path.join(self.artifact_dir, "random_forest_champion.joblib")
            joblib.dump(rf, model_path)
            results["model_artifact_path"] = model_path

            # Also save feature names bundle
            meta_path = os.path.join(self.artifact_dir, "champion_metadata.joblib")
            joblib.dump({
                "feature_names": feature_names,
                "metrics": results.get("test_metrics", {}),
                "hyperparameters": results["hyperparameters"]
            }, meta_path)

        return rf, results

    def load_champion_model(self, model_path: Optional[str] = None) -> RandomForestClassifier:
        """Loads the serialized champion Random Forest model."""
        target_path = model_path or os.path.join(self.artifact_dir, "random_forest_champion.joblib")
        if not os.path.exists(target_path):
            raise FileNotFoundError(f"Champion model artifact not found at: {target_path}")
        return joblib.load(target_path)
