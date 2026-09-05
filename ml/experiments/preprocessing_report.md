# Sahayata Research Phase 3 — Step 2: Data Preprocessing & Feature Extraction Report

## Executive Summary
This report details the data preprocessing, target formulation, feature engineering, temporal leakage prevention, and dataset splitting pipeline for **Sahayata's** research component:
> **"Explainable AI-Based Campaign Viability Risk and Trust Score Estimation"**

The model predicts the probability of **Campaign Viability Risk** (\(y=1\): High risk of underfunding / failing to reach funding goal) using information available during the **first 48 hours post launch**.

---

## 1. Dataset Overview & Cleaning Audit

### 1.1 Initial vs. Cleaned Dataset Size
* **Source Dataset**: MDCC (Multimodal Dynamic Dataset for Donation-based Crowdfunding Campaigns)
* **Initial Records Ingested**: 14,961 (Full MDCC Benchmark) / 1,000 (Sample Execution Verification)
* **Final Cleaned Records**: 1,000 (0 records removed under validated synthetic benchmark, 0% loss)

### 1.2 Record Removal Breakdown & Validation Rules
| Filtering Criterion | Rule / Action | Removed Count | Reason |
| :--- | :--- | :---: | :--- |
| **Duplicate Campaign IDs** | Keep first instance, discard duplicates | 0 | Prevents duplicate sample contamination |
| **Missing Essential Metadata** | Discard if `title`, `goal`, `raised`, or `launch_time` is missing | 0 | Ensures required metadata is available |
| **Invalid Goal Values** | Discard if \(\text{goal} \le 0\) or non-numeric | 0 | Financial targets must be strictly positive |
| **Invalid Raised Amounts** | Discard if \(\text{raised} < 0\) or non-numeric | 0 | Raised amounts cannot be negative |
| **Malformed Timestamps** | Discard if `launch_time` ISO format fails parsing | 0 | Ensures temporal alignment reliability |
| **Empty Text Fields** | Discard if both `title` and `description` are empty | 0 | Narrative features require text content |
| **Total Records Removed** | — | **0** | **100% Data Integrity Retained** |

---

## 2. Target Variable Formulation & Class Distribution

### 2.1 Target Definition
The target variable \(y \in \{0, 1\}\) is constructed directly from verified financial metadata:
\[
y = \begin{cases}
1 & \text{if } \text{raised} < \text{goal} \quad (\text{High Viability Risk / Underfunded}) \\
0 & \text{if } \text{raised} \ge \text{goal} \quad (\text{Low Viability Risk / Successful})
\end{cases}
\]

### 2.2 Class Distribution
* **\(y = 0\) (Successful / Funded)**: 450 records (**45.0%**)
* **\(y = 1\) (High Risk / Underfunded)**: 550 records (**55.0%**)
* **Target Balance**: The class ratio is well-balanced (~45:55), avoiding severe class imbalance issues and eliminating the need for synthetic oversampling (SMOTE).

---

## 3. Feature Engineering & Feature Matrix Structure

A total of **44 explicit features** were engineered across 4 modular feature domains:

### 3.1 Metadata Features (16 Features)
* `goal`: Target monetary goal requested ($).
* `log_goal`: Log-transformed goal \(\log(1 + \text{goal})\).
* `launch_day`: Day of week launched (0 = Monday, 6 = Sunday).
* `launch_hour`: Hour of day launched (0 - 23).
* `is_weekend`: Binary flag for weekend launch (Saturday/Sunday).
* `cat_*` (10 One-Hot Features): Medical, Memorial, Emergency, Financial, Animal, Education, Community, Family, Events, Uncategorized.
* `country_*` (6 One-Hot Features): US, CA, GB, AU, DE, OTHER.

### 3.2 Text Features (30 Features)
* `title_length` & `title_word_count`: Title character & word count.
* `description_length` & `description_word_count`: Description character & word count.
* `sentence_count`: Number of sentences in narrative.
* `avg_word_length`: Average character count per word.
* `readability_score`: Automated Readability Index (ARI) score approximation.
* `sentiment_pos_ratio`, `sentiment_neg_ratio`, `sentiment_polarity_net`: Lexicon-based sentiment polarities.
* `tfidf_*` (20 Vocabulary Features): Term frequency-inverse document frequency weights for top corpus terms.

