"""
MDCC Data Cleaning and Target Construction Module
Implements explicit data cleaning rules, record removal auditing, and target label creation.
"""

from datetime import datetime
from typing import List, Dict, Any, Tuple

class MDCCDataCleaner:
    """
    Cleans raw MDCC records and constructs the binary campaign viability target label.
    Target: y = 1 if raised < goal (Failed / High Risk), y = 0 if raised >= goal (Successful / Low Risk).
    """

    def __init__(self):
        self.audit_log = {
            "initial_record_count": 0,
            "removed_duplicate_id_count": 0,
            "removed_missing_essential_count": 0,
            "removed_invalid_goal_count": 0,
            "removed_invalid_raised_count": 0,
            "removed_malformed_timestamp_count": 0,
            "removed_empty_text_count": 0,
            "final_record_count": 0,
            "target_distribution": {"y_0_successful": 0, "y_1_failed": 0, "success_rate_pct": 0.0, "failure_rate_pct": 0.0}
        }

    def parse_timestamp(self, ts_str: str) -> bool:
        if not ts_str:
            return False
        cleaned = ts_str.rstrip("Z").strip()
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%d"):
            try:
                datetime.strptime(cleaned, fmt)
                return True
            except ValueError:
                continue
        return False

    def clean_and_build_target(self, raw_records: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        self.audit_log["initial_record_count"] = len(raw_records)
        cleaned_records = []
        seen_cids = set()

        for rec in raw_records:
            cid = str(rec.get("campaign_id", "")).strip()

            # 1. Duplicate ID Check
            if not cid or cid in seen_cids:
                self.audit_log["removed_duplicate_id_count"] += 1
                continue

            # 2. Missing Essential Metadata Check
            desc = str(rec.get("description", "")).strip()
            goal_raw = rec.get("goal")
            raised_raw = rec.get("raised")
            launch_date = str(rec.get("launch_date", rec.get("launch_time", ""))).strip()

            if goal_raw is None or raised_raw is None or not launch_date:
                self.audit_log["removed_missing_essential_count"] += 1
                continue

            # 3. Invalid Goal Check
            try:
                goal = float(goal_raw)
                if goal <= 0.0:
                    self.audit_log["removed_invalid_goal_count"] += 1
                    continue
            except (ValueError, TypeError):
                self.audit_log["removed_invalid_goal_count"] += 1
                continue

            # 4. Invalid Raised Check
            try:
                raised = float(raised_raw)
                if raised < 0.0:
                    self.audit_log["removed_invalid_raised_count"] += 1
                    continue
            except (ValueError, TypeError):
                self.audit_log["removed_invalid_raised_count"] += 1
                continue

            # 5. Malformed Timestamp Check
            if not self.parse_timestamp(launch_date):
                self.audit_log["removed_malformed_timestamp_count"] += 1
                continue

            # 6. Construct Target Label y
            # y = 1 if raised < goal (High Viability Risk / Underfunded)
            # y = 0 if raised >= goal (Low Viability Risk / Funded)
            y_target = 1 if raised < goal else 0

            seen_cids.add(cid)
            cleaned_rec = dict(rec)
            cleaned_rec["campaign_id"] = cid
            cleaned_rec["description"] = desc
            cleaned_rec["goal"] = goal
            cleaned_rec["raised"] = raised
            cleaned_rec["launch_date"] = launch_date
            cleaned_rec["target_viability_risk"] = y_target
            cleaned_records.append(cleaned_rec)

        self.audit_log["final_record_count"] = len(cleaned_records)
        y_0_cnt = sum(1 for r in cleaned_records if r["target_viability_risk"] == 0)
        y_1_cnt = sum(1 for r in cleaned_records if r["target_viability_risk"] == 1)
        
        self.audit_log["target_distribution"]["y_0_successful"] = y_0_cnt
        self.audit_log["target_distribution"]["y_1_failed"] = y_1_cnt
        if len(cleaned_records) > 0:
            self.audit_log["target_distribution"]["success_rate_pct"] = round((y_0_cnt / len(cleaned_records)) * 100, 2)
            self.audit_log["target_distribution"]["failure_rate_pct"] = round((y_1_cnt / len(cleaned_records)) * 100, 2)

        return cleaned_records, self.audit_log
