# Mock Monitor

React operations dashboard for the India gig-worker insurance mock system.

`mock-monitor` sits on top of `mock-api` and provides a browser-based monitoring surface for:

- delivery operations
- live order flow
- weather conditions
- AQI conditions
- city and platform drilldowns
- disruption analytics
- operational alerts
- geospatial monitoring
- driver risk and exposure views

It does not write data. It is a read-only monitor over the seeded and incrementally updated mock collections.

## Stack

- React
- Vite
- React Router
- TanStack Query
- Zustand
- Recharts
- Leaflet + React Leaflet
- Day.js

## Prerequisites

This app depends on:

- `mock-db` having seeded data in MongoDB
- `mock-api` running and connected to the same database

If you are also running rolling updates, `mock-corn` can keep the data moving forward.

## Setup

From `mock/mock-monitor`:

```bash
npm install
```

Create `.env` from `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:4000
```

## Run

Development:

```bash
npm run dev
```

Production build:

```bash
npm run build
```

Preview built app:

```bash
npm run preview
```

Default local URL:

- `http://localhost:5173`

## Routes

- `/overview`
- `/delivery`
- `/weather`
- `/aqi`
- `/platforms`
- `/cities`
- `/drivers`
- `/live`
- `/analytics`
- `/maps`
- `/alerts`

## Global Filters

The top filter bar is shared across the monitor and controls:

- `city`
- `platformName`
- `state`

Filters are persisted in the URL query string, so views are:

- reload-safe
- shareable
- consistent across pages

Example:

```text
/analytics?city=Mumbai&platformName=swiggy
```

## Feature Areas

### Overview

High-level network posture:

- total drivers
- tracked cities
- weather and AQI severity summaries
- top cities
- platform mix
- gig economics

### Delivery Ops

Operational delivery summary:

- filtered driver counts
- platform distribution
- gig metrics
- driver slice table

### Weather

Weather monitoring:

- latest city weather
- recent weather snapshots
- severity, rain, and heat-related state

### AQI

Air quality monitoring:

- latest city AQI
- recent AQI snapshots
- severe city counts
- category and severity views

### Platforms

Platform drilldown:

- platform-level driver totals
- top operating cities
- gig metrics by platform

### Cities

City drilldown:

- driver count
- platform mix
- latest weather
- latest AQI
- city-level delivery summary

### Drivers

Driver inspection and risk:

- driver browser
- profile view
- recent history
- risk score
- risk band
- exposure summary
- recent daily trend charts

Driver risk is derived from:

- weather exposure hints
- AQI exposure hints
- long-trip share
- payout strength
- attendance discipline
- resilience score
- weather sensitivity

### Live Orders

Live operations page backed by inferred rolling-window orders:

- active orders
- recent deliveries
- recent pickups
- city breakdown
- platform breakdown
- live feed
- recent completion queue

Polling cadence:

- live orders: 15s
- live metrics: 30s

### Analytics

Joined city-day analytics over delivery, weather, and AQI:

- disruption vs duration charts
- gig volume vs payout charts
- disruption correlation cloud
- top disruption days
- top duration days
- city-day ledger

This page uses backend analytics endpoints that join delivery history to weather and AQI by `city + dateKey`.

### Maps

India operations map with multiple overlays:

- drivers
- weather
- AQI
- live orders
- disruption

Selected city panels expose:

- fleet size
- live order load
- disruption score
- top platform
- recent gig activity

### Alerts

Derived operational alert feed:

- weather alerts
- AQI alerts
- live capacity alerts
- duration spike alerts
- city concentration alerts
- platform concentration alerts

Current alerts are frontend-derived from live metrics and latest environmental conditions.

## API Dependencies

`mock-monitor` expects `mock-api` to expose at least:

- `GET /api/overview`
- `GET /api/platforms`
- `GET /api/cities`
- `GET /api/cities/:city/dashboard`
- `GET /api/delivery/drivers`
- `GET /api/delivery/drivers/:platformName/:platformDriverId`
- `GET /api/delivery/summary`
- `GET /api/delivery/cities/:city/summary`
- `GET /api/delivery/platforms/:platformName/summary`
- `GET /api/weather/latest`
- `GET /api/weather/snapshots`
- `GET /api/aqi/latest`
- `GET /api/aqi/snapshots`
- `GET /api/live/orders`
- `GET /api/live/metrics`
- `GET /api/analytics/city-day`
- `GET /api/analytics/correlations`
- `GET /api/analytics/driver-risk/:platformName/:platformDriverId`

## Architecture Notes

- TanStack Query is used for server data fetching and caching.
- Zustand holds shared filter state.
- Heavy routes are lazy-loaded.
- Vite manual chunking is configured for:
  - vendor libraries
  - charts
  - map libraries

This keeps the main bundle smaller while loading heavy monitoring surfaces on demand.

## Important Implementation Notes

- The app is read-only.
- No direct MongoDB access happens from the browser.
- All data comes through `mock-api`.
- Live orders are inferred from delivery history windows, not stored as a separate live-orders collection.
- Alerts are currently derived in the frontend, not served from a dedicated alerts backend.

## Current Gaps

Core monitoring is in place. Remaining work is mostly polish or scaling work:

- table virtualization for very large result sets
- optional backend-generated alerts
- optional SSE/websocket live push
- extra export/reporting workflows

## Scripts

- `npm run dev`
- `npm run build`
- `npm run preview`
