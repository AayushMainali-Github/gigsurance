# GIGSurance ML Stack

This package contains the decision intelligence for GIGSurance: a weekly income-protection system for gig delivery workers in India.

The stack is intentionally split into two business decisions:

- **Premium decision**
  What the driver should pay at the end of the week for the next protection window.
- **Payout decision**
  What the company should pay when a real disruption creates a credible income-loss event.

The goal is not "predict weather and return a number."

The goal is to build an underwriting and claims layer that feels like a real product:

- forward-looking
- worker-specific
- explainable
- conservative enough for insurer risk
- distinctive enough to stand out in a Phase 2 evaluation

## System Thesis

We do **not** price from weather alone.

We price **recovery failure under disruption**.

The core idea is:

1. Forecast the next city-level disruption window.
2. Predict what a driver is likely to earn next week.
3. Compare that against a counterfactual "neutral conditions" income path.
4. Use the gap, the driver's fragility profile, and the city's rebound behavior to:
   - compute premium
   - compute payout
   - compute confidence and trust scores

This makes the product closer to **income protection** than generic parametric weather insurance.

## What Is Implemented

### 1. Environment Forecast Model

File:
- `environment_forecast_model.py`

Purpose:
- forecasts the next 7-day city environment window

Targets:
- next disruption score
- next peak AQI
- next total rain
- next peak heat risk

Used for:
- premium pricing
- payout trigger context
- confidence scoring

### 2. Earnings Forecast Model

File:
- `earnings_forecast_model.py`

Purpose:
- predicts next-week driver income from:
  - trailing worker behavior
  - city forecast window

Used for:
- projected earnings
- counterfactual income logic
- shortfall estimation

### 3. Premium Engine

File:
- `premium_model.py`

Purpose:
- computes what the **driver should pay**

The premium engine currently uses:
- counterfactual baseline income
- expected income shortfall
- ARIA structural fragility
- ARIA environmental fragility
- resilience trajectory underwriting
- earnings regime-shift loading
- weather resilience dividend
- severe-rain monotonic floor
- quote confidence score

Important product ideas already implemented:
- **Counterfactual Twin logic**
  The model estimates what the driver would likely earn in a neutral week, then compares that with the stressed forecast.
- **Resilience Trajectory Underwriting**
  A driver whose recovery architecture is improving is treated differently from one whose resilience is declining.
- **Fairness Audit Trail**
  Quote responses return a `pricing_receipt` that explains the pricing components.

### 4. Payout Engine

File:
- `payout_model.py`

Purpose:
- computes what the **company should pay**

The payout engine currently uses:
- counterfactual shortfall
- trigger strength
- certainty band
- deductible
- holdback
- payout cap
- peer-group sanity cap
- location alignment
- enterprise-style confidence score
- payout receipt

This is designed to avoid two common failure modes:
- paying because "weather was bad"
- overpaying noisy or weakly evidenced claims

### 5. API Layer

File:
- `api.py`

Purpose:
- exposes the premium and payout engines to the backend

Supports:
- single requests
- batch requests
- partial success responses with per-item errors

## Data Inputs

The ML package is built from seeded MongoDB data and derived training features.

Source collections:
- `deliverydrivers`
- `weather_snapshots`
- `aqi_snapshots`

Derived model inputs:
- city-level disruption histories
- worker-level weekly earnings histories
- weather and AQI stress signals
- city rebound context

Artifact location:
- `ml/artifacts/`

Training rebuilds the learned forecasting models from the prepared ML inputs.

Inference is worker-aware:
- the worker is resolved from MongoDB
- the decision layers combine worker history, city conditions, and trained model artifacts

## Underwriting Concepts

### ARIA

ARIA = **Adaptive Recovery Income Architecture**

It separates:
- **structural fragility**
  worker-side income architecture
- **environmental fragility**
  city-side disruption and rebound conditions

This matters because:
- some risk belongs to the worker's own income pattern
- some risk belongs to the city or environment
- good underwriting should not confuse the two

### Weather Resilience Dividend

The system rewards proven continuity and resilience rather than blindly punishing workers for operating through moderate disruption.

That is a product decision, not just a model artifact.

### Earnings Regime Shift

If recent average earnings drift materially above or below the worker's own trailing baseline, the system treats that as instability and prices more cautiously.

### Counterfactual Twin

For both premium and payout, the model compares:
- stressed expected income
vs
- neutral-week expected income

That is one of the most important differentiators in this stack.

## Confidence And Trust Layer

The system returns explicit confidence and trust signals instead of leaving the backend to guess.

### Premium Confidence

Quote responses include:
- `quote_confidence_score`
- `quote_confidence_band`

These reflect:
- data depth
- cohort density
- forecast signal quality
- stability evidence

### Payout Confidence

