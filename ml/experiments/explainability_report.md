# Research Report: Explainable AI-Based Campaign Viability Risk and Trust Score Estimation

## Executive Summary

This research report presents the explainability architecture, global feature attributions, local transparency mechanisms, and probabilistic calibration analysis for the **Sahayata** crowdfunding viability framework.

The empirical analysis is conducted on the verified **MDCC dataset** (14,859 clean donation-based crowdfunding campaigns from GoFundMe). The champion baseline model is a **Random Forest Classifier** trained on all **56 multimodal engineered features** using strictly pre-48-hour data.

> [!IMPORTANT]
> **Research & Ethical Safety Disclaimer**
> The model provides decision support for campaign funding viability and early fundraising momentum. It **does NOT determine whether a campaign is fraudulent or legitimate**. A high-risk prediction indicates that a campaign faces severe structural or early momentum hurdles in reaching its target goal, **NOT malicious intent**.

---

## 1. Purpose of Explainability

In donation-based crowdfunding platforms like Sahayata, providing an uninterpretable "black box" prediction risks alienating campaigners and creating mistrust among donors. 

Explainable AI (XAI) serves three vital operational purposes:
1. **Actionable Campaigner Feedback**: Rather than receiving an opaque viability estimate, creators receive specific, quantifiable factors (e.g., updating frequency, early network activation, story clarity) to optimize their early 48-hour trajectory.
2. **Transparent Decision Support for Donors**: Donors can inspect why a campaign has achieved a particular Viability Score without confusing financial difficulty with fraud.
3. **Auditing and Bias Detection**: Platform operators can audit global and subgroup feature dynamics to verify that predictions are driven by authentic momentum and financial reality rather than spurious demographic biases.

---

## 2. SHAP Methodology & Axiomatic Guarantees

We adopt **SHAP (SHapley Additive exPlanations)** utilizing the specialized **Tree SHAP algorithm** (`shap.TreeExplainer`) for tree-based ensemble classifiers.

### Theoretical Foundation
Rooted in cooperative game theory, Shapley values quantify the marginal contribution of each feature $j \in \{1, \dots, M\}$ across all possible feature subsets $S \subseteq F \setminus \{j\}$:

$$\phi_j(x) = \sum_{S \subseteq F \setminus \{j\}} \frac{|S|!(|F| - |S| - 1)!}{|F|!} \Big[ f_x(S \cup \{j\}) - f_x(S) \Big]$$

### Exact Properties Guaranteed by Tree SHAP:
1. **Local Accuracy (Efficiency)**: The sum of feature attributions equals the difference between the model output $f(x)$ and the baseline expected value $\mathbb{E}[f(x)]$:
   $$f(x) = \phi_0 + \sum_{j=1}^M \phi_j(x) \quad \text{where } \phi_0 = \mathbb{E}[f(x)]$$
   *Empirical Verification*: On the 2,230 unseen test campaigns, the maximum reconstruction error $\max |f(x) - (\phi_0 + \sum \phi_j)|$ was verified to be **$0.00000000$** (exact attribution holds).
2. **Missingness**: A feature with no impact receives an attribution of zero ($\phi_j = 0$).
3. **Consistency (Monotonicity)**: If a model changes such that the marginal contribution of a feature increases or stays the same, its Shapley value cannot decrease.

---

## 3. Champion Model Specifications

* **Architecture**: Random Forest Classifier (`sklearn.ensemble.RandomForestClassifier`)
* **Feature Set**: 56 Multimodal Engineered Features
* **Prediction Window**: Strictly within the first **48 hours post campaign launch**
* **Target**: $y = 1$ if $\text{raised} < \text{goal}$ (Funding Viability Risk / Underfunded), $y = 0$ if $\text{raised} \ge \text{goal}$ (Funded / Low Risk)
* **Dataset Partition**: Chronological split (70% Train: 10,401 | 15% Validation: 2,228 | 15% Test: 2,230)
* **Hyperparameters**:
  * `n_estimators`: 50
  * `max_depth`: 7
  * `min_samples_split`: 15
  * `class_weight`: "balanced"
  * `random_state`: 42

