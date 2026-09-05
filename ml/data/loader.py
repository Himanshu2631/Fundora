"""
MDCC Dataset Loader Module
Handles loading, schema verification, and normalization of raw MDCC dataset files.
Dataset: MDCC (Multimodal Dynamic Dataset for Donation-based Crowdfunding Campaigns)
Source: Jiayang-L1/mdcc (Zenodo DOI: 10.5281/zenodo.8287320)
"""

import json
import csv
import os
import pickle
from typing import List, Dict, Any, Optional

# Standard MDCC Schema Definition
MDCC_SCHEMA = {
    "campaign_id": str,          # Unique campaign identifier URL slug
    "title": str,                # Campaign title
    "description": str,          # Narrative campaign description
    "category": str,             # Campaign category (Medical, Memorial, Emergency, etc.)
    "country": str,              # Geographical country/location code
    "goal": float,               # Financial goal requested (USD/local currency)
    "raised": float,             # Total amount raised at dataset snapshot
    "launch_time": str,          # ISO timestamp or datetime string
    "donations": list,           # List of donation dicts: [{"time": str, "amount": float}]
    "updates": list,             # List of update dicts: [{"time": str, "text": str}]
    "comments": list,            # List of comment dicts: [{"time": str, "text": str}]
    "comment_cor_time": list,    # Donation timestamps corresponding to comments
    "cover_photo": str,          # Path/filename for campaign homepage image
    "body_photos": list          # Paths/filenames for body images
}

class MDCCDataLoader:
    """
    Data loader for MDCC raw dataset files (JSON, CSV, or Pickle).
    """

    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = data_dir or os.path.dirname(os.path.abspath(__file__))

    def load_json(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Loads raw_data.json and returns a list of normalized campaign records.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"MDCC dataset JSON file not found at: {file_path}")
        
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if isinstance(data, dict):
            # If JSON is keyed by campaign_id
            records = []
            for cid, obj in data.items():
                if isinstance(obj, dict):
                    obj["campaign_id"] = obj.get("campaign_id", cid)
                    records.append(obj)
            return records
        elif isinstance(data, list):
            return data
        else:
            raise ValueError("Unexpected JSON root format. Expected dict or list.")

    def load_csv(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Loads raw_data.csv and normalizes metadata columns into campaign records.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"MDCC dataset CSV file not found at: {file_path}")

        records = []
        with open(file_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                record = {
                    "campaign_id": row.get("campaign_id", ""),
                    "title": row.get("title", ""),
                    "description": row.get("description", ""),
                    "category": row.get("category", "Uncategorized"),
                    "country": row.get("country", "US"),
                    "goal": float(row.get("goal", 0.0) or 0.0),
                    "raised": float(row.get("raised", 0.0) or 0.0),
                    "launch_time": row.get("launch_time", ""),
                    "donations": json.loads(row.get("donations", "[]")) if row.get("donations") else [],
                    "updates": json.loads(row.get("updates", "[]")) if row.get("updates") else [],
                    "comments": json.loads(row.get("comments", "[]")) if row.get("comments") else [],
                    "comment_cor_time": json.loads(row.get("comment_cor_time", "[]")) if row.get("comment_cor_time") else [],
                    "cover_photo": row.get("cover_photo", ""),
                    "body_photos": json.loads(row.get("body_photos", "[]")) if row.get("body_photos") else [],
                }
                records.append(record)
        return records

    def load_pickle(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Loads raw_data.pickle or experimental_data.pickle.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"MDCC pickle file not found at: {file_path}")
        
        with open(file_path, "rb") as f:
            data = pickle.load(f)
        
        if isinstance(data, list):
            return data
        elif hasattr(data, "to_dict"):
            return data.to_dict(orient="records")
        elif isinstance(data, dict):
            return list(data.values())
        else:
            raise ValueError(f"Unsupported pickle content type: {type(data)}")

    def load_dataset(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Auto-detects file extension and loads dataset.
        """
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".json":
            return self.load_json(file_path)
        elif ext == ".csv":
            return self.load_csv(file_path)
        elif ext in [".pickle", ".pkl"]:
            return self.load_pickle(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")