Payout responses include:
- `decision_confidence_score`
- `decision_confidence_band`
- `location_alignment_score_100`
- `trigger_certainty_score`
- `cohort_support_score`
- `counterfactual_coherence_score`
- `historical_data_depth_score`
- `environment_forecast_agreement_score`
- `registration_timing_penalty`
- `recommended_trust_action`

This is an **evidence-quality system**, not a vague fraud flag.

Current trust actions:
- `auto_allow`
- `allow_with_checks`
- `soft_hold`
- `manual_review`

## Decision Receipts

The system is designed to be inspectable.

Quote responses include:
- `pricing_receipt`

Payout responses include:
- `payout_receipt`

These receipts make it possible to explain:
- why the premium is what it is
- why the payout is what it is
- which guardrails limited the decision

That is useful for:
- backend operations
- demos
- product trust
- auditability

## Training

Train the learned models with:

```bash
python -m ml.train_all
```

On this repo, from the project root, that is typically:

```powershell
cd D:\gigsurance
py -u -m ml.train_all
```

This trains:
- environment forecast model
- earnings forecast model

It does **not** separately "train" the premium or payout engines because those are decision layers built on top of the trained models.

## Inference

Quote one worker:

```bash
python -m ml.inference --worker-id ZOMATO-MUM-00000004 --platform zomato
```

List valid workers:

```bash
python -m ml.list_workers --limit 20
```

Audit premium distribution across a cohort:

```bash
python -m ml.pricing_audit --limit 100
```

Audit how loyalty changes pricing:

```bash
python -m ml.pricing_audit --limit 100 --no-claim-weeks 6
```

Audit premium pool versus payout exposure:

```bash
python -m ml.portfolio_audit --limit 100
```

## API

Run the service:

```bash
uvicorn ml.api:app --reload
```

Endpoints:
- `GET /health`
- `GET /quote/{worker_id}`
- `POST /quote`
- `POST /quote/batch`
- `GET /payout/{worker_id}`
- `POST /payout`
- `POST /payout/batch`

### Quote Request

Example:

```json
{
  "worker_id": "ZOMATO-MUM-00000004",
  "platform_name": "zomato",
  "horizon_days": 7,
  "no_claim_weeks": 2,
  "forecast_overrides": {
    "aqi_multiplier": 1.15,
    "rain_multiplier": 1.30
  }
}
```

### Quote Batch Request

Example:

```json
{
  "horizon_days": 7,
  "no_claim_weeks": 1,
  "continue_on_error": true,
  "items": [
    {
      "worker_id": "SWIGGY-DEL-00000145",
      "platform_name": "swiggy"
    },
    {
      "worker_id": "BLINKIT-VIJ-00001263",
      "platform_name": "blinkit",
      "forecast_overrides": {
        "rain_multiplier": 1.25
      }
    }
  ]
}
```

### Payout Request

Example:

```json
{
  "worker_id": "SWIGGY-DEL-00000145",
  "platform_name": "swiggy",
  "horizon_days": 1,
  "affected_days": 1,
  "incident_city": "Delhi",
  "incident_state": "Delhi",
  "days_since_enrollment": 45,
  "verified_incident": true,
  "forecast_overrides": {
    "rain_multiplier": 1.55,
    "heat_multiplier": 1.15
  }
}
```

### Payout Batch Request

Example:

```json
{
  "horizon_days": 1,
  "affected_days": 1,
  "incident_city": "Delhi",
  "incident_state": "Delhi",
  "continue_on_error": true,
  "items": [
    {
      "worker_id": "SWIGGY-DEL-00000145",
      "platform_name": "swiggy",
      "verified_incident": true,
      "days_since_enrollment": 45
    },
    {
      "worker_id": "BLINKIT-VIJ-00001263",
      "platform_name": "blinkit",
      "incident_city": "Vijayawada",
      "incident_state": "Andhra Pradesh",
      "forecast_overrides": {
        "rain_multiplier": 1.40
      }
    }
  ]
}
```

## What Makes This Stack Distinct

This package is meant to feel like a designed insurance system, not a generic hackathon classifier.

Its strongest differentiators are:
- counterfactual income-loss logic
- ARIA structural vs environmental fragility split
- resilience trajectory underwriting
- confidence-scored payout decisions
- peer sanity caps for company risk protection
- decision receipts for explainability

## Planned Enterprise Controls

These are not overclaimed as fully live controls yet, but they are the next obvious extensions:

- **Enrollment Timing Integrity Score**
  stronger adverse-selection pricing for workers who enroll immediately before obvious high-risk windows
- **Portfolio Correlation Circuit Breaker**
  catastrophe-reserve style logic when a city-wide event triggers highly correlated claims

Those controls belong at the enterprise layer, not the first prototype layer, and are intentionally kept separate here.
