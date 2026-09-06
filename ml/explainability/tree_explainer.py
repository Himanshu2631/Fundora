"""
SHAP TreeExplainer Module for Random Forest Classifier
Computes exact Shapley Additive Explanations (Tree SHAP) for the champion baseline model
using the official shap library (shap.TreeExplainer).
"""

import os
import math
import csv
import json
import shap
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from typing import List, Dict, Any, Tuple, Optional, Union
from .feature_mappings import (
    get_feature_group,
    get_feature_info,
    get_human_readable_name,
    FEATURE_GROUPS
)

class SHAPTreeExplainer:
    """
    Wraps shap.TreeExplainer to provide global and instance-level SHAP attributions,
    feature-group aggregations, and publication-quality diagnostic plots.
    """

    def __init__(self, model: Any, feature_names: List[str]):
        self.model = model
        self.feature_names = feature_names
        self.n_features = len(feature_names)
        # Initialize official SHAP TreeExplainer
        self.explainer = shap.TreeExplainer(model)
        self._extract_base_value()

    def _extract_base_value(self):
        """Extracts expected base value E[f(x)] for positive class (y=1)."""
        ev = self.explainer.expected_value
        if isinstance(ev, (list, np.ndarray)):
            # Binary classification: index 1 is y=1 (viability risk)
            self.base_value = float(ev[1]) if len(ev) > 1 else float(ev[0])
        else:
            self.base_value = float(ev)

    def explain_instance(self, feature_vector: Union[List[float], np.ndarray]) -> Dict[str, Any]:
        """
        Computes exact SHAP attributions for a single campaign feature vector.
        Target: y = 1 (Campaign Viability Risk / Underfunded).
        """
        x_arr = np.array(feature_vector).reshape(1, -1)
        # Compute shap values
        sv = self.explainer(x_arr)
        
        # Handle binary classification output shape
        if len(sv.shape) == 3 and sv.shape[2] == 2:
            # Shape (1, n_features, 2)
            shap_vals = sv.values[0, :, 1]
            base_val = float(sv.base_values[0, 1]) if hasattr(sv, "base_values") else self.base_value
        elif len(sv.shape) == 2:
            # Shape (1, n_features)
            shap_vals = sv.values[0, :]
            base_val = float(sv.base_values[0]) if hasattr(sv, "base_values") else self.base_value
        else:
            shap_vals = sv.values[0]
            base_val = self.base_value

        # Predict probability
        if hasattr(self.model, "predict_proba"):
            probs = self.model.predict_proba(x_arr)[0]
            risk_prob = float(probs[1]) if len(probs) > 1 else float(probs[0])
        else:
            risk_prob = float(base_val + np.sum(shap_vals))

        sum_shap = float(np.sum(shap_vals))
        efficiency_gap = abs(risk_prob - (base_val + sum_shap))

        return {
            "shap_values": [float(v) for v in shap_vals],
            "base_value": round(base_val, 6),
            "predicted_prob": round(risk_prob, 6),
            "sum_shap": round(sum_shap, 6),
            "efficiency_gap": round(efficiency_gap, 8),
            "feature_names": self.feature_names
        }

    def explain_dataset(self, X: Union[List[List[float]], np.ndarray]) -> Tuple[np.ndarray, float]:
        """
        Computes SHAP values matrix for a dataset.
        Returns (shap_matrix for class 1 with shape (N, n_features), base_value).
        """
        x_arr = np.array(X)
        sv = self.explainer(x_arr)

        if len(sv.shape) == 3 and sv.shape[2] == 2:
            shap_matrix = sv.values[:, :, 1]
            base_val = float(np.mean(sv.base_values[:, 1])) if hasattr(sv, "base_values") else self.base_value
        elif len(sv.shape) == 2:
            shap_matrix = sv.values
            base_val = float(np.mean(sv.base_values)) if hasattr(sv, "base_values") else self.base_value
        else:
            shap_matrix = sv.values
            base_val = self.base_value

        return shap_matrix, base_val

    def compute_global_importance(
        self,
        X: Union[List[List[float]], np.ndarray],
        shap_matrix: Optional[np.ndarray] = None
    ) -> Dict[str, Any]:
        """
        Computes comprehensive global SHAP analysis:
        - Mean absolute SHAP per feature: (1/N) * sum(|phi_i|)
        - Feature ranking by importance
        - Correlation of feature value with SHAP attribution (direction)
        - Aggregate feature group contribution (sum of mean |SHAP| per group and relative percentages)
        """
        x_arr = np.array(X)
        if shap_matrix is None:
            shap_matrix, _ = self.explain_dataset(x_arr)

        n_samples, n_feats = shap_matrix.shape
        mean_abs_shap = np.mean(np.abs(shap_matrix), axis=0)
        mean_signed_shap = np.mean(shap_matrix, axis=0)
        total_importance = float(np.sum(mean_abs_shap)) or 1e-12

        rankings = []
        for j in range(n_feats):
            fname = self.feature_names[j] if j < len(self.feature_names) else f"feature_{j}"
            info = get_feature_info(fname)
            rel_pct = (float(mean_abs_shap[j]) / total_importance) * 100.0

            # Pearson correlation between feature values and SHAP values
            feat_col = x_arr[:, j]
            shap_col = shap_matrix[:, j]
            std_feat = np.std(feat_col)
            std_shap = np.std(shap_col)
            if std_feat > 1e-12 and std_shap > 1e-12:
                corr = float(np.corrcoef(feat_col, shap_col)[0, 1])
            else:
                corr = 0.0

            if corr > 0.05:
                direction = "Higher values INCREASE risk"
            elif corr < -0.05:
                direction = "Higher values DECREASE risk"
            else:
                direction = "Non-linear / Context-dependent"

            pos_pct = float(np.mean(shap_col > 1e-5) * 100.0)
            neg_pct = float(np.mean(shap_col < -1e-5) * 100.0)

            rankings.append({
                "rank": 0,  # Will be assigned after sort
                "feature_index": j,
                "feature_name": fname,
                "title": info["title"],
                "short_title": info.get("short_title", fname),
                "group": info["group"],
                "mean_abs_shap": round(float(mean_abs_shap[j]), 6),
                "relative_importance_pct": round(rel_pct, 4),
                "mean_signed_shap": round(float(mean_signed_shap[j]), 6),
                "feature_correlation_with_risk": round(corr, 4),
                "direction": direction,
                "risk_increasing_pct": round(pos_pct, 2),
                "risk_reducing_pct": round(neg_pct, 2)
            })

        # Sort descending by mean absolute SHAP
        rankings.sort(key=lambda item: item["mean_abs_shap"], reverse=True)
        for rank_idx, item in enumerate(rankings, 1):
            item["rank"] = rank_idx

        # Aggregate by Feature Groups
        group_sums = {g: 0.0 for g in FEATURE_GROUPS}
        for item in rankings:
            grp = item["group"]
            if grp in group_sums:
                group_sums[grp] += item["mean_abs_shap"]
            else:
                group_sums["Metadata"] += item["mean_abs_shap"]

        group_pcts = {
            g: round((val / total_importance) * 100.0, 2)
            for g, val in group_sums.items()
        }

        return {
            "base_expected_value": round(self.base_value, 6),
            "total_evaluated_samples": int(n_samples),
            "total_features": int(n_feats),
            "feature_rankings": rankings,
            "top_10_features": rankings[:10],
            "group_importance": {
                "group_absolute_importance": {g: round(v, 6) for g, v in group_sums.items()},
                "group_importance_percentages": group_pcts
            }
        }

    def save_feature_importance_csv(self, global_importance: Dict[str, Any], file_path: str):
        """Saves machine-readable CSV of SHAP feature importance rankings."""
        os.makedirs(os.path.dirname(os.path.abspath(file_path)), exist_ok=True)
        with open(file_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                "Rank", "Feature Name", "Human Readable Description", "Feature Group",
                "Mean |SHAP|", "Relative Importance (%)", "Mean Signed SHAP",
                "Correlation with Risk", "Directional Impact"
            ])
            for r in global_importance["feature_rankings"]:
                writer.writerow([
                    r["rank"],
                    r["feature_name"],
                    r["title"],
                    r["group"],
                    f"{r['mean_abs_shap']:.6f}",
                    f"{r['relative_importance_pct']:.4f}",
                    f"{r['mean_signed_shap']:.6f}",
                    f"{r['feature_correlation_with_risk']:.4f}",
                    r["direction"]
                ])

    def save_plots(
        self,
        X: Union[List[List[float]], np.ndarray],
        shap_matrix: np.ndarray,
        output_dir: str,
        top_k: int = 20
    ):
        """
        Generates and saves:
        1. shap_bar.png (Feature importance bar plot)
        2. shap_summary.png (SHAP beeswarm / distribution plot)
        """
        os.makedirs(output_dir, exist_ok=True)
        x_arr = np.array(X)
        df_x = pd.DataFrame(x_arr, columns=self.feature_names)

        # 1. SHAP Feature Importance Bar Plot
        plt.figure(figsize=(10, 8), dpi=300)
        shap.summary_plot(
            shap_matrix,
            df_x,
            plot_type="bar",
            max_display=top_k,
            show=False
        )
        plt.title(f"Top {top_k} Features by Mean |SHAP| (Campaign Viability Risk)", fontsize=13, pad=12, weight="bold")
        plt.xlabel("Mean |SHAP Value| (Average Impact on Viability Risk)", fontsize=11)
        plt.tight_layout()
        bar_path = os.path.join(output_dir, "shap_bar.png")
        plt.savefig(bar_path, dpi=300)
        plt.close()

        # 2. SHAP Beeswarm Summary Plot
        plt.figure(figsize=(11, 9), dpi=300)
        shap.summary_plot(
            shap_matrix,
            df_x,
            max_display=top_k,
            show=False
        )
        plt.title(f"SHAP Summary (Beeswarm) Plot: Top {top_k} Features", fontsize=13, pad=12, weight="bold")
        plt.tight_layout()
        summary_path = os.path.join(output_dir, "shap_summary.png")
        plt.savefig(summary_path, dpi=300)
        plt.close()

        return {
            "shap_bar_path": bar_path,
            "shap_summary_path": summary_path
        }
