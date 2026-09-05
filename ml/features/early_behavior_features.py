"""
Early Behavioral Feature Extractor Module
Enforces strict temporal leakage prevention by extracting features ONLY from the first 24-48 hours.
Prediction Window W = 48.0 hours post campaign launch.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple

def parse_dt(ts_str: str) -> datetime:
    cleaned = ts_str.rstrip("Z")
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(cleaned, fmt)
        except ValueError:
            continue
    return datetime(2023, 1, 1, 12, 0, 0)

def extract_early_behavior_features(
    records: List[Dict[str, Any]], window_hours: float = 48.0
) -> Tuple[List[List[float]], List[str]]:
    """
    Extracts early behavioral features strictly within the specified prediction window.
    Features:
    - donations_first_24h_count
    - donations_first_24h_amount
    - donations_first_48h_count
    - donations_first_48h_amount
    - early_donation_velocity ($/hour)
    - early_comment_count
    - early_comment_density (comments per donation)
    - early_update_count
    - early_update_frequency (updates per 48h)
    """
    feature_names = [
        "donations_first_24h_count",
        "donations_first_24h_amount",
        "donations_first_48h_count",
        "donations_first_48h_amount",
        "early_donation_velocity",
        "early_comment_count",
        "early_comment_density",
        "early_update_count",
        "early_update_frequency",
    ]

    matrix = []
    for rec in records:
        launch_dt = parse_dt(str(rec.get("launch_time", "")))
        cutoff_24h = launch_dt + timedelta(hours=24)
        cutoff_window = launch_dt + timedelta(hours=window_hours)

        # 1. Process Donations
        donations = rec.get("donations", [])
        d_24_cnt = 0
        d_24_amt = 0.0
        d_48_cnt = 0
        d_48_amt = 0.0

        for d in donations:
            d_time_str = d.get("time", "") if isinstance(d, dict) else ""
            if not d_time_str:
                continue
            d_dt = parse_dt(d_time_str)

            # Strictly enforce temporal boundary
            if d_dt <= cutoff_window:
                amt = float(d.get("amount", 0.0) or 0.0) if isinstance(d, dict) else 0.0
                d_48_cnt += 1
                d_48_amt += amt

                if d_dt <= cutoff_24h:
                    d_24_cnt += 1
                    d_24_amt += amt

        donation_velocity = d_48_amt / window_hours

        # 2. Process Comments
        comments = rec.get("comments", [])
        c_48_cnt = 0
        for c in comments:
            c_time_str = c.get("time", "") if isinstance(c, dict) else ""
            if not c_time_str:
                continue
            c_dt = parse_dt(c_time_str)
            if c_dt <= cutoff_window:
                c_48_cnt += 1

        comment_density = (float(c_48_cnt) / float(max(1, d_48_cnt)))

        # 3. Process Creator Updates
        updates = rec.get("updates", [])
        u_48_cnt = 0
        for u in updates:
            u_time_str = u.get("time", "") if isinstance(u, dict) else ""
            if not u_time_str:
                continue
            u_dt = parse_dt(u_time_str)
            if u_dt <= cutoff_window:
                u_48_cnt += 1

        update_freq = float(u_48_cnt) / window_hours

        row = [
            float(d_24_cnt),
            float(d_24_amt),
            float(d_48_cnt),
            float(d_48_amt),
            float(donation_velocity),
            float(c_48_cnt),
            float(comment_density),
            float(u_48_cnt),
            float(update_freq),
        ]
        matrix.append(row)

    return matrix, feature_names
