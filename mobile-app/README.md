# GIGSurance Mobile App

Worker-facing React Native app for GIGSurance.

## Scope

This app is intentionally limited to the gig-worker experience:

- authentication
- worker linking
- policy activation
- weekly premium visibility
- payout visibility
- account and coverage status

It does not include admin dashboards, monitoring surfaces, finance ops, or fraud-review tooling.

## Stack

- Expo
- React Native
- React Navigation
- TanStack Query
- Expo Secure Store
- Async Storage

## Design Direction

The mobile app inherits its visual language from `mock/mock-monitor/UI_DOCUMENTATION.md`, adapted for phone-first use.

Preserved rules:

- light neutral page backgrounds
- white, sharp-edged panels
- restrained semantic accents
- strong text hierarchy
- calm operational feel

Intentionally not copied:

- desktop sidebar layout
- monitoring dashboard information architecture
- dense operator-style tables as primary mobile patterns

## Local Development

1. Install dependencies in `mobile-app`.
2. Ensure the backend is running.
3. Start the app with `npm run start`.

## Local Stack Integration

For meaningful worker data, the local stack should be running in this order:

1. `mock/mock-api` on `http://127.0.0.1:4000`
2. `ml` on `http://127.0.0.1:8000`
3. `backend` on `http://127.0.0.1:5000`

If you want seeded worker accounts with existing policy, premium, and payout history, use the backend historical seed script after the dependent services are up:

```powershell
cd backend
npm run seed:historical
```

The seed script creates accounts using this pattern:

- email: `seeded+<platform>-<platformDriverId>@gigsurance.local`
- password: `SeededUser!123`

Example:

- `seeded+swiggy-swiggy-del-00000145@gigsurance.local`
- `SeededUser!123`

Use one of the seeded identities that exists in your seeded dataset. The mobile app will then show linked worker, policy, premium, payout, and activity data instead of placeholder-only empty states.

## Environment

The default API base URL is set in `app.json` under `expo.extra.apiBaseUrl`.

If that needs to change for local development, update `app.json` or introduce an Expo environment override in a later phase.