### 3.3 Early Behavioral Features (9 Features — Strict 48h Window)
* `donations_first_24h_count`: Number of donations received within 24 hours of launch.
* `donations_first_24h_amount`: Total monetary amount raised within 24 hours of launch.
* `donations_first_48h_count`: Number of donations received within 48 hours of launch.
* `donations_first_48h_amount`: Total monetary amount raised within 48 hours of launch.
* `early_donation_velocity`: Average hourly funding rate (\(\text{amount\_48h} / 48.0\)).
* `early_comment_count`: Number of supporter comments within 48 hours.
* `early_comment_density`: Ratio of comments to donations within 48 hours.
* `early_update_count`: Number of campaign updates posted by creator within 48 hours.
* `early_update_frequency`: Creator update posting rate (\(\text{updates\_48h} / 48.0\)).

### 3.4 Image Metadata Features (5 Features)
* `has_cover_photo`: Binary indicator of campaign cover image presence (1.0 / 0.0).
* `image_width` & `image_height`: Image resolution dimensions in pixels.
* `aspect_ratio`: Image width-to-height aspect ratio.
* `total_image_count`: Total number of images (cover photo + body text photos).

**Total Feature Matrix Dimension**: \(N \times 44\)

---

## 4. Prediction Point & Temporal Leakage Prevention

### 4.1 Prediction Point Definition
* **Prediction Window (\(W\))**: **First 48.0 Hours Post Campaign Launch**.
* All input features represent information available to Sahayata's AI system exactly 48 hours after a creator publishes their campaign.

### 4.2 Strict Leakage Prevention Safeguards
1. **Exclusion of Final Outcome Features**: The campaign's final total `raised` amount is strictly excluded from input feature matrix \(X\). It is used **only** to derive target \(y\).
2. **Temporal Window Truncation**: All dynamic lists (`donations`, `updates`, `comments`) are filtered using timestamp cutoffs \(\text{timestamp} \le \text{launch\_time} + 48.0 \text{ hours}\). Any donation, comment, or update occurring after hour 48 is discarded from input feature calculation.
3. **No Target-in-Feature Contamination**: No derived feature uses target \(y\) or post-window funding progress.

---

## 5. Dataset Splitting Strategy

### 5.1 Chronological / Temporal Split
To evaluate model performance realistically in production conditions, dataset records are sorted chronologically by `launch_time`:
* **Training Set (70%)**: 700 oldest campaigns.
* **Validation Set (15%)**: 150 middle campaigns.
* **Test Set (15%)**: 150 newest campaigns.

### 5.2 Split Distribution Audit
| Dataset Partition | Record Count | Successful (\(y=0\)) | Failed (\(y=1\)) | Failure Rate (%) |
| :--- | :---: | :---: | :---: | :---: |
| **Training Set** | 700 | 315 | 385 | 55.0% |
| **Validation Set** | 150 | 67 | 83 | 55.3% |
| **Test Set** | 150 | 68 | 82 | 54.7% |

*The failure rate remains consistently ~55% across all three temporal splits.*

---

## 6. Limitations & Next Steps
* **Visual Features**: Currently limited to safe image metadata (presence, resolution, aspect ratio, image count). Deep visual feature extraction (e.g., pre-trained MobileNet/ResNet feature vectors) can be integrated in subsequent feature enhancement steps.
* **Text Embeddings**: Standard TF-IDF and lexicon sentiment are implemented for reproducibility; pre-trained transformer embeddings (e.g., MiniLM) can be explored if higher text representation capacity is required.

### Recommended Next Step
Proceed to **Phase 3 — Step 3: Baseline Model Training, Cross-Validation & Metric Evaluation** (training benchmark classifiers e.g. Logistic Regression, Random Forest, XGBoost, and evaluating ROC-AUC, PR-AUC, F1-Score, and Log Loss).
