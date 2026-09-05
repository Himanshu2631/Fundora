"""
Metadata Feature Extractor
Extracts goal, log(goal), category, country, launch day, and launch hour features.
"""

import math
from datetime import datetime
from typing import List, Dict, Any, Tuple

CATEGORIES = ["Medical", "Memorial", "Emergency", "Financial", "Animal", "Education", "Community", "Family", "Events", "Uncategorized"]
COUNTRIES = ["US", "CA", "GB", "AU", "DE", "OTHER"]

def parse_dt(ts_str: str) -> datetime:
    cleaned = ts_str.rstrip("Z")
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(cleaned, fmt)
        except ValueError:
            continue
    return datetime(2023, 1, 1, 12, 0, 0)

def extract_metadata_features(records: List[Dict[str, Any]]) -> Tuple[List[List[float]], List[str]]:
    """
    Extracts metadata features from cleaned MDCC campaign records.
    Returns feature matrix (rows=records, cols=features) and feature names list.
    """
    feature_names = [
        "goal",
        "log_goal",
        "launch_day",
        "launch_hour",
        "is_weekend",
    ]
    # Add One-Hot Category Names
    for cat in CATEGORIES:
        feature_names.append(f"cat_{cat.lower()}")
    # Add One-Hot Country Names
    for cty in COUNTRIES:
        feature_names.append(f"country_{cty.lower()}")

    matrix = []
    for rec in records:
        goal = float(rec.get("goal", 1000.0))
        log_goal = math.log(1.0 + goal)

        dt = parse_dt(str(rec.get("launch_time", "")))
        launch_day = float(dt.weekday()) # 0=Monday, 6=Sunday
        launch_hour = float(dt.hour)
        is_weekend = 1.0 if launch_day in [5, 6] else 0.0

        row = [goal, log_goal, launch_day, launch_hour, is_weekend]

        # Category One-Hot Encoding
        rec_cat = str(rec.get("category", "Uncategorized"))
        for cat in CATEGORIES:
            row.append(1.0 if rec_cat.lower() == cat.lower() else 0.0)

        # Country One-Hot Encoding
        rec_country = str(rec.get("country", "US"))
        for cty in COUNTRIES:
            row.append(1.0 if rec_country.upper() == cty.upper() else 0.0)

        matrix.append(row)

    return matrix, feature_names
