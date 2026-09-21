# Sahayata ML Inference API

Production-ready FastAPI service for **Explainable AI-Based Campaign Viability Risk and Trust Score Estimation** in donation-based crowdfunding.

---

## 1. Purpose

The **Sahayata ML Inference API** provides real-time, transparent decision support for crowdfunding campaigns by evaluating early trajectory signals strictly at **48 hours post-launch**. It empowers campaign creators with actionable feedback to optimize their campaigns while providing donors with objective viability transparency.

---

## 2. Research Problem & Target

* **Research Problem**: *"Explainable AI-Based Campaign Viability Risk and Trust Score Estimation"*
* **Target Definition**:
  $$y = 1 \quad \text{if } \text{raised} < \text{goal} \quad (\text{Underfunded / Viability Risk})$$
  $$y = 0 \quad \text{if } \text{raised} \ge \text{goal} \quad (\text{Funded / Low Risk})$$
* **Prediction Horizon**: Strictly within the first **48 hours post-launch** ($0 \le \text{seconds\_elapsed} \le 172,800$).
* **Dataset Foundation**: Evaluated and benchmarked on 14,859 clean GoFundMe campaigns from the verified **MDCC dataset**.

---

## 3. Architecture

```
ml/api/
├── __init__.py           # Package exports
├── config.py             # Server settings & CORS origins
├── dependencies.py       # Dependency injection providers
├── main.py               # FastAPI application & lifespan management
├── predictor.py          # 56-feature extraction, Platt calibration, SHAP explainer
├── schemas.py            # Pydantic request/response models & input validation
├── test_api.py           # Exhaustive 20-test test suite
└── README.md             # Complete API documentation
```

* **In-Memory Model Loading**: The champion Random Forest classifier (`random_forest_champion.joblib`) and Platt scaling calibrator (`platt_calibrator.joblib`) are deserialized once during application startup via FastAPI's `lifespan` manager, ensuring fast per-request inference ($< 50\text{ms}$) with zero redundant disk reads.

---

## 4. Installation & Environment

The Python ML environment requires Python 3.10+ (tested on Python 3.13):

```bash
# Navigate to project root
cd /path/to/Fundora

# Activate virtual environment
.\.venv\Scripts\Activate.ps1   # Windows PowerShell
source .venv/bin/activate      # Linux/macOS

# Install dependencies
python -m pip install -r ml/requirements.txt
```

---

## 5. Startup Command

Start the independent ML inference service:

```bash
# Direct uvicorn command
.\.venv\Scripts\uvicorn ml.api.main:app --host 127.0.0.1 --port 8000 --reload
```

Or run via Python:
```bash
python -m ml.api.main
```

* **Swagger Interactive Docs**: `http://127.0.0.1:8000/docs`
* **ReDoc Interactive Docs**: `http://127.0.0.1:8000/redoc`
* **OpenAPI Schema**: `http://127.0.0.1:8000/openapi.json`

---

## 6. Available Endpoints

| Method | Route | Description | Response Model |
| :---: | :--- | :--- | :---: |
| `GET` | `/health` | Lightweight service health probe | `HealthResponse` |
| `GET` | `/status` | Model memory state, feature count, calibration status | `PredictorStatusResponse` |
| `POST` | `/predict/viability` | Full 48-hour feature extraction, Platt calibration & SHAP explanation | `ViabilityPredictionResponse` |

---

## 7. Request Example (`POST /predict/viability`)

