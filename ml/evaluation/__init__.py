"""
Sahayata ML Evaluation Module
Provides metric calculation, curve generation, calibration assessment, and comparison formatting.
"""

from .metrics import (
    calculate_metrics,
    calculate_confusion_matrix,
    calculate_roc_auc,
    calculate_pr_auc,
    calculate_log_loss,
    calculate_brier_score,
    calculate_calibration_curve,
)

__all__ = [
    "calculate_metrics",
    "calculate_confusion_matrix",
    "calculate_roc_auc",
    "calculate_pr_auc",
    "calculate_log_loss",
    "calculate_brier_score",
    "calculate_calibration_curve",
]
