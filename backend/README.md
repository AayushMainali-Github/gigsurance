# Backend

Core insurance backend for GIGSurance.

This service is the system of record for:
- users and auth
- linked gig workers
- policies
- weekly premiums and invoices
- daily payouts and incidents
- finance ledger and reporting
- risk review workflows
- admin operations
- scheduler state and audit logs

It depends on:
- `mock-api/` for operational worker, weather, and AQI data
- `ml/` for premium and payout recommendations

## Stack

- Node.js
- Express
- MongoDB + Mongoose
- JWT auth
- node-cron
- Axios
- Zod
- Pino
- built-in `node:test`

## Setup

Create `.env` from `.env.example`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=
DB_NAME=
JWT_SECRET=
JWT_EXPIRES_IN=7d
MOCK_API_BASE_URL=http://127.0.0.1:4000
ML_API_BASE_URL=http://127.0.0.1:8000
ENABLE_SCHEDULER=true
JOB_LOCK_STALE_MS=900000
JOB_MAX_RETRIES=2
```

## Scripts

- `npm run dev`
- `npm run start`
- `npm run check`
- `npm test`
- `npm run test:unit`

## Folder Structure

```text
backend/
+-- server.js
+-- .env.example
+-- package.json
`-- src/
    +-- app.js
    +-- config/        # env, db, logger
    +-- constants/     # roles, job names
    +-- middleware/    # auth, admin, validation, error handling
    +-- models/        # mongoose models
    +-- modules/       # route/controller/service entry modules
    +-- routes/        # api router mount table
    +-- scheduler/     # cron bootstrap and job execution
    +-- services/      # ML, pricing, payouts, ledger, admin, audits
    +-- tests/         # node:test suites, helpers, fixtures
    `-- utils/         # jwt, dto, pagination, async helpers
```

## Main Models

- `User`
- `LinkedWorker`
- `Policy`
- `WeeklyPremiumDecision`
- `PremiumInvoice`
- `PremiumCollectionAttempt`
- `IncidentWindow`
- `DailyPayoutDecision`
- `PayoutTransaction`
- `LedgerEntry`
- `AccountBalanceSnapshot`
- `RiskReviewCase`
- `AuditLog`
- `ScheduledJobRun`

## Core Services

- `mlClient.js`
  - wraps ML quote and payout endpoints
  - retries, timeouts, normalized DTOs, fallback envelopes
- `mockApiClient.js`
  - wraps mock-api delivery, weather, and AQI reads
- `weeklyPremiumService.js`
  - Monday pricing workflow
- `dailyPayoutService.js`
  - daily payout workflow
- `incidentDetectionService.js`
  - derives payout incident windows from mock-api weather/AQI snapshots
- `ledgerService.js`
  - idempotent ledger writes and finance aggregations
- `riskReviewService.js`
  - creates and manages review cases
- `adminService.js`
  - admin dashboards, queues, overrides, exposure, search
- `jobRunService.js`
  - scheduler lock acquisition, heartbeat, completion, failure
- `explanationFormatter.js`
  - builds premium and payout explanation payloads

## API Surface

### Health

- `GET /api/health`
- `GET /api/ready`

### Auth

- `POST /api/auth/signup`
  - requires `email`, `password`, `platformName`, `platformDriverId`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### User

- `GET /api/users/me`

### Workers

- `POST /api/workers/link`
  - validates worker existence through mock-api
- `GET /api/workers`
- `GET /api/workers/primary`

### Policies

- `POST /api/policies/enroll`
- `POST /api/policies/pause`
- `POST /api/policies/cancel`
- `GET /api/policies`
- `GET /api/policies/current`
- `GET /api/policies/current/coverage`
- `GET /api/policies/current/weekly-risk`
- `GET /api/policies/current/review-status`

### Billing

- `GET /api/billing`
- `GET /api/billing/current`
- `GET /api/billing/history`
- `GET /api/billing/invoices`
- `GET /api/billing/next-due`
- `POST /api/billing/invoices/:invoiceId/pay`

### Payouts

- `GET /api/payouts`
- `GET /api/payouts/history`
- `GET /api/payouts/latest`
- `GET /api/payouts/:decisionId/receipt`
- `GET /api/payouts/incidents/history`

### Fraud / Review

- `GET /api/fraud`
- `GET /api/fraud/:caseId`
- `POST /api/fraud/:caseId/actions`

### Admin

- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `POST /api/admin/users/:userId/suspend`
- `POST /api/admin/users/:userId/notes`
- `GET /api/admin/policies`
- `GET /api/admin/queues/premiums`
- `GET /api/admin/queues/payouts`
- `GET /api/admin/queues/reviews`
- `GET /api/admin/exposure`
- `POST /api/admin/premiums/:decisionId/override`
- `POST /api/admin/payouts/:decisionId/override`

### ML Admin Preview

- `GET /api/ml/health`
- `POST /api/ml/quote/preview`
- `POST /api/ml/payout/preview`

### Audit + Finance

- `GET /api/audit`
- `GET /api/finance/summary`
- `GET /api/finance/snapshots/latest`
- `GET /api/finance/dashboard`

## Scheduler Jobs

- `daily-payout-run`
  - runs daily at `00:01`
  - evaluates yesterday incidents and creates payout decisions
- `weekly-premium-run`
  - runs Monday at `00:01`
  - prices active policies for the week
- `daily-reconciliation-run`
  - runs daily at `00:15`
  - snapshots balances and marks overdue invoices
- `stale-review-reminder-run`
  - runs daily at `00:30`
  - records reminders for stale open review cases

## Reliability Rules

- scheduler uses `scheduled_job_runs` as the durable lock and progress store
- each `jobName + scheduledFor` window is deduped
- stale running jobs can be safely reacquired
- decision writes are upserts on unique keys
- ledger writes are idempotent through explicit idempotency keys
- job progress is heartbeated with counts and cursor state

## Decision Archival

Premium and payout decisions store:
- model request payload
- model response payload
- normalized model decision
- backend-adjusted final decision snapshot
- penalty explanation
- admin override metadata when present

Audit logs can also store:
- request payload
- response payload
- explanation summary

## Finance Coverage

Ledger entry types supported:
- `premium_charged`
- `premium_paid`
- `premium_waived`
- `payout_approved`
- `payout_paid`
- `payout_held`
- `fraud_penalty_applied`
- `manual_adjustment`
- `refund`

Finance summaries expose:
- gross premiums billed
- premiums collected
- gross payouts approved
- payouts paid
- held liabilities
- net written premium
- claim ratio
- profit/loss

## Tests

The test suite is written with built-in `node:test` and fixture-driven stubs.

Operational data tests should stub `mockApiClient.js`, not direct collection models.

Coverage includes:
- auth service
- worker linking
- ML normalizers
- penalty rules
- weekly premium workflow
- daily payout workflow
- admin overrides
- finance aggregation
- scheduler lock and replay behavior

Fixtures include:
- insured users
- linked workers
- ML quote/payout payloads
- disrupted incident day
- flagged trust-score case