```json
{
  "campaign_id": "CAMP_2026_001",
  "title": "Emergency Medical Fund for Alex",
  "description": "Alex was involved in an accident and needs urgent surgery and physical recovery support...",
  "goal": 10000.0,
  "category": "Medical",
  "country": "US",
  "city": "Seattle",
  "launch_date": "2026-09-01T10:00:00Z",
  "donations": [
    {"amount": 100.0, "seconds_elapsed": 3600.0},
    {"amount": 250.0, "seconds_elapsed": 14400.0},
    {"amount": 500.0, "seconds_elapsed": 43200.0},
    {"amount": 300.0, "seconds_elapsed": 86400.0},
    {"amount": 400.0, "seconds_elapsed": 120000.0}
  ],
  "updates": [
    {"seconds_elapsed": 7200.0},
    {"seconds_elapsed": 86400.0}
  ],
  "comments": [
    {"seconds_elapsed": 5000.0},
    {"seconds_elapsed": 20000.0},
    {"seconds_elapsed": 90000.0}
  ],
  "has_cover_photo": true,
  "num_body_photos": 2
}
```

---

## 8. Response Example

```json
{
  "campaign_id": "CAMP_2026_001",
  "risk_probability": 0.2834,
  "viability_score": 72,
  "risk_level": "LOW RISK",
  "prediction_horizon_hours": 48,
  "model": {
    "name": "Random Forest Champion",
    "model_type": "RandomForestClassifier",
    "n_features": 56,
    "calibration": "Platt Scaling (Sigmoid)"
  },
  "explanation": {
    "base_rate_risk": 0.4996,
    "top_risk_factors": [
      "Story is either too brief to establish credibility or excessively dense. (Story Length: 2,599, +0.8% risk)",
      "Few supporter comments indicates low conversational engagement. (48h Comments: 3, +0.7% risk)"
    ],
    "top_supporting_factors": [
      "Realistic, well-sized funding goal facilitates goal achievement. (Funding Goal: $10,000.00, -5.5% risk)",
      "High 48h donor mobilization provides critical early traction. (48h Donation Count: 5, -3.9% risk)",
      "Substantial 48h funding jumpstarts progress toward the goal. (48h Raised Amount: $1,550.00, -2.1% risk)"
    ],
    "detailed_risk_factors": [...],
    "detailed_supporting_factors": [...]
  },
  "research_disclaimer": "The model provides decision support for campaign funding viability and does not determine whether a campaign is fraudulent or legitimate. High risk indicates a higher probability of campaign underfunding; it does not indicate fraud or malicious intent."
}
```

---

## 9. 48-Hour Prediction Boundary & Leakage Prevention

* **Strict Temporal Filtering**: Only events with $0 \le \text{seconds\_elapsed} \le 172,800$ ($48\text{ hours}$) are incorporated into early dynamic feature extraction.
* **Post-48h Exclusion**: Events after 48h (e.g. donations at 50h, 72h, 120h) are strictly excluded from 24h/48h counts, amounts, velocity, updates, and comments.
* **No Outcome Leakage**: The final outcome variable `raised` is not accepted as an input parameter.
* **Pre-Launch Filtering**: Events with negative timestamps prior to `launch_date` are filtered.

---

## 10. 56 Multimodal Feature Groups

The API extracts the exact 56 features matching `champion_metadata.joblib`:

1. **Metadata (16 features)**: `goal`, `log_goal`, `launch_day`, `launch_hour`, `is_weekend`, `cat_memorial`, `cat_medical`, `cat_animals`, `cat_emergency`, `cat_financial_emergency`, `cat_other`, `country_us`, `country_ca`, `country_gb`, `country_au`, `country_other`.
2. **Text (28 features)**: `description_length`, `description_word_count`, `sentence_count`, `avg_word_length`, `readability_score`, `sentiment_pos_ratio`, `sentiment_neg_ratio`, `sentiment_polarity_net`, and 20 champion TF-IDF terms (`tfidf_and`, `tfidf_the`, `tfidf_for`, `tfidf_help`, `tfidf_this`, `tfidf_you`, `tfidf_with`, `tfidf_was`, `tfidf_will`, `tfidf_that`, `tfidf_are`, `tfidf_have`, `tfidf_family`, `tfidf_all`, `tfidf_has`, `tfidf_can`, `tfidf_his`, `tfidf_our`, `tfidf_time`, `tfidf_thank`).
3. **Early Behaviour (9 features)**: `donations_first_24h_count`, `donations_first_24h_amount`, `donations_first_48h_count`, `donations_first_48h_amount`, `early_donation_velocity`, `early_comment_count`, `early_comment_density`, `early_update_count`, `early_update_frequency`.
4. **Image Metadata (3 features)**: `has_cover_photo`, `num_body_photos`, `total_photo_count`.

