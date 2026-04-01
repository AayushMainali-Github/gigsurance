# GIGSurance - AI-Powered Parametric Income Insurance for Gig Workers

> **Guidewire DEVTrails 2026 | Phase 1 Submission**
> Team: 71000TICKET | University: Amrita Vishwa Vidyapeetham, Bengaluru

---

## TL;DR

GIGSurance is an AI-powered parametric insurance platform that:
- Detects disruptions (rain, heat, curfews) in real time
- Automatically triggers claims with zero worker action
- Pays gig workers instantly via UPI

No claims process. No paperwork. Instant income protection.

---

## The Problem

India's food delivery partners (Zomato, Swiggy) lose **20–30% of weekly income** when extreme weather, floods, or sudden curfews halt deliveries. They have zero protection against these external, uncontrollable events.

GIGSurance monitors these disruptions in real time, triggers claims automatically, and pays out lost income directly to the worker's UPI - no paperwork, no calls, no waiting.

> **Coverage: LOSS OF INCOME ONLY.**
> Health, life, accidents, and vehicle repairs are explicitly excluded.

---

## Our Persona

**Segment:** Food Delivery Partners - Zomato / Swiggy
**City:** Bengaluru (Tier-1, expandable to other metros)

| Attribute | Detail |
|---|---|
| Weekly Income | ₹3,500 – ₹5,500 |
| Working Hours | 8–12 hrs/day, 6–7 days/week |
| Peak Hours | 12–2 PM and 7–10 PM |
| Payment Method | UPI (PhonePe / GPay) |
| Device | Android smartphone |

### Persona Scenarios

**Scenario A - Heavy Rain**
> Ravi is on shift at 8 PM in HSR Layout. Rainfall crosses 25mm/hr. The system detects this via OpenWeatherMap, validates that Ravi's GPS shows no movement for 90 minutes, and auto-triggers a claim. ₹220 hits his UPI within minutes.

**Scenario B - Bandh / Curfew**
> A sudden shutdown is declared in South Bengaluru. GIGSurance's news feed picks up the alert, cross-checks a 70%+ drop in order volume from the platform simulator in that zone, and auto-pays all enrolled active workers in the affected area.

**Scenario C - Extreme Heat**
> A 43°C heat index is sustained for 3 hours in Hyderabad. Workers who were logged as active going into the event but become inactive during it are auto-compensated for lost window hours.

---

## Application Workflow

```
1. Worker signs up → Aadhaar + Platform ID verified → ML builds risk profile
2. Weekly quote generated (personalised premium) → Worker activates → UPI auto-debit scheduled
3. Trigger engine monitors weather, AQI, traffic, and alerts 24/7
4. Threshold breached → Worker activity cross-validated → Fraud check run
5. Claim auto-approved → Payout sent to UPI instantly
6. Worker sees payout in dashboard. Admin sees loss ratios and alerts.
```

---

## Weekly Premium Model

### Why Weekly?

Gig workers earn and spend weekly. A monthly premium creates a cashflow mismatch. But more importantly - gig workers don't think in rupees per week for insurance. They think in **deliveries**.

Ravi doesn't instinctively know what ₹84 means relative to his risk exposure. But he immediately understands: **"2.1 deliveries covers your entire week."**

### Delivery-Denominated Pricing

GIGSurance is the first parametric insurance platform to express premiums in the worker's own unit of work - deliveries, not rupees.

Every Monday morning, the worker sees:

```
┌─────────────────────────────────────────────┐
│  Your GIGSurance this week                  │
│                                             │
│  Premium:  2.1 deliveries  (≈ ₹84)          │
│  Covers:   Up to 35 deliveries of income    │
│  Risk:     Moderate - rain forecast Tue/Wed │
│                                             │
│  [ Activate Coverage ]                      │
└─────────────────────────────────────────────┘
```

The rupee amount is shown in small text. The deliveries number is what they act on. Ravi earns ~50 deliveries a week. Giving up 2 to protect 35 is an obvious yes.

### How the Premium Is Calculated

