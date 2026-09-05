"""
Early Behavioral Feature Extractor Module
Enforces strict temporal leakage prevention by extracting features ONLY from the first 24-48 hours.
In the real MDCC dataset, donation_time, update_time, and comment_time represent seconds elapsed since launch_date.
Prediction Window W = 48.0 hours (172,800 seconds).
"""

from typing import List, Dict, Any, Tuple

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

    cutoff_24_sec = 24.0 * 3600.0   # 86,400s
    cutoff_48_sec = window_hours * 3600.0 # 172,800s

    matrix = []
    for rec in records:
        donation_times = rec.get("donation_time", [])
        donation_amts = rec.get("donation_amount", [])
        update_times = rec.get("update_time", [])
        comment_times = rec.get("comment_time", [])

        # 1. Process Early Donations
        d_24_cnt = 0
        d_24_amt = 0.0
        d_48_cnt = 0
        d_48_amt = 0.0

        for idx, t in enumerate(donation_times):
            try:
                sec = float(t)
                amt = float(donation_amts[idx]) if idx < len(donation_amts) else 0.0
                if sec <= cutoff_48_sec:
                    d_48_cnt += 1
                    d_48_amt += amt
                    if sec <= cutoff_24_sec:
                        d_24_cnt += 1
                        d_24_amt += amt
            except (ValueError, TypeError):
                continue

        donation_velocity = d_48_amt / window_hours

        # 2. Process Early Updates
        u_48_cnt = 0
        for t in update_times:
            try:
                sec = float(t)
                if sec <= cutoff_48_sec:
                    u_48_cnt += 1
            except (ValueError, TypeError):
                continue

        update_freq = float(u_48_cnt) / window_hours

        # 3. Process Early Comments
        c_48_cnt = 0
        for t in comment_times:
            try:
                sec = float(t)
                if sec <= cutoff_48_sec:
                    c_48_cnt += 1
            except (ValueError, TypeError):
                continue

        comment_density = (float(c_48_cnt) / float(max(1, d_48_cnt)))

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
