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

## Local Development

1. Install dependencies in `mobile-app`.
2. Ensure the backend is running.
3. Start the app with `npm run start`.

## Environment

The default API base URL is set in `app.json` under `expo.extra.apiBaseUrl`.

If that needs to change for local development, update `app.json` or introduce an Expo environment override in a later phase.
