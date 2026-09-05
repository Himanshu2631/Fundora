"""
Image Feature Extractor Module
Extracts basic safe image metadata features (presence, dimensions, aspect ratio, image count).
"""

from typing import List, Dict, Any, Tuple

def extract_image_features(records: List[Dict[str, Any]]) -> Tuple[List[List[float]], List[str]]:
    """
    Extracts image metadata features from campaign records.
    Features:
    - has_cover_photo (1.0 or 0.0)
    - image_width
    - image_height
    - aspect_ratio
    - total_image_count
    """
    feature_names = [
        "has_cover_photo",
        "image_width",
        "image_height",
        "aspect_ratio",
        "total_image_count",
    ]

    matrix = []
    for rec in records:
        cover_photo = str(rec.get("cover_photo", "")).strip()
        has_cover = 1.0 if len(cover_photo) > 0 else 0.0

        width = float(rec.get("image_width", 1200.0 if has_cover else 0.0))
        height = float(rec.get("image_height", 800.0 if has_cover else 0.0))
        aspect_ratio = (width / height) if height > 0 else 0.0

        body_photos = rec.get("body_photos", [])
        body_cnt = len(body_photos) if isinstance(body_photos, list) else 0
        total_cnt = (1.0 if has_cover else 0.0) + float(body_cnt)

        row = [has_cover, width, height, aspect_ratio, total_cnt]
        matrix.append(row)

    return matrix, feature_names
