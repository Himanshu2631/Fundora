"""
Model Calibration & Reliability Evaluation Module
Evaluates probabilistic calibration of campaign viability risk predictions.
Computes reliability curves, Expected Calibration Error (ECE), Brier Score, and Log Loss.
Includes Platt Scaling and Isotonic Regression calibrators fitted on validation data ONLY.
"""

import os
import math
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from typing import List, Dict, Any, Tuple, Optional, Union
from sklearn.calibration import calibration_curve
from sklearn.linear_model import LogisticRegression
from sklearn.isotonic import IsotonicRegression

class ProbabilityCalibrator:
    """
    Implements post-hoc probability calibration methods:
    1. Sigmoid / Platt Scaling: P_calibrated(y=1) = 1 / (1 + exp(A * logit + B))
    2. Isotonic Non-parametric Regression (piecewise constant isotonic regression)
    All calibrators are strictly fitted on VALIDATION data ONLY to prevent test leakage.
    """

    def __init__(self, method: str = "platt"):
        self.method = method.lower()
        self.calibrator = None
        self.is_fitted = False

    def fit(self, y_val_true: Union[List[int], np.ndarray], p_val_raw: Union[List[float], np.ndarray]):
        """Fits calibration model strictly on validation data."""
        y_arr = np.array(y_val_true).astype(int)
        p_arr = np.array(p_val_raw).astype(float)

        if self.method == "platt" or self.method == "sigmoid":
            # Platt scaling via Logistic Regression on log-odds
            eps = 1e-6
            p_clipped = np.clip(p_arr, eps, 1.0 - eps)
            logits = np.log(p_clipped / (1.0 - p_clipped)).reshape(-1, 1)
            self.calibrator = LogisticRegression(C=1.0, solver="lbfgs")
            self.calibrator.fit(logits, y_arr)
            self.is_fitted = True

        elif self.method == "isotonic":
            # Isotonic Regression on raw probabilities
            self.calibrator = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
            self.calibrator.fit(p_arr, y_arr)
            self.is_fitted = True

        else:
            raise ValueError(f"Unsupported calibration method: {self.method}")

    def predict_proba(self, p_raw: Union[List[float], np.ndarray]) -> np.ndarray:
        """Transforms uncalibrated probabilities to calibrated probabilities."""
        p_arr = np.array(p_raw).astype(float)
        if not self.is_fitted or self.calibrator is None:
            return p_arr

        if self.method in ("platt", "sigmoid"):
            eps = 1e-6
            p_clipped = np.clip(p_arr, eps, 1.0 - eps)
            logits = np.log(p_clipped / (1.0 - p_clipped)).reshape(-1, 1)
            cal_p = self.calibrator.predict_proba(logits)[:, 1]
            return np.round(cal_p, 6)

        elif self.method == "isotonic":
            cal_p = self.calibrator.predict(p_arr)
            return np.round(np.clip(cal_p, 0.0, 1.0), 6)

        return p_arr

