"""
Sahayata Explainable AI (XAI) & Campaign Viability Score Module
Provides SHAPTreeExplainer, LocalCampaignExplainer, explain_campaign,
ProbabilityCalibrator, and Feature Mappings.
"""

from .feature_mappings import (
    FEATURE_GROUPS,
    FEATURE_METADATA_MAPPING,
    FEATURE_ALIASES,
    get_feature_group,
    get_feature_info,
    get_human_readable_name,
    format_feature_value,
    normalize_feature_name
)
from .tree_explainer import SHAPTreeExplainer
from .local_explainer import (
    LocalCampaignExplainer,
    explain_campaign,
    get_risk_level,
    RESEARCH_DISCLAIMER
)
from .calibration import (
    ProbabilityCalibrator,
    evaluate_calibration,
    plot_calibration_curves
)

# Backwards compatibility aliases
TreeExplainer = SHAPTreeExplainer
LocalExplainer = LocalCampaignExplainer
classify_risk_level = get_risk_level
DISCLAIMER_TEXT = RESEARCH_DISCLAIMER

__all__ = [
    "FEATURE_GROUPS",
    "FEATURE_METADATA_MAPPING",
    "FEATURE_ALIASES",
    "get_feature_group",
    "get_feature_info",
    "get_human_readable_name",
    "format_feature_value",
    "normalize_feature_name",
    "SHAPTreeExplainer",
    "TreeExplainer",
    "LocalCampaignExplainer",
    "LocalExplainer",
    "explain_campaign",
    "get_risk_level",
    "classify_risk_level",
    "RESEARCH_DISCLAIMER",
    "DISCLAIMER_TEXT",
    "ProbabilityCalibrator",
    "evaluate_calibration",
    "plot_calibration_curves",
]
