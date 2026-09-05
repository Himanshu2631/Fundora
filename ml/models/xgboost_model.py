"""
XGBoost / Gradient Boosting Baseline Classifier Module
Implements gradient boosted decision trees with log-loss objective and scale_pos_weight support.
"""

import math
import random
from typing import List, Dict, Any, Optional

def sigmoid(z: float) -> float:
    if z < -40.0:
        return 0.0
    elif z > 40.0:
        return 1.0
    return 1.0 / (1.0 + math.exp(-z))

class RegressionTree:
    def __init__(self, max_depth: int = 4, min_samples_split: int = 15):
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.root = None

    def _build_tree(self, X: List[List[float]], residuals: List[float], depth: int, rng: random.Random) -> Any:
        n_samples = len(residuals)
        mean_res = sum(residuals) / n_samples if n_samples > 0 else 0.0

        if depth >= self.max_depth or n_samples < self.min_samples_split:
            return {"leaf": True, "value": mean_res}

        n_features = len(X[0])
        best_variance_reduction = -1.0
        best_feat = -1
        best_thresh = 0.0
        best_left_idx = []
        best_right_idx = []

        total_variance = sum((r - mean_res) ** 2 for r in residuals)

        feature_indices = rng.sample(range(n_features), max(1, int(math.sqrt(n_features) * 1.5)))

        for f_idx in feature_indices:
            vals = [X[i][f_idx] for i in range(n_samples)]
            sorted_vals = sorted(set(vals))
            if len(sorted_vals) <= 1:
                continue
            step = max(1, len(sorted_vals) // 8)
            thresholds = [sorted_vals[k] for k in range(0, len(sorted_vals), step)]

            for thresh in thresholds:
                left_idx = [i for i in range(n_samples) if X[i][f_idx] <= thresh]
                right_idx = [i for i in range(n_samples) if X[i][f_idx] > thresh]

                if not left_idx or not right_idx:
                    continue

                res_left = [residuals[i] for i in left_idx]
                res_right = [residuals[i] for i in right_idx]

                m_l = sum(res_left) / len(res_left)
                m_r = sum(res_right) / len(res_right)

                var_left = sum((r - m_l) ** 2 for r in res_left)
                var_right = sum((r - m_r) ** 2 for r in res_right)

                var_reduction = total_variance - (var_left + var_right)
                if var_reduction > best_variance_reduction:
                    best_variance_reduction = var_reduction
                    best_feat = f_idx
                    best_thresh = thresh
                    best_left_idx = left_idx
                    best_right_idx = right_idx

        if best_feat == -1:
            return {"leaf": True, "value": mean_res}

        left_node = self._build_tree([X[i] for i in best_left_idx], [residuals[i] for i in best_left_idx], depth + 1, rng)
        right_node = self._build_tree([X[i] for i in best_right_idx], [residuals[i] for i in best_right_idx], depth + 1, rng)
        return {"leaf": False, "feature_idx": best_feat, "threshold": best_thresh, "left": left_node, "right": right_node}

    def fit(self, X: List[List[float]], residuals: List[float], rng: random.Random):
        self.root = self._build_tree(X, residuals, depth=0, rng=rng)

    def predict_row(self, row: List[float], node: Optional[Dict[str, Any]] = None) -> float:
        node = node or self.root
        if node["leaf"]:
            return node["value"]
        if row[node["feature_idx"]] <= node["threshold"]:
            return self.predict_row(row, node["left"])
        return self.predict_row(row, node["right"])

class XGBoostModel:
    def __init__(
        self,
        n_estimators: int = 40,
        learning_rate: float = 0.1,
        max_depth: int = 4,
        scale_pos_weight: Optional[float] = None,
        random_state: int = 42
    ):
        self.n_estimators = n_estimators
        self.learning_rate = learning_rate
        self.max_depth = max_depth
        self.scale_pos_weight = scale_pos_weight
        self.random_state = random_state
        self.base_score = 0.0
        self.trees: List[RegressionTree] = []

    def fit(self, X: List[List[float]], y: List[int]):
        n_samples = len(y)
        rng = random.Random(self.random_state)
        n_pos = sum(y)
        n_neg = n_samples - n_pos

        pos_weight = self.scale_pos_weight if self.scale_pos_weight is not None else (n_neg / n_pos if n_pos > 0 else 1.0)
        p_init = (n_pos * pos_weight) / (n_neg + n_pos * pos_weight)
        self.base_score = math.log(max(1e-5, p_init) / max(1e-5, 1.0 - p_init))

        raw_predictions = [self.base_score] * n_samples
        self.trees = []

        for _ in range(self.n_estimators):
            probabilities = [sigmoid(f) for f in raw_predictions]
            # Negative gradient of weighted binary cross entropy
            residuals = []
            for i in range(n_samples):
                yi = y[i]
                pi = probabilities[i]
                w = pos_weight if yi == 1 else 1.0
                residuals.append(w * (yi - pi))

            tree = RegressionTree(max_depth=self.max_depth)
            tree.fit(X, residuals, rng)
            self.trees.append(tree)

            for i in range(n_samples):
                raw_predictions[i] += self.learning_rate * tree.predict_row(X[i])

    def predict_proba(self, X: List[List[float]]) -> List[float]:
        probs = []
        for row in X:
            f = self.base_score
            for t in self.trees:
                f += self.learning_rate * t.predict_row(row)
            probs.append(round(sigmoid(f), 6))
        return probs

    def predict(self, X: List[List[float]], threshold: float = 0.5) -> List[int]:
        return [1 if p >= threshold else 0 for p in self.predict_proba(X)]
