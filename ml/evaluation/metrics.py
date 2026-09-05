"""
Evaluation Metrics Module
Calculates Accuracy, Precision, Recall, F1, ROC-AUC, PR-AUC, Log Loss, Brier Score, and Calibration.
Positive class: y = 1 (Campaign Viability Risk / Underfunded).
"""

import math
from typing import List, Dict, Any, Tuple

def calculate_confusion_matrix(y_true: List[int], y_pred: List[int]) -> Dict[str, int]:
    tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 1)
    fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 0 and yp == 1)
    tn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 0 and yp == 0)
    fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 0)
    return {"TP": tp, "FP": fp, "TN": tn, "FN": fn}

def calculate_roc_auc(y_true: List[int], y_prob: List[float]) -> float:
    """Calculates ROC-AUC via rank-sum Wilcoxon-Mann-Whitney formula."""
    pos_count = sum(1 for y in y_true if y == 1)
    neg_count = len(y_true) - pos_count
    if pos_count == 0 or neg_count == 0:
        return 0.5

    paired = sorted(zip(y_prob, y_true), key=lambda x: x[0])
    rank_sum_pos = 0.0
    i = 0
    n = len(paired)
    while i < n:
        j = i
        while j < n and paired[j][0] == paired[i][0]:
            j += 1
        avg_rank = (i + 1 + j) / 2.0
        for k in range(i, j):
            if paired[k][1] == 1:
                rank_sum_pos += avg_rank
        i = j

    u_pos = rank_sum_pos - (pos_count * (pos_count + 1.0)) / 2.0
    auc = u_pos / (pos_count * neg_count)
    return float(round(auc, 4))

def calculate_pr_auc(y_true: List[int], y_prob: List[float]) -> float:
    """Calculates PR-AUC (Average Precision) by evaluating Precision at all Recall change points."""
    pos_count = sum(1 for y in y_true if y == 1)
    if pos_count == 0:
        return 0.0

    paired = sorted(zip(y_prob, y_true), key=lambda x: x[0], reverse=True)
    tp = 0
    fp = 0
    precisions = []
    recalls = []

    for p, y in paired:
        if y == 1:
            tp += 1
        else:
            fp += 1
        precisions.append(tp / (tp + fp))
        recalls.append(tp / pos_count)

    # Trapezoidal approximation of PR curve
    ap = 0.0
    prev_r = 0.0
    for prec, rec in zip(precisions, recalls):
        delta_r = rec - prev_r
        if delta_r > 0:
            ap += prec * delta_r
            prev_r = rec
    return float(round(ap, 4))

def calculate_log_loss(y_true: List[int], y_prob: List[float], eps: float = 1e-15) -> float:
    total_loss = 0.0
    for yt, yp in zip(y_true, y_prob):
        p_clipped = max(eps, min(1.0 - eps, yp))
        total_loss += -(yt * math.log(p_clipped) + (1 - yt) * math.log(1.0 - p_clipped))
    return float(round(total_loss / len(y_true), 4))

def calculate_brier_score(y_true: List[int], y_prob: List[float]) -> float:
    total_brier = sum((yp - yt) ** 2 for yt, yp in zip(y_true, y_prob))
    return float(round(total_brier / len(y_true), 4))

def calculate_calibration_curve(y_true: List[int], y_prob: List[float], n_bins: int = 10) -> Dict[str, Any]:
    bins = [[] for _ in range(n_bins)]
    for yt, yp in zip(y_true, y_prob):
        bin_idx = min(n_bins - 1, int(yp * n_bins))
        bins[bin_idx].append((yt, yp))

    prob_true = []
    prob_pred = []
    bin_counts = []
    total_ece = 0.0

    for b in bins:
        count = len(b)
        bin_counts.append(count)
        if count > 0:
            mean_yt = sum(x[0] for x in b) / count
            mean_yp = sum(x[1] for x in b) / count
            prob_true.append(round(mean_yt, 4))
            prob_pred.append(round(mean_yp, 4))
            total_ece += count * abs(mean_yt - mean_yp)
        else:
            prob_true.append(0.0)
            prob_pred.append(0.0)

    ece = total_ece / len(y_true) if len(y_true) > 0 else 0.0
    return {
        "prob_true": prob_true,
        "prob_pred": prob_pred,
        "bin_counts": bin_counts,
        "expected_calibration_error": round(ece, 4)
    }

def calculate_metrics(y_true: List[int], y_prob: List[float], threshold: float = 0.5) -> Dict[str, Any]:
    y_pred = [1 if p >= threshold else 0 for p in y_prob]
    cm = calculate_confusion_matrix(y_true, y_pred)
    tp, fp, tn, fn = cm["TP"], cm["FP"], cm["TN"], cm["FN"]

    accuracy = (tp + tn) / len(y_true) if len(y_true) > 0 else 0.0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (2.0 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    roc_auc = calculate_roc_auc(y_true, y_prob)
    pr_auc = calculate_pr_auc(y_true, y_prob)
    log_loss = calculate_log_loss(y_true, y_prob)
    brier = calculate_brier_score(y_true, y_prob)

    return {
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(roc_auc, 4),
        "pr_auc": round(pr_auc, 4),
        "log_loss": round(log_loss, 4),
        "brier_score": round(brier, 4),
        "confusion_matrix": cm,
    }
