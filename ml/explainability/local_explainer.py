"""
Local Explanation & Campaign Viability Score Module
Provides granular, instance-level explanations for individual crowdfunding campaigns
based on exact SHAP values from the champion Random Forest model.

Calculates:
  Risk Probability = P(y = 1)
  Viability Score = (1 - Risk Probability) * 100
  Risk Level:
    0–39   HIGH RISK
    40–69  MEDIUM RISK
    70–100 LOW RISK
"""

import os
import joblib
import numpy as np
from typing import Dict, Any, List, Optional, Union
from .tree_explainer import SHAPTreeExplainer
from .feature_mappings import (
    get_feature_info,
    get_feature_group,
    format_feature_value,
    FEATURE_GROUPS
)

RESEARCH_DISCLAIMER = (
    "Research Notice: This model estimates campaign funding viability risk and early momentum. "
    "The model provides decision support for campaign funding viability and does not determine "
    "whether a campaign is fraudulent or legitimate. A high-risk score indicates funding completion difficulty, "
    "NOT malicious intent."
)

def get_risk_level(viability_score: float) -> str:
    """
    Standardized classification based on Viability Score (0-100):
      0–39:   HIGH RISK (or HIGH)
      40–69:  MEDIUM RISK (or MEDIUM)
      70–100: LOW RISK (or LOW)
    """
    if viability_score <= 39.0:
        return "HIGH RISK"
    elif viability_score <= 69.0:
        return "MEDIUM RISK"
    else:
        return "LOW RISK"

class LocalCampaignExplainer:
    """
    Instance-level explanation engine powered by SHAP TreeExplainer.
    """

    def __init__(self, model: Any, feature_names: List[str]):
        self.model = model
        self.feature_names = feature_names
        self.tree_explainer = SHAPTreeExplainer(model, feature_names)

    def explain_campaign(
        self,
        campaign: Union[List[float], np.ndarray, Dict[str, Any]],
        top_k: int = 5,
        campaign_meta: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generates human-readable, transparent local explanation for a single campaign.
        Accepts:
          - feature_vector (List[float] or np.ndarray of length 56)
          - OR dictionary of feature name -> value
        """
        # Convert dict input to feature vector if necessary
        if isinstance(campaign, dict):
            vector = [float(campaign.get(fname, 0.0)) for fname in self.feature_names]
            meta = campaign_meta or {k: v for k, v in campaign.items() if k not in self.feature_names}
        else:
            vector = [float(v) for v in campaign]
            meta = campaign_meta or {}

        # 1. Compute exact SHAP values
        shap_res = self.tree_explainer.explain_instance(vector)
        shap_values = shap_res["shap_values"]
        base_value = shap_res["base_value"]
        predicted_prob = shap_res["predicted_prob"]

        # 2. Viability Score & Risk Level calculation
        risk_probability = round(predicted_prob, 4)
        viability_score = round(max(0.0, min(100.0, (1.0 - risk_probability) * 100.0)), 1)
        # Also integer rounded score
        viability_score_int = int(round(viability_score))
        risk_level = get_risk_level(viability_score)

        # 3. Categorize Risk-Increasing vs Risk-Reducing factors based on actual SHAP values
        risk_increasing = []
        risk_reducing = []
        group_attributions = {g: 0.0 for g in FEATURE_GROUPS}

        for fname, s_val, f_val in zip(self.feature_names, shap_values, vector):
            info = get_feature_info(fname)
            grp = info.get("group", "Metadata")
            if grp in group_attributions:
                group_attributions[grp] += s_val

            val_str = format_feature_value(fname, f_val, info)
            impact_pct = round(s_val * 100.0, 2)

            factor_item = {
                "feature_name": fname,
                "title": info["title"],
                "short_title": info.get("short_title", fname),
                "group": grp,
                "feature_value": f_val,
                "formatted_value": val_str,
                "shap_value": round(s_val, 6),
                "impact_percentage": impact_pct
            }

            if s_val > 1e-5:
                # Positive SHAP: increases probability of y=1 (viability risk)
                factor_item["explanation"] = (
                    f"{info['high_risk_desc']} ({info.get('short_title', fname)}: {val_str}, "
                    f"+{impact_pct:.1f}% risk)"
                )
                risk_increasing.append(factor_item)
            elif s_val < -1e-5:
                # Negative SHAP: decreases probability of y=1 (supports viability)
                factor_item["explanation"] = (
                    f"{info['low_risk_desc']} ({info.get('short_title', fname)}: {val_str}, "
                    f"{impact_pct:.1f}% risk)"
                )
                risk_reducing.append(factor_item)

        # Sort risk-increasing factors (largest positive SHAP first)
        risk_increasing.sort(key=lambda x: x["shap_value"], reverse=True)
        # Sort risk-reducing / supporting factors (most negative SHAP first)
        risk_reducing.sort(key=lambda x: x["shap_value"])

        top_risk_factors = [r["explanation"] for r in risk_increasing[:top_k]]
        top_supporting_factors = [s["explanation"] for s in risk_reducing[:top_k]]

        return {
            "campaign_id": meta.get("campaign_id", meta.get("id", "CAMPAIGN_SAMPLE")),
            "risk_probability": risk_probability,
            "viability_score": viability_score_int,
            "viability_score_exact": viability_score,
            "risk_level": risk_level,
            "base_rate_risk": base_value,
            "top_risk_factors": top_risk_factors,
            "top_supporting_factors": top_supporting_factors,
            "detailed_risk_factors": risk_increasing[:top_k],
            "detailed_supporting_factors": risk_reducing[:top_k],
            "feature_group_attributions": {
                g: round(val, 4) for g, val in group_attributions.items()
            },
            "research_disclaimer": RESEARCH_DISCLAIMER
        }

# Global module-level singleton instance & helper function
_DEFAULT_LOCAL_EXPLAINER: Optional[LocalCampaignExplainer] = None

def get_default_explainer() -> LocalCampaignExplainer:
    """Lazily loads or initializes the default champion model explainer."""
    global _DEFAULT_LOCAL_EXPLAINER
    if _DEFAULT_LOCAL_EXPLAINER is None:
        art_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../models/artifacts"))
        model_path = os.path.join(art_dir, "random_forest_champion.joblib")
        meta_path = os.path.join(art_dir, "champion_metadata.joblib")
        if os.path.exists(model_path) and os.path.exists(meta_path):
            model = joblib.load(model_path)
            meta = joblib.load(meta_path)
            feature_names = meta.get("feature_names", [])
            _DEFAULT_LOCAL_EXPLAINER = LocalCampaignExplainer(model, feature_names)
        else:
            raise FileNotFoundError("Champion model artifact not yet trained. Run training pipeline first.")
    return _DEFAULT_LOCAL_EXPLAINER

def explain_campaign(campaign: Union[List[float], np.ndarray, Dict[str, Any]], top_k: int = 5) -> Dict[str, Any]:
    """
    Reusable convenience function to explain a campaign using the champion model:
      explain_campaign(campaign) -> {
          "risk_probability": 0.76,
          "viability_score": 24,
          "risk_level": "HIGH RISK",
          "top_risk_factors": [...],
          "top_supporting_factors": [...]
      }
    """
    explainer = get_default_explainer()
    return explainer.explain_campaign(campaign, top_k=top_k)
