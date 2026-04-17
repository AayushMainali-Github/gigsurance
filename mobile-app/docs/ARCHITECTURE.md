# Mobile App Architecture

## Runbook

1. Install dependencies:

```powershell
cd mobile-app
npm install
```

2. Start the local stack:

- `mock/mock-api` at `http://127.0.0.1:4000`
- `ml` at `http://127.0.0.1:8000`
- `backend` at `http://127.0.0.1:5000`

3. Start the app:

```powershell
npm run start
```

4. Optional: seed historical worker data:

```powershell
cd ..\backend
npm run seed:historical
```

## Environment

The app reads its backend base URL from `app.json`:

- `expo.extra.apiBaseUrl`

Default:

- `http://127.0.0.1:5000`

## Dependencies

The mobile app depends on:

- backend auth and worker routes
- backend worker aggregate routes
- backend billing and payout routes
- seeded MongoDB data in backend collections
- mock API indirectly via worker linking and historical seeding
- ML service indirectly via backend premium and payout decisions

## Endpoints Used

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### User / Aggregates

- `GET /api/users/me`
- `GET /api/users/me/dashboard`
- `GET /api/users/me/policy-summary`

### Workers

- `GET /api/workers`
- `GET /api/workers/primary`
- `POST /api/workers/link`

### Policies

- `GET /api/policies/current`
- `POST /api/policies/enroll`

### Billing

- `GET /api/billing/current`
- `GET /api/billing/history`

### Payouts

- `GET /api/payouts`
- `GET /api/payouts/history`
- `GET /api/payouts/latest`

## Supported Features

- signup and login
- session restore
- worker linking
- policy activation
- worker dashboard
- weekly premium view
- payout history
- activity timeline
- minimal account/profile view
- loading, empty, failure, and session-expiry handling

## Intentionally Excluded

- admin dashboards
- fraud review tooling
- finance operations
- manual overrides
- support chat
- KYC workflows
- bank management
- user preferences
- claims filing
- delivery-denominated pricing without reliable backend support

## Testing

Run:

```powershell
npm test
```

The current testing pass covers:

- auth/session gating logic
- worker linking feedback logic
- policy enrollment messaging logic
- dashboard view-model logic
- payout list view-model logic
- API error helper behavior