def evaluate_calibration(
    y_true: Union[List[int], np.ndarray],
    y_prob: Union[List[float], np.ndarray],
    n_bins: int = 10
) -> Dict[str, Any]:
    """
    Computes comprehensive calibration diagnostics:
    - Brier Score
    - Log Loss
    - Expected Calibration Error (ECE)
    - Maximum Calibration Error (MCE)
    - Reliability bin table (mean predicted probability vs empirical success frequency)
    """
    y_arr = np.array(y_true).astype(int)
    p_arr = np.array(y_prob).astype(float)
    n_samples = len(y_arr)

    if n_samples == 0:
        return {}

    # 1. Brier Score & Log Loss
    brier = float(np.mean((p_arr - y_arr) ** 2))
    eps = 1e-15
    p_clipped = np.clip(p_arr, eps, 1.0 - eps)
    log_loss = float(-np.mean(y_arr * np.log(p_clipped) + (1 - y_arr) * np.log(1.0 - p_clipped)))

    # 2. Binning for Reliability Curve
    bins = np.linspace(0.0, 1.0, n_bins + 1)
    bin_indices = np.digitize(p_arr, bins) - 1
    bin_indices = np.clip(bin_indices, 0, n_bins - 1)

    reliability_table = []
    total_ece = 0.0
    max_ce = 0.0

    prob_true_list = []
    prob_pred_list = []

    for i in range(n_bins):
        bin_mask = (bin_indices == i)
        count = int(np.sum(bin_mask))
        bin_low = bins[i]
        bin_high = bins[i + 1]

        if count > 0:
            mean_pred = float(np.mean(p_arr[bin_mask]))
            mean_obs = float(np.mean(y_arr[bin_mask]))
            gap = abs(mean_pred - mean_obs)
            total_ece += count * gap
            if gap > max_ce:
                max_ce = gap
            prob_true_list.append(round(mean_obs, 4))
            prob_pred_list.append(round(mean_pred, 4))
        else:
            mean_pred = (bin_low + bin_high) / 2.0
            mean_obs = 0.0
            gap = 0.0
            prob_true_list.append(0.0)
            prob_pred_list.append(round(mean_pred, 4))

        reliability_table.append({
            "bin_index": i + 1,
            "bin_range": f"[{bin_low:.1f}, {bin_high:.1f})",
            "sample_count": count,
            "sample_percentage": round((count / n_samples) * 100.0, 2),
            "mean_predicted_prob": round(mean_pred, 4),
            "observed_frequency": round(mean_obs, 4),
            "calibration_gap": round(gap, 4)
        })

    ece = float(total_ece / n_samples)

    return {
        "n_samples": int(n_samples),
        "brier_score": round(brier, 4),
        "log_loss": round(log_loss, 4),
        "expected_calibration_error": round(ece, 4),
        "maximum_calibration_error": round(max_ce, 4),
        "prob_true": prob_true_list,
        "prob_pred": prob_pred_list,
        "reliability_table": reliability_table,
        "is_well_calibrated": (ece < 0.08 and brier < 0.16)
    }

def plot_calibration_curves(
    y_test: Union[List[int], np.ndarray],
    p_uncalibrated: Union[List[float], np.ndarray],
    p_platt: Union[List[float], np.ndarray],
    p_isotonic: Union[List[float], np.ndarray],
    output_path: str,
    n_bins: int = 10
):
    """
    Plots and saves comparative reliability curves for:
    - Raw Uncalibrated Random Forest
    - Platt Scaled (Sigmoid)
    - Isotonic Regression
    - Perfect Calibration baseline
    """
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    y_arr = np.array(y_test).astype(int)

    plt.figure(figsize=(9, 7), dpi=300)

    # Perfect calibration reference line
    plt.plot([0, 1], [0, 1], "k--", label="Perfect Calibration (Ideal)", linewidth=1.5)

    # 1. Uncalibrated RF
    prob_true_raw, prob_pred_raw = calibration_curve(y_arr, p_uncalibrated, n_bins=n_bins, strategy="uniform")
    ece_raw = evaluate_calibration(y_arr, p_uncalibrated, n_bins=n_bins)["expected_calibration_error"]
    plt.plot(
        prob_pred_raw, prob_true_raw, "s-",
        color="#2563EB", label=f"Random Forest Champion (ECE={ece_raw:.4f})", linewidth=2
    )

    # 2. Platt Scaled
    prob_true_platt, prob_pred_platt = calibration_curve(y_arr, p_platt, n_bins=n_bins, strategy="uniform")
    ece_platt = evaluate_calibration(y_arr, p_platt, n_bins=n_bins)["expected_calibration_error"]
    plt.plot(
        prob_pred_platt, prob_true_platt, "o-",
        color="#10B981", label=f"Platt Scaling (ECE={ece_platt:.4f})", linewidth=2
    )

    # 3. Isotonic
    prob_true_iso, prob_pred_iso = calibration_curve(y_arr, p_isotonic, n_bins=n_bins, strategy="uniform")
    ece_iso = evaluate_calibration(y_arr, p_isotonic, n_bins=n_bins)["expected_calibration_error"]
    plt.plot(
        prob_pred_iso, prob_true_iso, "^-",
        color="#F59E0B", label=f"Isotonic Regression (ECE={ece_iso:.4f})", linewidth=2
    )

    plt.title("Probability Calibration (Reliability Diagram) on Unseen Test Set", fontsize=13, weight="bold", pad=12)
    plt.xlabel("Mean Predicted Risk Probability P(y = 1)", fontsize=11)
    plt.ylabel("Observed Empirical Failure Frequency", fontsize=11)
    plt.grid(True, linestyle=":", alpha=0.6)
    plt.legend(loc="lower right", fontsize=10, frameon=True)
    plt.xlim([-0.02, 1.02])
    plt.ylim([-0.02, 1.02])
    plt.tight_layout()

    plt.savefig(output_path, dpi=300)
    plt.close()