There are **no fixed tiers**. The ML model runs every Sunday night and outputs a personalised premium for each active worker - expressed in both rupees and deliveries. No manual input required.

The model takes into account the worker's expected income for the coming week, the probability of disruption events in their specific zone and shift windows, and how severe those disruptions historically are for their earnings. It then converts the rupee output into deliveries using the worker's own average earning per delivery.

**What drives the number up or down each week:**

| Factor | Effect |
|---|---|
| Zone's historical flood / waterlogging risk | Higher risk → more deliveries required |
| Worker's avg active hours (last 4 weeks) | More hours = more income at risk = higher premium |
| Next week's weather forecast | Rain forecast Tuesday → premium rises Sunday night |
| No-claims history (3 clean weeks) | −5% discount → fewer deliveries required |
| Zone historically safe from disruptions | Premium reduced automatically |

The **coverage cap** scales proportionally with the premium - higher-risk weeks price more expected income at risk, so the cap rises with it.

### Worked Example

Worker in HSR Layout, Bengaluru. Avg earning: ₹40/delivery. High rain risk week forecasted.

The model estimates expected income loss across all disruption types for the coming week and prices accordingly. Output: **≈ 7.5 deliveries premium, covering up to 30 deliveries of lost income.**

Same worker, safer zone with low flood history → model outputs **≈ 6.6 deliveries**. No manual input needed.

---

## Parametric Triggers

| # | Trigger | Source | Threshold | Action |
|---|---|---|---|---|
| 1 | Heavy Rainfall | OpenWeatherMap / IMD | > 25mm/hr for 1+ hr in zone | Auto-claim |
| 2 | Extreme Heat | IMD Heat Index | > 42°C for 3+ hrs | Auto-claim |
| 3 | Severe AQI | OpenAQ / CPCB | AQI > 400 for 4+ hrs | Auto-claim |
| 4 | Flood / Red Alert | IMD / State alerts | Official Red Alert issued | Auto-claim |
| 5 | Curfew / Bandh | NewsAPI + order volume drop | Govt order OR >70% order drop in zone | Auto-claim |

Payout is capped at the worker's weekly coverage cap and calculated proportionally to their expected income for the disrupted window.

---

## Adversarial Defense & Anti-Spoofing Strategy

*Added in response to the Market Crash scenario: a syndicate of 500 workers coordinating via Telegram, using GPS-spoofing apps to fake locations inside weather alert zones and drain the liquidity pool.*

### 1. The Differentiation - How We Tell Real vs Fake

Simple GPS is officially obsolete. GIGSurance builds a **Composite Trust Score** across four independent signal layers before any payout is approved:

| Signal Layer | What We Check | Why It Catches Spoofers |
|---|---|---|
| **Device Integrity** | Play Integrity API (`MEETS_DEVICE_INTEGRITY`) | Spoofing apps require rooted/modified devices - flagged immediately |
| **Sensor Fusion** | Accelerometer + gyroscope vs GPS movement | A person at home has flat sensor data; someone on a bike in rain does not |
| **Network Triangulation** | Cell tower IDs + WiFi BSSIDs vs claimed GPS zone | Home WiFi BSSID doesn't match a flooded street 5km away |
| **Behavioural Baseline** | Historical activity pattern vs claim-window activity | Spoofers go from 0 deliveries/day → suddenly "stranded" on every alert |

A genuine stranded worker: GPS in zone ✓, sensors show physical activity ✓, cell tower consistent with zone ✓, platform orders accepted earlier that shift ✓.

A spoofer: Mock location flag ✓, accelerometer flat ✓, home WiFi BSSID ✓, zero orders before the alert ✓.

### 2. The Data - What We Analyze Beyond GPS

**Individual worker signals:**
- `device_integrity_verdict` - Play Integrity API result
- `location_mock_flag` - Android `isMock()` (weak alone, strong when combined)
- `accelerometer_variance` - Near-zero = physically stationary
- `cell_tower_ids` at claim time vs declared zone centroid
- `wifi_bssid` - Home network fingerprint (captured at onboarding) vs claim-time network
- `platform_orders_accepted_last_2hrs` - Were they actually working before the alert?
- `claim_count_last_7d` - Frequency vs personal baseline

