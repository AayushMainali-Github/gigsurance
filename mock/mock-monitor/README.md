# Mock Monitor

React dashboard shell for monitoring the mock delivery, weather, and AQI systems through `mock-api`.

## Phase 1 Includes

- Vite + React app scaffold
- React Router page shell
- TanStack Query setup
- shared top-level filters
- API client wired to `mock-api`
- initial pages for Overview, Delivery Ops, Weather, and AQI
- placeholder routes for Platforms, Cities, Drivers, Live Orders, Maps, and Alerts

## Setup

```bash
npm install
```

Create `.env` from `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:4000
```

## Run

```bash
npm run dev
```

Default app URL:

- `http://localhost:5173`

## Current Routes

- `/overview`
- `/delivery`
- `/weather`
- `/aqi`
- `/platforms`
- `/cities`
- `/drivers`
- `/live`
- `/maps`
- `/alerts`

## Notes

This is the initial phase only. It is intentionally focused on:

- app structure
- route layout
- shared filtering
- stable API integration
- first working monitoring pages

Later phases will add charts, live orders, maps, drilldowns, and alerting.
