# MVP Hardening Checklist

This phase is meant to validate the worker journey against real local seeded flows before adding richer features.

## Preconditions

The following services must be running:

- `mock/mock-api` on `http://127.0.0.1:4000`
- `ml` on `http://127.0.0.1:8000`
- `backend` on `http://127.0.0.1:5000`

Install dependencies first:

```powershell
cd backend
npm install
cd ..\mobile-app
npm install
```

Seed the backend portfolio:

```powershell
cd ..\backend
npm run seed:historical
```

## Real Worker Journey Validation

### 1. New signup

Validate:

- create a new worker account through `mobile-app`
- use a mock worker identity that exists in the operational dataset
- confirm post-signup session is authenticated

Expected:

- account created
- worker linked
- policy enrolled by backend signup flow
- premium generated or queued for the current week

### 2. Successful worker link

Validate:

- sign in with an account that has no linked worker
- link a valid `platformName` + `platformDriverId`

Expected:

- worker-link screen resolves successfully
- main worker flow becomes available

### 3. Active policy

Validate:

- coverage screen shows current policy
- policy state is readable as `Active`, `Paused`, or `Cancelled`

Expected:

- active seeded workers show `Active`
- enrollment screen is skipped for accounts that already have policy coverage

### 4. Weekly premium visible

Validate:

- home screen and premium screen show current premium
- premium history renders for seeded workers

Expected:

- INR amount visible
- timing context visible
- confidence/review metadata visible when present

### 5. Payout visible

Validate:

- payout screen shows latest payout if one exists
- payout history list renders seeded decisions

Expected:

- incident date visible
- amount visible
- approved / held / not eligible / failed state visible

### 6. Held / review state visible

Validate:

- dashboard and payout screens surface held or review-aware states when present
- activity timeline includes payout or review-aware entries

Expected:

- worker-facing warning language is shown
- no operator-only review tools leak into the worker app

## In-App Validation Surface

The home dashboard includes a worker-journey readiness summary derived from:

- user account state
- linked worker state
- current coverage
- current premium
- latest payout
- open review summary

Use that summary as the first-pass check that the seeded flow is actually represented in the UI.

## Blockers

If any of these are missing, the MVP is not hardened yet:

- backend not reachable
- mock API not reachable
- ML service not reachable
- no seeded policy/premium data
- session restore broken
- payout states not rendering
- review/held state not rendering
