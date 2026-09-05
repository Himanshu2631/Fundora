"""
Image Feature Extractor Module
Extracts image features from real MDCC records (cover photo presence, num body photos, total photos).
"""

from typing import List, Dict, Any, Tuple

def extract_image_features(records: List[Dict[str, Any]]) -> Tuple[List[List[float]], List[str]]:
    feature_names = [
        "has_cover_photo",
        "num_body_photos",
        "total_photo_count",
    ]

    matrix = []
    for rec in records:
        cover_val = str(rec.get("cover_photo", "")).strip().lower()
        has_cover = 1.0 if (cover_val == "true" or cover_val == "1" or ".jpg" in cover_val) else 0.0

        num_body = float(rec.get("num_photo_main_body", 0) or 0)
        total_photos = has_cover + num_body

        row = [has_cover, num_body, total_photos]
        matrix.append(row)

    return matrix, feature_names
