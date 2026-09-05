"""
MDCC Dataset Loader Module
Handles loading, schema verification, and normalization of raw MDCC dataset files.
Dataset: MDCC (Multimodal Dynamic Dataset for Donation-based Crowdfunding Campaigns)
Source: Jiayang-L1/mdcc (Zenodo DOI: 10.5281/zenodo.8287320)
"""

import json
import csv
import os
import ast
from typing import List, Dict, Any, Optional

# Verified Real MDCC Schema (18 Columns)
MDCC_SCHEMA = {
    "campaign_id": str,
    "category": str,
    "goal": float,
    "launch_date": str,
    "country": str,
    "city": str,
    "raw_description": str,
    "clean_description": str,
    "cover_photo": str,
    "num_photo_main_body": int,
    "raised": float,
    "donation_time": list,        # List of integer seconds elapsed since launch_date
    "donation_amount": list,      # List of float donation amounts
    "comment_time": list,        # List of integer seconds elapsed since launch_date
    "comment_cor_time": list,
    "comment_text": list,
    "update_time": list,         # List of integer seconds elapsed since launch_date
    "update_text": list
}

def parse_list_field(val: Any) -> list:
    """Safely parses stringified Python list literals or JSON arrays."""
    if not val:
        return []
    if isinstance(val, list):
        return val
    s = str(val).strip()
    if s == "[]" or s == "":
        return []
    try:
        return json.loads(s.replace("'", '"'))
    except Exception:
        try:
            return ast.literal_eval(s)
        except Exception:
            return []

class MDCCDataLoader:
    """
    Data loader for MDCC raw dataset files (CSV, JSON, or Pickle).
    """

    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = data_dir or os.path.dirname(os.path.abspath(__file__))

    def load_csv(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Loads raw_data.csv and normalizes metadata columns into campaign records.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"MDCC dataset CSV file not found at: {file_path}")

        records = []
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            for row in reader:
                desc = row.get("clean_description") or row.get("raw_description") or ""
                record = {
                    "campaign_id": row.get("campaign_id", "").strip(),
                    "category": row.get("category", "Uncategorized").strip(),
                    "goal": float(row.get("goal", 0.0) or 0.0),
                    "launch_date": row.get("launch_date", "").strip(),
                    "country": row.get("country", "US").strip(),
                    "city": row.get("city", "").strip(),
                    "description": desc.strip(),
                    "cover_photo": row.get("cover_photo", "").strip(),
                    "num_photo_main_body": int(float(row.get("num_photo_main_body", 0) or 0)),
                    "raised": float(row.get("raised", 0.0) or 0.0),
                    "donation_time": parse_list_field(row.get("donation_time")),
                    "donation_amount": parse_list_field(row.get("donation_amount")),
                    "comment_time": parse_list_field(row.get("comment_time")),
                    "comment_cor_time": parse_list_field(row.get("comment_cor_time")),
                    "comment_text": parse_list_field(row.get("comment_text")),
                    "update_time": parse_list_field(row.get("update_time")),
                    "update_text": parse_list_field(row.get("update_text")),
                }
                records.append(record)
        return records

    def load_json(self, file_path: str) -> List[Dict[str, Any]]:
        """Loads raw_data.json and returns normalized records."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"MDCC dataset JSON file not found at: {file_path}")
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            data = json.load(f)
        if isinstance(data, list):
            return data
        elif isinstance(data, dict):
            return list(data.values())
        raise ValueError("Invalid JSON dataset format.")

    def load_dataset(self, file_path: str) -> List[Dict[str, Any]]:
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".csv":
            return self.load_csv(file_path)
        elif ext == ".json":
            return self.load_json(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")
