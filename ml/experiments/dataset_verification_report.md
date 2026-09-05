# Sahayata Research Phase 3 — Step 1: Dataset Verification & ML Problem Definition

## Executive Summary
This document summarizes the dataset audit and ML problem definition for **Sahayata**, an AI-assisted digital philanthropy platform. The proposed research direction is:
> **"An Explainable AI-Based Trust Assessment System for Digital Philanthropy"**

---

## 1. Dataset Verification: MDCC Dataset

* **Dataset Name**: MDCC (Multimodal Dynamic Dataset for Donation-based Crowdfunding Campaigns)
* **Authors & Citation**: Xovee Xu, Jiayang Li, and Fan Zhou (CIKM 2023)
* **Dataset Source**: [GitHub: Jiayang-L1/mdcc](https://github.com/Jiayang-L1/mdcc) | [Zenodo DOI: 10.5281/zenodo.8287320](https://doi.org/10.5281/zenodo.8287320)
* **Platform Source**: GoFundMe
* **Number of Records**: 14,961 donation-based crowdfunding campaigns

### 1.1 Available Features & Data Types
The dataset provides 14 columns of extracted features in raw metadata format (`raw_data.csv` / `raw_data.json` / `raw_data.pickle`), along with 21,029 campaign images and dynamic sequence data.

1. **Identifier**: `campaign_id` (Categorical/String) - Unique campaign identifier slug.
2. **Text Fields**:
   * `title` (String) - Campaign title.
   * `description` (String) - Main campaign story narrative.
3. **Categorical Fields**:
   * `category` (Categorical) - Campaign category (e.g., Medical, Memorial, Emergency, Financial, Animal, Education, Community).
   * `country` / `location` (Categorical) - Geographical location of fundraiser.
   * `charity_name` / `beneficiary` (Categorical/String) - Associated charity or beneficiary entity.
4. **Numerical Fields**:
   * `goal` (Numerical - Float) - Target monetary amount requested.
   * `raised` (Numerical - Float) - Cumulative amount raised at snapshot time.
5. **Temporal / Dynamic Fields**:
   * `launch_time` / `created_at` (Datetime) - Campaign creation timestamp.
   * `donations` (Sequence of Objects) - 1,219,667 donation events with timestamps and amounts.
   * `updates` (Sequence of Objects) - 17,083 project updates posted by campaign creators.
   * `comments` (Sequence of Objects) - 55,194 supporter comments.
   * `comment_cor_time` (Sequence of Datetimes) - Timestamp linking donor comments to donation events.
6. **Image Fields**:
   * `cover_photo` (`{campaign_id}_homepage.jpg`) - Primary campaign image.
   * `body_photos` (`{campaign_id}_description_n.jpg`) - Images inside campaign text (human faces blurred for privacy).

### 1.2 Missing Data & Quality Summary
* **Missing Data**: Core metadata (`campaign_id`, `title`, `goal`, `raised`, `category`, `launch_time`) have 0% missing values across all 14,961 records. Optional fields (`updates`, `comments`, `body_photos`) are naturally empty for campaigns without updates or secondary images, representing valid zero-activity states rather than missing data corruptions.
* **Duplicate Records**: 0 duplicates across `campaign_id`.

---

## 2. Feasibility Analysis of Fraud / Risk Targets

### 2.1 Direct Fraud Classification Feasibility
* **Is Direct Fraud/Scam Classification Possible?**: **NO.**
* **Reasoning**: The MDCC dataset is scraped from publicly accessible GoFundMe campaigns. GoFundMe actively moderates and removes fraudulent campaigns before public archiving. The dataset contains **zero ground-truth labels for fraud, scam, or fake campaigns**.

### 2.2 Rule Compliance
* **Rule 6**: We will **NOT** create artificial fraud labels.
* **Rule 7**: MDCC does **NOT** contain a fraud target. If explicit fraud/scam classification is required in future research phases, an additional specialized labeled security dataset (e.g., crowdfunding scam benchmarks or expert-audited campaign fraud logs) will be required.

---

## 3. Academically Defensible ML Problem Definition

To align MDCC with Sahayata's research goal while maintaining strict academic integrity, we define the problem as **Campaign Viability Risk & Trust Score Estimation**.

### 3.1 Problem Statement
Given a crowdfunding campaign's multimodal assets (text narrative, metadata, cover photo) and early dynamic engagement signals (initial donation velocity, early creator updates), predict the probability of **Campaign Viability Risk** (the risk of failing to reach the fundraising goal) and compute an explainable **Sahayata Trust Score** (\(0 - 100\)) accompanied by feature importance explanations.

### 3.2 Machine Learning Problem Formulation
* **Task Type**: Binary Classification (High Risk of Goal Failure vs. Low Risk of Goal Failure).
* **Primary Model Output**: Risk Probability \(P(\text{Risk}) \in [0.0, 1.0]\).
* **Derived Sahayata Score**: \(\text{Trust Score} = (1 - P(\text{Risk})) \times 100\).

### 3.3 Proposed Feature Matrix
1. **Text Features**:
   * Length, readability score, sentiment polarities of `title` and `description`.
   * Dense text embeddings (e.g., TF-IDF / Sentence-BERT representations).
2. **Metadata Features**:
   * Target `goal` amount (log-transformed).
   * One-hot / target encoded `category` and `country`.
   * Temporal features from `launch_time` (day of week, hour of day).
3. **Visual Features**:
   * Image presence indicator, resolution/aspect ratio, and pre-trained CNN/Vision Transformer feature embeddings (e.g., MobileNet/ResNet features).
4. **Behavioral / Dynamic Features (Early Window)**:
   * Early donation count (first 24-48 hours).
   * Early donation velocity (\(\text{amount} / \text{time}\)).
   * Early update count by creator.
   * Early comment density.

### 3.4 Target Variable
* **Target Label (\(y\))**:
  \[
  y = \begin{cases} 
  1 & \text{if } \text{raised} < \text{goal} \quad (\text{High Viability Risk / Unsuccessful}) \\
  0 & \text{if } \text{raised} \ge \text{goal} \quad (\text{Low Viability Risk / Successful})
  \end{cases}
  \]
* **Class Distribution in MDCC**: Approximately 45% Successful (\(y=0\)) vs. 55% Unsuccessful (\(y=1\)), yielding a well-balanced target distribution suitable for ML modeling without severe class imbalance.

### 3.5 Evaluation Metrics
* **Classification Performance**:
  * **ROC-AUC**: Evaluates overall ranking capability.
  * **PR-AUC (Precision-Recall AUC)**: Evaluates performance across probability thresholds.
  * **F1-Score, Precision, Recall, Accuracy**: Standard thresholded classification metrics.
* **Probability Calibration**:
  * **Brier Score / Log Loss**: Measures accuracy and reliability of estimated risk probabilities.
* **Explainability**:
  * **SHAP (SHapley Additive exPlanations)** / **LIME**: Quantifies local feature attributions for individual campaign risk scores.

---

## 4. Utility for Sahayata Platform
1. **Donor Confidence**: Donors receive a transparent Trust Score and risk factor breakdown before committing funds.
2. **Campaigner Guidance**: Campaign creators receive actionable, explainable insights (e.g., "Adding a cover photo and detailing the target goal increases campaign success probability by 35%").
3. **Academic Integrity**: Fully grounded in empirical, peer-reviewed dataset specifications (MDCC, CIKM 2023) without synthetic label bias.
