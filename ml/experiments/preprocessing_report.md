# Sahayata Research Phase 3 — Step 2: Data Preprocessing & Feature Extraction Report

## Executive Summary
This report presents the verified data preprocessing, target formulation, feature engineering, temporal leakage prevention, and dataset splitting results for **Sahayata's** AI research component:
> **"Explainable AI-Based Campaign Viability Risk and Trust Score Estimation"**

The pipeline evaluates real GoFundMe crowdfunding campaigns from the peer-reviewed **MDCC dataset** (CIKM 2023).

---

## PART A: REAL MDCC DATASET EXECUTION RESULTS

### 1. Real Dataset Ingestion & Quality Audit
The real MDCC dataset (`raw_data.csv`, 75.1 MB) was ingested and audited:

| Metric | Real MDCC Count | Percentage |
| :--- | :---: | :---: |
| **Total Raw Campaigns Ingested** | **14,961** | 100.0% |
| **Duplicate Campaign IDs Discarded** | **102** | 0.68% |
| **Missing/Invalid Target Goals** | **0** | 0.0% |
| **Missing/Invalid Raised Amounts** | **0** | 0.0% |
| **Missing/Malformed Launch Dates** | **0** | 0.0% |
| **Empty Text Records** | **0** | 0.0% |
| **Total Clean Usable Records** | **14,859** | **99.32%** |

### 2. Real Ground-Truth Target Distribution
Target is defined strictly from verified financial fields:
\[
y = \begin{cases}
1 & \text{if } \text{raised} < \text{goal} \quad (\text{High Viability Risk / Underfunded}) \\
0 & \text{if } \text{raised} \ge \text{goal} \quad (\text{Low Viability Risk / Successful})
\end{cases}
\]

* **\(y = 0\) (Successful / Funded, \(\text{raised} \ge \text{goal}\))**: **3,291 campaigns (22.15%)**
* **\(y = 1\) (Failed / Viability Risk, \(\text{raised} < \text{goal}\))**: **11,568 campaigns (77.85%)**
* **Class Imbalance Note**: In real-world donation-based crowdfunding, ~78% of campaigns fail to meet their target goal. This realistic distribution matches empirical crowdfunding benchmarks.

### 3. Category & Geographic Distributions
* **Top Categories**:
  * Memorial: 4,589 (30.9%)
  * Medical: 3,580 (24.1%)
  * Animals: 2,875 (19.3%)
  * Emergency: 2,499 (16.8%)
  * Financial Emergency: 1,316 (8.9%)
* **Top Countries**:
  * United States (US): 14,568 (98.0%)
  * Canada (CA): 130 (0.9%)
  * Great Britain (GB): 68 (0.5%)
  * Australia (AU): 46 (0.3%)
  * Ireland (IE) & Germany (DE): 22 (0.2%)

### 4. 48-Hour Early Behavioral Feature Feasibility
In MDCC, dynamic events (`donation_time`, `update_time`, `comment_time`) record the exact **number of seconds elapsed since `launch_date`**.

* **24-Hour Cutoff**: \(t \le 86,400\text{ seconds}\)
* **48-Hour Cutoff**: \(t \le 172,800\text{ seconds}\)

**Empirical Dynamic Coverage**:
* **Campaigns with dynamic donation sequences**: **14,859 / 14,859 (100.0%)**
* **Campaigns with donations in first 24 hours**: **14,131 (95.1%)**
* **Campaigns with donations in first 48 hours**: **14,494 (97.5%)**
* **Total donations captured in early 24 hours**: **475,958 donations ($42,051,441)**
* **Total donations captured in early 48 hours**: **681,869 donations ($60,781,916)**
* **Campaigns with creator updates**: **6,181 (41.6%)** (3,429 updates in early 48h)
* **Campaigns with supporter comments**: **10,606 (71.4%)** (28,655 comments in early 48h)

### 5. Real Engineered Feature Groups (56 Usable Features)
1. **Metadata Features (16 features)**:
   * `goal` ($)
   * `log_goal` (\(\log(1 + \text{goal})\))
   * `launch_day` (0 = Monday, 6 = Sunday)
   * `launch_hour` (0 - 23)
   * `is_weekend` (1/0)
   * Category One-Hot (6 features): `cat_memorial`, `cat_medical`, `cat_animals`, `cat_emergency`, `cat_financial_emergency`, `cat_other`
   * Country One-Hot (5 features): `country_us`, `country_ca`, `country_gb`, `country_au`, `country_other`
2. **Text Narrative Features (28 features)**:
   * `description_length` & `description_word_count`
   * `sentence_count`
   * `avg_word_length`
   * `readability_score` (ARI metric)
   * `sentiment_pos_ratio`, `sentiment_neg_ratio`, `sentiment_polarity_net`
   * Top 20 TF-IDF narrative terms (`tfidf_*`)
3. **Early Behavioral Features (9 features — Strict 48h Window)**:
   * `donations_first_24h_count`
   * `donations_first_24h_amount` ($)
   * `donations_first_48h_count`
   * `donations_first_48h_amount` ($)
   * `early_donation_velocity` ($/hour)
   * `early_comment_count`
   * `early_comment_density`
   * `early_update_count`
   * `early_update_frequency`
4. **Image Metadata Features (3 features)**:
   * `has_cover_photo` (1.0 for 14,854 campaigns)
   * `num_body_photos` (6,023 total body photos in dataset)
   * `total_photo_count`

**Total Feature Matrix Dimension**: \(14,859 \times 56\)

### 6. Chronological (Temporal) Dataset Splitting
To replicate real-world deployment where future campaigns are evaluated using models trained on historical campaigns, the 14,859 clean records were sorted chronologically by `launch_date`:

| Partition | Record Count | Ratio | Date Range | Successful (\(y=0\)) | Failed (\(y=1\)) | Failure Rate |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Training Set** | **10,401** | **70.0%** | 2022-10-15 to 2022-11-08 | 2,290 | 8,111 | **77.98%** |
| **Validation Set** | **2,228** | **15.0%** | 2022-11-08 to 2022-11-14 | 472 | 1,756 | **78.82%** |
| **Test Set** | **2,230** | **15.0%** | 2022-11-14 to 2022-11-20 | 529 | 1,701 | **76.28%** |

*Failure rates remain remarkably stable (~76% - 78%) across all three chronological periods.*

### 7. Temporal Leakage Prevention Audit
* [x] **Final Raised Amount**: Strictly excluded from input feature matrix \(X\). Used exclusively to derive target label \(y\).
* [x] **Post-48h Dynamic Activity**: Filtered out completely. Any donation, update, or comment occurring with `seconds > 172800` is discarded from feature calculations.
* [x] **Temporal Split**: Chronological sorting prevents future data from leaking into training splits.

---

## PART B: SYNTHETIC/SAMPLE BENCHMARK TEST (HISTORICAL REFERENCE)

For development and modular pipeline unit testing, a 1,000-sample generator (`sample_generator.py`) was originally used to verify module interfaces:
* Sample records: 1,000
* Sample target distribution: 45.0% Successful (\(y=0\)), 55.0% Failed (\(y=1\))
* Sample feature dimension: \(1,000 \times 44\)
* Split: 700 Train / 150 Val / 150 Test

*The real MDCC dataset (Part A) supersedes all synthetic tests and constitutes the definitive basis for model training and research evaluation.*

---

## 8. Dataset Readiness
The real MDCC dataset is **fully downloaded, cleaned, audited, feature-engineered, and split**. It is completely ready for model training in Step 3.