### Test Set Performance on 2,230 Unseen Future Campaigns:
* **ROC-AUC**: `0.9027`
* **PR-AUC**: `0.9607`
* **Precision ($y=1$)**: `0.9446`
* **Recall ($y=1$)**: `0.8025`
* **F1-Score**: `0.8678`
* **Brier Score**: `0.1460`
* **Log Loss**: `0.4647`

---

## 4. Global Feature Ranking & Directional Impact

The table below presents the **Top 15 Global SHAP Features** evaluated across all 2,230 test set campaigns:

| Rank | Feature Name | Human-Readable Description | Feature Group | Mean \|SHAP\| | Rel. Importance (%) | Directional Impact |
| :---: | :--- | :--- | :---: | :---: | :---: | :--- |
| **1** | `log_goal` | Log-transformed funding goal | Metadata | 0.062836 | 16.87% | Higher values **INCREASE** risk |
| **2** | `goal` | Campaign funding goal | Metadata | 0.058546 | 15.72% | Higher values **INCREASE** risk |
| **3** | `early_donation_velocity` | Average donation amount per hour during first 48h | Early Behaviour | 0.048280 | 12.96% | Higher values **DECREASE** risk |
| **4** | `donations_first_48h_amount`| Total donation amount received during first 48h | Early Behaviour | 0.047748 | 12.82% | Higher values **DECREASE** risk |
| **5** | `donations_first_24h_amount`| Total donation amount received during first 24h | Early Behaviour | 0.025818 | 6.93% | Higher values **DECREASE** risk |
| **6** | `donations_first_48h_count` | Number of donations received during first 48h | Early Behaviour | 0.021869 | 5.87% | Higher values **DECREASE** risk |
| **7** | `donations_first_24h_count` | Number of donations received during first 24h | Early Behaviour | 0.016829 | 4.52% | Higher values **DECREASE** risk |
| **8** | `cat_animals` | Category: Animals & Pets | Metadata | 0.011094 | 2.98% | Higher values **INCREASE** risk |
| **9** | `early_comment_count` | Supporter comments received in first 48 hours | Early Behaviour | 0.007880 | 2.12% | Higher values **DECREASE** risk |
| **10**| `cat_memorial` | Category: Memorial & Funeral | Metadata | 0.005781 | 1.55% | Higher values **DECREASE** risk |
| **11**| `cat_financial_emergency` | Category: Financial Hardship & Emergency | Metadata | 0.004456 | 1.20% | Higher values **INCREASE** risk |
| **12**| `description_length` | Campaign story character length | Text | 0.003920 | 1.05% | Non-linear / Context-dependent |
| **13**| `early_comment_density` | Supporter comments per donation | Early Behaviour | 0.003415 | 0.92% | Higher values **DECREASE** risk |
| **14**| `cat_medical` | Category: Medical & Health | Metadata | 0.003290 | 0.88% | Non-linear / Context-dependent |
| **15**| `description_word_count` | Campaign story word count | Text | 0.003180 | 0.85% | Non-linear / Context-dependent |

---

## 5. Feature-Group Contribution Analysis

Aggregating the actual mean absolute SHAP attributions across the 4 core feature groups validates the empirical findings of the feature ablation studies:

| Feature Group | Number of Features | Aggregate Mean \|SHAP\| | Relative Contribution (%) | Primary Drivers |
| :--- | :---: | :---: | :---: | :--- |
| **Early Behaviour** | 9 | **0.173206** | **46.50%** | Hourly velocity, 48h & 24h donation amounts, backer counts, comments |
| **Metadata** | 16 | **0.144677** | **38.84%** | Financial goal magnitude (`log_goal`, `goal`), cause category priors |
| **Text** | 28 | **0.053333** | **14.32%** | Story length, readability, sentiment polarity, TF-IDF narrative terms |
| **Image Metadata** | 3 | **0.001263** | **0.34%** | Cover photo presence, embedded body photos |
| **Total** | **56** | **0.372479** | **100.00%** | Multimodal Synergistic Attribution |