---

## 11. Probability Calibration

* **Method**: **Platt Scaling (Sigmoid)** fitted strictly on validation data.
* **Performance**: Yields low Expected Calibration Error ($\text{ECE} = 0.0304$) and lowest Brier Score ($\text{Brier} = 0.0954$).
* **Mapping**: Raw Random Forest tree vote probabilities are mapped to monotonic, well-calibrated posterior probabilities $P(y = 1 \mid x_{48h}) \in [0.0, 1.0]$.

---

## 12. SHAP Explainability

* **Algorithm**: Exact Tree SHAP via `shap.TreeExplainer`.
* **Efficiency Guarantee**: Exact mathematical sum verification:
  $$P(y = 1 \mid x) = \phi_0 + \sum_{j=1}^{56} \phi_j(x)$$
* **Factor Categorization**:
  * **Risk-Increasing Factors ($\phi_j > 0$)**: Factors pushing the probability toward underfunding ($y=1$).
  * **Supporting Factors ($\phi_j < 0$)**: Factors reducing failure probability / supporting viability.
* **Human-Readable Text**: Features are presented with domain-formatted units (`$`, `hrs`, `words`, `updates`, `comments`).

---

## 13. Viability Score Formula

$$\text{Risk Probability} = P(y = 1 \mid x_{48h})$$
$$\text{Viability Score} = \text{round}\Big(\max\big(0, \min(100, (1 - \text{Risk Probability}) \times 100)\big)\Big)$$

---

## 14. Risk-Level Tiers

| Score Range | Viability Tier | Decision Guidance |
| :---: | :---: | :--- |
| **70 – 100** | **LOW RISK** | Strong early momentum, high donor velocity, realistic goal. On track for completion. |
| **40 – 69** | **MEDIUM RISK** | Moderate early traction. Creator status updates and peer sharing recommended. |
| **0 – 39** | **HIGH RISK** | High danger of underfunding. Actionable advice: adjust target, post status updates, mobilize early networks. |

---

## 15. Error Handling & HTTP Status Codes

The API employs centralized exception handlers to guarantee that clients receive clean, helpful error messages without exposing internal stack traces, filesystem paths, or secrets:

* `400 / 422 Unprocessable Entity`: Input validation failure (malformed timestamps, negative goals, empty mandatory strings).
* `500 Internal Server Error`: Sanitized inference failure response.
* `503 Service Unavailable`: ML model artifacts not yet loaded or initialized.

---

## 16. Security & CORS Considerations

* **CORS Middleware**: Explicit allowed origins configured via `ALLOWED_ORIGINS` (defaults to frontend `http://localhost:3000`). Wildcard `allow_origins=["*"]` is disabled.
* **Zero Path Leakage**: Internal exception messages intercept joblib paths and filesystem directories.
* **No Database Credentials Required**: The ML service is stateless and reads strictly from in-memory artifacts.

---

## 17. Research Limitations

1. **Prediction Horizon Bound**: Model considers signals strictly within the first 48 hours; post-48-hour viral spikes or external press coverage cannot be anticipated.
2. **Platform Context**: Trained on donation-based GoFundMe campaigns (MDCC dataset); requires adaptation for reward-based (e.g., Kickstarter) or equity crowdfunding.
3. **Decision Support Boundary**: Underfunded status reflects funding velocity and financial bar, not fraudulent intent.

---

## 18. Ethical & Safety Disclaimer

> **Ethical Disclaimer**: This system estimates **campaign funding viability risk** (the likelihood of reaching the funding target). It does **NOT** determine whether a campaign is fraudulent, deceptive, or legitimate. High risk indicates a higher probability of campaign underfunding; it does not indicate fraud or malicious intent.
