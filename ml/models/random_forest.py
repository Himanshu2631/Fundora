"""
Random Forest Baseline Classifier Module
Implements an ensemble of decision trees with feature subsampling and balanced class bootstrapping.
"""

import math
import random
from typing import List, Dict, Any, Optional

class DecisionNode:
    def __init__(self, feature_idx: int = -1, threshold: float = 0.0, left: Any = None, right: Any = None, value: float = 0.5):
        self.feature_idx = feature_idx
        self.threshold = threshold
        self.left = left
        self.right = right
        self.value = value

class DecisionTree:
    def __init__(self, max_depth: int = 6, min_samples_split: int = 10, max_features: Optional[int] = None):
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.max_features = max_features
        self.root = None

    def _gini(self, y: List[int], weights: List[float]) -> float:
        total_w = sum(weights)
        if total_w == 0:
            return 0.0
        w_pos = sum(w for yi, w in zip(y, weights) if yi == 1)
        p1 = w_pos / total_w
        p0 = 1.0 - p1
        return 1.0 - (p1 ** 2 + p0 ** 2)

    def _build_tree(self, X: List[List[float]], y: List[int], weights: List[float], depth: int, rng: random.Random) -> DecisionNode:
        n_samples = len(y)
        w_pos = sum(w for yi, w in zip(y, weights) if yi == 1)
        total_w = sum(weights)
        prob_pos = (w_pos / total_w) if total_w > 0 else 0.5

        if depth >= self.max_depth or n_samples < self.min_samples_split or prob_pos == 0.0 or prob_pos == 1.0:
            return DecisionNode(value=prob_pos)

        n_features = len(X[0])
        feat_subset_size = self.max_features or max(1, int(math.sqrt(n_features)))
        feature_indices = rng.sample(range(n_features), feat_subset_size)

        best_gini = float("inf")
        best_feat = -1
        best_thresh = 0.0
        best_left_idx = []
        best_right_idx = []

        for f_idx in feature_indices:
            vals = [X[i][f_idx] for i in range(n_samples)]
            # Test percentiles/quantiles for split candidates
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

                w_left = sum(weights[i] for i in left_idx)
                w_right = sum(weights[i] for i in right_idx)
                if w_left == 0 or w_right == 0:
                    continue

                y_left = [y[i] for i in left_idx]
                weights_left = [weights[i] for i in left_idx]
                y_right = [y[i] for i in right_idx]
                weights_right = [weights[i] for i in right_idx]

                gini_split = (w_left / total_w) * self._gini(y_left, weights_left) + (w_right / total_w) * self._gini(y_right, weights_right)

                if gini_split < best_gini:
                    best_gini = gini_split
                    best_feat = f_idx
                    best_thresh = thresh
                    best_left_idx = left_idx
                    best_right_idx = right_idx

        if best_feat == -1:
            return DecisionNode(value=prob_pos)

        left_node = self._build_tree(
            [X[i] for i in best_left_idx], [y[i] for i in best_left_idx], [weights[i] for i in best_left_idx], depth + 1, rng
        )
        right_node = self._build_tree(
            [X[i] for i in best_right_idx], [y[i] for i in best_right_idx], [weights[i] for i in best_right_idx], depth + 1, rng
        )
        return DecisionNode(feature_idx=best_feat, threshold=best_thresh, left=left_node, right=right_node, value=prob_pos)

    def fit(self, X: List[List[float]], y: List[int], weights: List[float], rng: random.Random):
        self.root = self._build_tree(X, y, weights, depth=0, rng=rng)

    def predict_row(self, row: List[float], node: Optional[DecisionNode] = None) -> float:
        node = node or self.root
        if node.feature_idx == -1 or node.left is None or node.right is None:
            return node.value
        if row[node.feature_idx] <= node.threshold:
            return self.predict_row(row, node.left)
        return self.predict_row(row, node.right)

class RandomForestModel:
    def __init__(
        self,
        n_estimators: int = 50,
        max_depth: int = 7,
        min_samples_split: int = 15,
        class_weight: Optional[str] = "balanced",
        random_state: int = 42
    ):
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.class_weight = class_weight
        self.random_state = random_state
        self.trees: List[DecisionTree] = []

    def fit(self, X: List[List[float]], y: List[int]):
        n_samples = len(X)
        rng = random.Random(self.random_state)
        self.trees = []

        n_pos = sum(y)
        n_neg = n_samples - n_pos
        w_pos = (n_samples / (2.0 * n_pos)) if (self.class_weight == "balanced" and n_pos > 0) else 1.0
        w_neg = (n_samples / (2.0 * n_neg)) if (self.class_weight == "balanced" and n_neg > 0) else 1.0
        sample_weights = [w_pos if yi == 1 else w_neg for yi in y]

        for _ in range(self.n_estimators):
            # Bootstrap sampling
            boot_idx = [rng.randint(0, n_samples - 1) for _ in range(n_samples)]
            X_boot = [X[i] for i in boot_idx]
            y_boot = [y[i] for i in boot_idx]
            w_boot = [sample_weights[i] for i in boot_idx]

            tree = DecisionTree(max_depth=self.max_depth, min_samples_split=self.min_samples_split)
            tree.fit(X_boot, y_boot, w_boot, rng)
            self.trees.append(tree)

    def predict_proba(self, X: List[List[float]]) -> List[float]:
        probs = []
        for row in X:
            tree_preds = [t.predict_row(row) for t in self.trees]
            avg_p = sum(tree_preds) / len(tree_preds) if self.trees else 0.5
            probs.append(round(avg_p, 6))
        return probs

    def predict(self, X: List[List[float]], threshold: float = 0.5) -> List[int]:
        return [1 if p >= threshold else 0 for p in self.predict_proba(X)]