### Research Insight:
* **Dynamic Early Trajectory Dominance (46.50%)**: How a campaign performs in its first 48 hours is the single strongest determinant of ultimate funding success.
* **Financial Bar (38.84%)**: The absolute goal amount sets the required scale of network mobilization.
* **Text & Images (14.66%)**: High narrative clarity and visual assets serve as foundational enablers that unlock early donation conversions.

---

## 6. Local Explanation Methodology

For any individual campaign feature vector $x \in \mathbb{R}^{56}$:

1. **Calculate Instance Attributions**: Compute $\phi_j(x)$ for all $j \in \{1, \dots, 56\}$.
2. **Compute Risk Probability & Viability Score**:
   $$P(y = 1 \mid x) = \phi_0 + \sum_{j=1}^{56} \phi_j(x)$$
   $$\text{Viability Score} = \text{round}\Big((1 - P(y=1 \mid x)) \times 100\Big)$$
3. **Partition Factors into Directional Groups**:
   * **Risk-Increasing Factors ($\phi_j > 0$)**: Push the probability toward $y=1$ (underfunding danger).
   * **Risk-Reducing / Supporting Factors ($\phi_j < 0$)**: Reduce the probability of failure, boosting viability.
4. **Human-Readable Synthesis**: Format values with appropriate units (e.g., `USD`, `hours`, `word count`) and match to pre-compiled domain descriptions.

---

## 7. Example Campaign Local Explanations

Representative test set case studies from the unseen test partition:

### Archetype 1: Low Risk / High Viability (Sample #0005)
* **Risk Probability $P(y=1)$**: `0.2834` (28.3%)
* **Campaign Viability Score**: **`72 / 100`**
* **Risk Classification**: **`LOW RISK`**
* **Actual Outcome**: Funded ($y=0$)
* **Top Supporting Factors**:
  1. *Realistic, well-sized funding goal facilitates goal achievement.* (`Funding Goal: $5,000.00`, `-5.5%` risk)
  2. *Moderate target scale keeps required donor backing manageable.* (`Log Goal: $8.52`, `-4.5%` risk)
  3. *High 48h donor mobilization provides critical early traction.* (`48h Donation Count: 63`, `-3.9%` risk)
  4. *Rapid Day-1 donor turnout demonstrates high immediate urgency.* (`24h Donation Count: 49`, `-3.8%` risk)
* **Top Risk Factors**:
  1. *Story is either too brief to establish credibility or excessively dense.* (`Story Length: 2,599 chars`, `+0.8%` risk)
  2. *Few supporter comments indicates low conversational engagement.* (`48h Comments: 1`, `+0.7%` risk)

---

### Archetype 2: Medium Risk / Moderate Viability (Sample #1178)
* **Risk Probability $P(y=1)$**: `0.4016` (40.2%)
* **Campaign Viability Score**: **`60 / 100`**
* **Risk Classification**: **`MEDIUM RISK`**
* **Top Risk Factors**:
  1. *Higher target magnitude increases funding completion risk.* (`Log Goal: $11.51`, `+11.7%` risk)
  2. *Large financial goal creates a higher threshold for full funding.* (`Funding Goal: $100,000.00`, `+9.7%` risk)
  3. *Under-communicating urgency fails to convey critical necessity.* (`Urgency Tone: 0.4%`, `+0.4%` risk)
* **Top Supporting Factors**:
  1. *Rapid hourly donation inflow rate indicates strong fundraising momentum.* (`Donation Velocity: $995.71/hr`, `-8.3%` risk)
  2. *Substantial 48h funding jumpstarts progress toward the goal.* (`48h Raised Amount: $47,794.00`, `-8.0%` risk)

---

### Archetype 3: High Risk / Low Viability (Sample #0329)
* **Risk Probability $P(y=1)$**: `0.8266` (82.7%)
* **Campaign Viability Score**: **`17 / 100`**
* **Risk Classification**: **`HIGH RISK`**
* **Top Risk Factors**:
  1. *Hourly donation velocity is below the threshold needed for full funding.* (`Donation Velocity: $16.67/hr`, `+6.4%` risk)
  2. *Higher target magnitude increases funding completion risk.* (`Log Goal: $9.21`, `+6.1%` risk)
  3. *Low capital inflow in first 48h leaves a substantial remaining gap.* (`48h Raised Amount: $800.00`, `+5.7%` risk)
  4. *Large financial goal creates a higher threshold for full funding.* (`Funding Goal: $10,000.00`, `+5.6%` risk)
