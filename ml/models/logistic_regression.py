"""
Logistic Regression Baseline Classifier Module
Includes L2 regularization, feature standardization, and balanced class weighting.
"""

import math
from typing import List, Dict, Any, Optional

def sigmoid(z: float) -> float:
    if z < -40.0:
        return 0.0
    elif z > 40.0:
        return 1.0
    return 1.0 / (1.0 + math.exp(-z))

class LogisticRegressionModel:
    def __init__(
        self,
        learning_rate: float = 0.05,
        n_epochs: int = 150,
        l2_reg: float = 0.01,
        class_weight: Optional[str] = "balanced",
        random_state: int = 42
    ):
        self.lr = learning_rate
        self.n_epochs = n_epochs
        self.l2_reg = l2_reg
        self.class_weight = class_weight
        self.random_state = random_state
        self.weights = []
        self.bias = 0.0
        self.means = []
        self.stds = []

    def _standardize(self, X: List[List[float]], fit: bool = False) -> List[List[float]]:
        n_samples = len(X)
        n_features = len(X[0])

        if fit:
            self.means = [0.0] * n_features
            self.stds = [1.0] * n_features
            for j in range(n_features):
                vals = [X[i][j] for i in range(n_samples)]
                m = sum(vals) / n_samples
                variance = sum((v - m) ** 2 for v in vals) / n_samples
                s = math.sqrt(variance) if variance > 1e-8 else 1.0
                self.means[j] = m
                self.stds[j] = s

        X_norm = []
        for i in range(n_samples):
            row = []
            for j in range(n_features):
                row.append((X[i][j] - self.means[j]) / self.stds[j])
            X_norm.append(row)
        return X_norm

    def fit(self, X: List[List[float]], y: List[int]):
        n_samples = len(X)
        n_features = len(X[0])
        X_norm = self._standardize(X, fit=True)

        self.weights = [0.0] * n_features
        self.bias = 0.0

        # Class weights
        n_pos = sum(y)
        n_neg = n_samples - n_pos
        w_pos = (n_samples / (2.0 * n_pos)) if (self.class_weight == "balanced" and n_pos > 0) else 1.0
        w_neg = (n_samples / (2.0 * n_neg)) if (self.class_weight == "balanced" and n_neg > 0) else 1.0

        for epoch in range(self.n_epochs):
            grad_w = [0.0] * n_features
            grad_b = 0.0

            for i in range(n_samples):
                xi = X_norm[i]
                yi = y[i]
                z = self.bias + sum(w * x for w, x in zip(self.weights, xi))
                p = sigmoid(z)
                sample_w = w_pos if yi == 1 else w_neg
                err = (p - yi) * sample_w

                for j in range(n_features):
                    grad_w[j] += err * xi[j]
                grad_b += err

            # Update weights with L2 regularization
            for j in range(n_features):
                grad_w[j] = (grad_w[j] / n_samples) + self.l2_reg * self.weights[j]
                self.weights[j] -= self.lr * grad_w[j]
            self.bias -= self.lr * (grad_b / n_samples)

    def predict_proba(self, X: List[List[float]]) -> List[float]:
        X_norm = self._standardize(X, fit=False)
        probs = []
        for xi in X_norm:
            z = self.bias + sum(w * x for w, x in zip(self.weights, xi))
            probs.append(round(sigmoid(z), 6))
        return probs

    def predict(self, X: List[List[float]], threshold: float = 0.5) -> List[int]:
        probs = self.predict_proba(X)
        return [1 if p >= threshold else 0 for p in probs]
