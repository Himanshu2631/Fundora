"""
Metadata Feature Extractor
Extracts goal, log(goal), category, country, launch day, and launch hour features from real MDCC records.
"""

import math
from datetime import datetime
from typing import List, Dict, Any, Tuple

# Real MDCC Top Categories
CATEGORIES = ["Memorial", "Medical", "Animals", "Emergency", "Financial Emergency", "Other"]
# Real MDCC Top Countries
COUNTRIES = ["US", "CA", "GB", "AU", "OTHER"]

def parse_dt(ts_str: str) -> datetime:
    cleaned = ts_str.rstrip("Z").strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%d"):
        try:
            return datetime.strptime(cleaned, fmt)
        except ValueError:
            continue
    return datetime(2022, 11, 1, 12, 0, 0)

def extract_metadata_features(records: List[Dict[str, Any]]) -> Tuple[List[List[float]], List[str]]:
    feature_names = [
        "goal",
        "log_goal",
        "launch_day",
        "launch_hour",
        "is_weekend",
    ]
    for cat in CATEGORIES:
        feature_names.append(f"cat_{cat.lower().replace(' ', '_')}")
    for cty in COUNTRIES:
        feature_names.append(f"country_{cty.lower()}")

    matrix = []
    for rec in records:
        goal = float(rec.get("goal", 1000.0))
        log_goal = math.log(1.0 + goal)

        dt = parse_dt(str(rec.get("launch_date", rec.get("launch_time", ""))))
        launch_day = float(dt.weekday())
        launch_hour = float(dt.hour)
        is_weekend = 1.0 if launch_day in [5, 6] else 0.0

        row = [goal, log_goal, launch_day, launch_hour, is_weekend]

        rec_cat = str(rec.get("category", "Other")).strip()
        matched_cat = False
        for cat in CATEGORIES[:-1]:
            if rec_cat.lower() == cat.lower():
                row.append(1.0)
                matched_cat = True
            else:
                row.append(0.0)
        row.append(0.0 if matched_cat else 1.0) # 'Other'

        rec_country = str(rec.get("country", "US")).strip()
        matched_cty = False
        for cty in COUNTRIES[:-1]:
            if rec_country.upper() == cty.upper():
                row.append(1.0)
                matched_cty = True
            else:
                row.append(0.0)
        row.append(0.0 if matched_cty else 1.0) # 'OTHER'

        matrix.append(row)

    return matrix, feature_names
