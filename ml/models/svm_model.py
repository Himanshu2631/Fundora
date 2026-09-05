"""
Support Vector Machine (SVM) Baseline Classifier Module
Implements soft-margin linear SVM with subgradient descent, balanced class weights, and Platt scaling for probabilities.
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

class SVMModel:
    def __init__(
        self,
        learning_rate: float = 0.01,
        n_epochs: int = 100,
        c_param: float = 1.0,
        class_weight: Optional[str] = "balanced",
        random_state: int = 42
    ):
        self.lr = learning_rate
        self.n_epochs = n_epochs
        self.C = c_param
        self.class_weight = class_weight
        self.random_state = random_state
        self.weights = []
        self.bias = 0.0
        self.platt_a = 1.0
        self.platt_b = 0.0
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
                self.means[j] = m
                self.stds[j] = math.sqrt(variance) if variance > 1e-8 else 1.0

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
        rng = random.Random(self.random_state)

        # Convert y to {-1, +1}
        y_svm = [1.0 if yi == 1 else -1.0 for yi in y]

        n_pos = sum(1 for yi in y if yi == 1)
        n_neg = n_samples - n_pos
        w_pos = (n_samples / (2.0 * n_pos)) if (self.class_weight == "balanced" and n_pos > 0) else 1.0
        w_neg = (n_samples / (2.0 * n_neg)) if (self.class_weight == "balanced" and n_neg > 0) else 1.0

        self.weights = [0.0] * n_features
        self.bias = 0.0

        for epoch in range(1, self.n_epochs + 1):
            eta = self.lr / math.sqrt(epoch)
            indices = list(range(n_samples))
            rng.shuffle(indices)

            for i in indices:
                xi = X_norm[i]
                yi = y_svm[i]
                sample_w = w_pos if yi == 1.0 else w_neg
                margin = yi * (self.bias + sum(w * x for w, x in zip(self.weights, xi)))

                if margin < 1.0:
                    # Subgradient step on hinge loss
                    for j in range(n_features):
                        self.weights[j] = (1.0 - eta) * self.weights[j] + eta * self.C * sample_w * yi * xi[j]
                    self.bias += eta * self.C * sample_w * yi
                else:
                    for j in range(n_features):
                        self.weights[j] = (1.0 - eta) * self.weights[j]

        # Fit Platt Scaling parameters for calibrated probabilities
        margins = []
        for xi in X_norm:
            margins.append(self.bias + sum(w * x for w, x in zip(self.weights, xi)))

        # Simple logistic regression on decision margin
        self.platt_a = 1.0
        self.platt_b = 0.0
        for _ in range(50):
            grad_a = 0.0
            grad_b = 0.0
            for m, yi in zip(margins, y):
                p = sigmoid(self.platt_a * m + self.platt_b)
                err = p - yi
                grad_a += err * m
                grad_b += err
            self.platt_a -= 0.01 * (grad_a / n_samples)
            self.platt_b -= 0.01 * (grad_b / n_samples)

    def decision_function(self, X: List[List[float]]) -> List[float]:
        X_norm = self._standardize(X, fit=False)
        return [self.bias + sum(w * x for w, x in zip(self.weights, xi)) for xi in X_norm]

    def predict_proba(self, X: List[List[float]]) -> List[float]:
        margins = self.decision_function(X)
        probs = []
        for m in margins:
            z = self.platt_a * m + self.platt_b
            probs.append(round(sigmoid(z), 6))
        return probs

    def predict(self, X: List[List[float]], threshold: float = 0.5) -> List[int]:
        return [1 if p >= threshold else 0 for p in self.predict_proba(X)]