**Syndicate / coordinated ring detection:**
- `claims_from_same_device_fingerprint` - Multiple accounts on one device
- `geohash_claim_spike` - Surge of claims from one micro-zone (>3× normal rate)
- `claim_time_cluster` - 50+ workers from same zone filing within 10 mins of alert → cluster flagged for review, not individuals
- `onboarding_IP_cluster` - Multiple workers registered from same IP in a short window

### 3. The UX Balance - Flagged Claims Without Punishing Honest Workers

We use a **three-lane system** - not binary approve/deny:

```
Trust Score 0–40   →  AUTO-APPROVE  → Payout in < 60 seconds
Trust Score 41–70  →  SOFT HOLD     → Payout in 2–4 hours, worker notified
Trust Score 71–100 →  MANUAL REVIEW → Admin queue, "Verification in progress" shown
```

Workers in Soft Hold receive: *"We're verifying your claim due to network conditions. Expected resolution: 2–4 hrs."* - no "fraud suspected" language.

**Key principle:** Honest workers in bad weather have poor GPS accuracy, dropped connectivity, and inconsistent pings. Our system treats these as **expected signals of a genuine disruption** - sensor fusion and cell-tower data fill the gap, not GPS alone. If a flagged claim is cleared manually, the worker's Trust Score improves and future claims process faster.

---

## AI/ML Plan

| Model | What It Does | Algorithm | Output |
|---|---|---|---|
| Income Baseline | Predicts worker's expected weekly earnings | XGBoost (quantile regression) | `income_mean`, `q10`, `q90` |
| Disruption Risk | Probability of trigger per zone × time window | XGBoost Classifier | `P(event)` per window |
| Premium Engine | Combines above into weekly ₹ + deliveries price | EWL formula on ML outputs | `weekly_premium` |
| Fraud / Anomaly | Scores each claim's trust level | Isolation Forest | `fraud_score` 0–100 |
| Syndicate Detector | Detects coordinated claim clusters | DBSCAN on claim metadata | Cluster alert flags |

**Training Data Strategy:**
- Synthetic generator: hourly delivery earnings with day-of-week seasonality + IMD archive disruption overlays
- Clearly labeled as synthetic throughout
- Phase 2 onwards: integrate live OpenWeatherMap + CPCB feeds

### Cold Start Strategy - New vs Experienced Workers

When a worker links their platform account, we check how much earnings history is available. The model behaves differently depending on this:

**Case 1 - New worker (< 1 month of data)**
No personal baseline exists yet. We do not guess.
- Premium calculated using **zone-level averages** for similar workers (same geohash, same platform, same shift window)
- Worker enters a **1-month observation buffer** - coverage is active, but the personal income model is training in the background on their real activity
- After 4 weeks, the model automatically switches from zone-average to fully personalised pricing
- Worker sees: *"Your premium will personalise after your first month"*

**Case 2 - Experienced worker (1+ year of history)**
Full personalised pricing from day one:
- Income baseline model trained directly on their own earnings history
- Seasonal patterns (monsoon dips, festival spikes) captured in the model
- EWL calculated against *their specific zone and shift windows*
- No buffer period - model runs with confidence from the first Sunday

**Case 3 - Moderate history (1–12 months)**
Hybrid: personal data weighted against zone averages, with the personal signal increasing each week as more data accumulates.

---

## Platform Choice: Mobile PWA

We chose a **Progressive Web App (PWA)** over a native app or desktop portal because:

- Delivery partners are phone-first - install via WhatsApp link, no Play Store needed
- Works offline - shows policy status and last payout without a data connection
- GPS + accelerometer access natively available - essential for activity validation
- UPI deep-linking works natively on mobile
- One codebase, deploys everywhere instantly

Admin dashboard is a separate **React web app** for insurer and ops teams.

---

## Tech Stack

### Frontend
- Worker App: React PWA + Tailwind CSS
- Admin Dashboard: React + Recharts

### Backend
- API: FastAPI (Python)
- Database: PostgreSQL
- Cache: Redis
- Queue: BullMQ (async claim processing)

