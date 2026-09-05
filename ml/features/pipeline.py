"""
Feature Extraction Pipeline & Dataset Split Module
Assembles feature groups into complete matrix X and target vector y.
Enforces reproducible temporal splitting on real MDCC dataset (Train: 70%, Validation: 15%, Test: 15%).
"""

from datetime import datetime
from typing import List, Dict, Any, Tuple
from .metadata_features import extract_metadata_features
from .text_features import extract_text_features
from .early_behavior_features import extract_early_behavior_features
from .image_features import extract_image_features

def parse_dt(ts_str: str) -> datetime:
    cleaned = ts_str.rstrip("Z").strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%d"):
        try:
            return datetime.strptime(cleaned, fmt)
        except ValueError:
            continue
    return datetime(2022, 11, 1, 12, 0, 0)

class FeatureExtractionPipeline:
    """
    Orchestrates extraction of all feature groups and performs chronological dataset splitting.
    """

    def __init__(self, window_hours: float = 48.0, top_n_tfidf: int = 20):
        self.window_hours = window_hours
        self.top_n_tfidf = top_n_tfidf
        self.feature_names = []

    def fit_transform(self, records: List[Dict[str, Any]]) -> Tuple[List[List[float]], List[int], List[str]]:
        meta_X, meta_names = extract_metadata_features(records)
        text_X, text_names = extract_text_features(records, top_n_tfidf=self.top_n_tfidf)
        early_X, early_names = extract_early_behavior_features(records, window_hours=self.window_hours)
        img_X, img_names = extract_image_features(records)

        self.feature_names = meta_names + text_names + early_names + img_names

        X = []
        y = []

        for idx, rec in enumerate(records):
            combined_row = meta_X[idx] + text_X[idx] + early_X[idx] + img_X[idx]
            X.append(combined_row)
            target_val = int(rec.get("target_viability_risk", 1 if rec.get("raised", 0) < rec.get("goal", 1) else 0))
            y.append(target_val)

        return X, y, self.feature_names

    def temporal_split(
        self, records: List[Dict[str, Any]], X: List[List[float]], y: List[int],
        train_ratio: float = 0.70, val_ratio: float = 0.15, test_ratio: float = 0.15
    ) -> Dict[str, Any]:
        indexed_data = []
        for idx, rec in enumerate(records):
            dt = parse_dt(str(rec.get("launch_date", rec.get("launch_time", ""))))
            indexed_data.append((dt, idx))

        indexed_data.sort(key=lambda item: item[0])

        total_n = len(indexed_data)
        n_train = int(total_n * train_ratio)
        n_val = int(total_n * val_ratio)
        n_test = total_n - (n_train + n_val)

        train_indices = [item[1] for item in indexed_data[:n_train]]
        val_indices = [item[1] for item in indexed_data[n_train:n_train + n_val]]
        test_indices = [item[1] for item in indexed_data[n_train + n_val:]]

        X_train = [X[i] for i in train_indices]
        y_train = [y[i] for i in train_indices]

        X_val = [X[i] for i in val_indices]
        y_val = [y[i] for i in val_indices]

        X_test = [X[i] for i in test_indices]
        y_test = [y[i] for i in test_indices]

        def dist(y_sub):
            n = len(y_sub)
            n_fail = sum(y_sub)
            n_succ = n - n_fail
            pct_fail = round((n_fail / n) * 100, 2) if n > 0 else 0.0
            pct_succ = round((n_succ / n) * 100, 2) if n > 0 else 0.0
            return {"total": n, "y_0_successful": n_succ, "y_1_failed": n_fail, "success_pct": pct_succ, "failed_pct": pct_fail}

        split_summary = {
            "strategy": "Temporal (Chronological Launch Date)",
            "train": {"X": X_train, "y": y_train, "distribution": dist(y_train)},
            "val": {"X": X_val, "y": y_val, "distribution": dist(y_val)},
            "test": {"X": X_test, "y": y_test, "distribution": dist(y_test)},
        }

        return split_summary