* **Top Supporting Factors**:
  1. *Comprehensive narrative provides clear, transparent project context.* (`Story Length: 496 chars`, `-0.4%` risk)
  2. *Approachable readability level enables immediate reader understanding.* (`Readability: Grade 9.0`, `-0.2%` risk)

---

## 8. Probability Calibration Results

To ensure predicted probabilities accurately represent empirical risk frequencies, calibration diagnostics were evaluated on the unseen test set:

| Calibration Method | Fitting Data | Test Brier Score | Test Log Loss | Test ECE (10 Bins) | Verdict |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Raw Random Forest** | Train only | 0.1460 | 0.4647 | 0.2066 | Moderately calibrated; slight over-confidence in mid-ranges |
| **Platt Scaling (Sigmoid)**| Validation only | **0.0954** | **0.3120** | **0.0304** | **Excellent calibration; smooth monotonic probability curve** |
| **Isotonic Regression** | Validation only | 0.0958 | 0.3245 | **0.0158** | Very low ECE; piecewise step function |

> [!NOTE]
> All post-hoc calibrators were fitted **strictly on validation data (2,228 campaigns)**. No test set labels were accessed during calibrator optimization.

*Diagnostic Reliability Diagram*: Saved under `ml/experiments/results/explainability/calibration_curve.png`.

---

## 9. Viability Score Formulation

The Sahayata Viability Score maps calibrated failure probability into an intuitive 0–100 index:

$$\text{Risk Probability} = P(y = 1 \mid x_{48h})$$
$$\text{Viability Score} = \text{round}\Big(\max(0, \min(100, (1 - \text{Risk Probability}) \times 100))\Big)$$

* **Higher Score (e.g., 85/100)**: Strong early trajectory; high likelihood of completing funding goal.
* **Lower Score (e.g., 20/100)**: Underfunded trajectory; significant risk of funding shortfall without strategic intervention.

---

## 10. Risk-Level Definitions

| Score Tier | Viability Score Range | Classification | Clinical Interpretation & Decision Guidance |
| :---: | :---: | :---: | :--- |
| **Tier 1** | **70 – 100** | **LOW RISK** | High early momentum, strong donor velocity, achievable goal. Minimal intervention needed. |
| **Tier 2** | **40 – 69** | **MEDIUM RISK** | Moderate early traction. May require creator updates, social outreach, or media enhancement. |
| **Tier 3** | **0 – 39** | **HIGH RISK** | Severe funding shortfall risk. Recommended actions: adjust goal, increase updates, activate peer networks. |

---

## 11. Research Limitations & Governance

1. **48-Hour Horizon Horizon**: The model observes data up to 48 hours post-launch. Unforeseeable external catalysts (e.g., celebrity endorsements on day 15) cannot be anticipated.
2. **Platform Specificity**: Findings are benchmarked on the MDCC dataset (GoFundMe). Transferability to equity or reward-based crowdfunding (e.g., Kickstarter) requires recalibration.
3. **Strict Non-Fraud Delimitation**: Underfunding is a natural market phenomenon and must never be conflated with fraudulent behavior.

---

## 12. Summary of Generated Artifacts

The complete explainability suite is organized under `ml/experiments/results/explainability/`:
* `shap_feature_importance.csv`: 56-feature machine-readable ranking table
* `shap_bar.png`: Publication-grade SHAP global importance bar plot
* `shap_summary.png`: Publication-grade SHAP beeswarm distribution plot
* `calibration_curve.png`: Comparative reliability diagram
* `example_campaign_explanation.json`: Full local explanations across all risk archetypes
* `feature_group_importance.json`: Aggregate group attributions
* `calibration_analysis.json`: Calibration bin tables and metrics
* Model Artifact: `ml/models/artifacts/random_forest_champion.joblib`