### ML
- Models: XGBoost, Isolation Forest, DBSCAN
- Serving: FastAPI microservice
- Training: Python + synthetic data generator

### Integrations

| Integration | Provider | Mode |
|---|---|---|
| Weather | OpenWeatherMap free tier | Mock |
| AQI | OpenAQ REST API | Mock |
| Civil alerts | NewsAPI | Mock |
| Traffic | Google Routes API | Mock |
| Platform data | Zomato / Swiggy | Mock |
| Payments | Razorpay test mode | Sandbox |
| Device integrity | Play Integrity API | Live (Android) |

### Infra
- Hosting: Vercel (frontend) + Railway (backend)
- CI/CD: GitHub Actions
- Logs: Centralized, 180-day retention

---

## How GIGSurance Meets Hackathon Requirements

| Requirement | Our Implementation |
|---|---|
| Optimized onboarding | Aadhaar + Platform ID verification, ML risk profile on signup |
| Risk profiling (AI/ML) | XGBoost income baseline + disruption probability models |
| Weekly pricing | Fully dynamic EWL model - personalised per worker, per week |
| Parametric triggers | 5 triggers: weather, heat, AQI, flood alerts, curfew/bandh |
| Claim automation | Zero-touch pipeline - trigger → validate → approve → pay |
| Payout processing | UPI via Razorpay sandbox |
| Analytics dashboard | Worker view (earnings protected) + Admin view (loss ratios, cluster alerts) |
| Fraud detection | Composite Trust Score: device integrity + sensor fusion + behavioural baseline + syndicate detection |

---

## Development Plan

### Phase 1 - Ideation & Foundation (Weeks 1–2) ← Current
- [x] Persona + scenario definition
- [x] Delivery-denominated premium model + worked example
- [x] Parametric trigger definitions + thresholds
- [x] Adversarial defense & anti-spoofing strategy
- [x] AI/ML plan across all 5 models
- [x] Tech stack finalized
- [x] README complete
- [x] 2-minute strategy video

### Phase 2 - Automation & Protection (Weeks 3–4)
- [ ] Worker registration + onboarding flow
- [ ] Policy activation UI + UPI auto-debit
- [ ] Dynamic premium calculation (XGBoost model v1)
- [ ] 3–5 parametric triggers wired to live/mock APIs
- [ ] Claims state machine (Created → Validating → Approved → Paid)
- [ ] Basic fraud rule engine (deterministic layer)
- [ ] 2-minute demo video

### Phase 3 - Scale & Optimise (Weeks 5–6)
- [ ] Isolation Forest anomaly model
- [ ] Syndicate detection (DBSCAN clustering)
- [ ] Play Integrity API integration
- [ ] Razorpay sandbox payout
- [ ] Worker dashboard (earnings protected, coverage status, payout history)
- [ ] Admin dashboard (loss ratios, cluster alerts, predictive weather)
- [ ] 5-minute demo video (simulated rainstorm → auto payout)
- [ ] Final pitch deck PDF

---

## Repository Structure

```
GIGSurance/
├── frontend/          # React PWA - Worker App
├── admin/             # React - Admin Dashboard
├── backend/           # FastAPI - API server
│   ├── routes/        # Auth, Policy, Claims, Payouts, Triggers
│   ├── services/      # Premium engine, Trigger monitor, Fraud scorer
│   └── db/            # PostgreSQL models + migrations
├── ml/                # Python ML services
│   ├── income_model/
│   ├── risk_model/
│   ├── fraud_model/
│   └── synthetic_data/
├── mocks/             # Mock APIs (platform data, curfew feeds)
└── docs/              # Architecture diagrams, API specs
```

---

## Team

- Pratyush Shrestha
- Prabin Devkota
- Divyesh Shanmugarajah
- Aayush Mainali
- Riwaj Adhikari

---

## Links

- 2-Minute Strategy Video: [Link](https://www.youtube.com/shorts/-SjKyOx1HKE)

---

> *Guidewire DEVTrails 2026 - Seed. Scale. Soar.*
