# Gigsurance Admin Panel

`admin-panel` is the internal company finance and operations console for Gigsurance.

It uses the same UI language as `mock/mock-monitor` and focuses on:
- premium decisions and invoices
- payout liabilities
- finance summaries
- trust review visibility

This app intentionally has no login screen. It is meant for local/internal use as a read-only finance and monitoring surface.

## Stack

- React
- Vite
- React Router
- TanStack Query
- Lucide React

## Run

```bash
cd admin-panel
npm install
npm run dev
```

## Build

```bash
cd admin-panel
npm run build
```

## Env

Set the backend URL if needed:

```env
VITE_API_BASE_URL=http://127.0.0.1:5000
```

Default fallback is `http://127.0.0.1:5000`.

## Routes

- `/overview`
- `/premiums`
- `/payouts`
- `/finance`
- `/reviews`

Unknown routes redirect to `/overview`.

## Folder Structure

```text
admin-panel/
  src/
    app/
      App.jsx
    components/
      DetailPanel.jsx
      ObjectListTable.jsx
      PanelTable.jsx
      QueryState.jsx
      SparkBarList.jsx
      StatCard.jsx
    features/
      finance/
      layout/
      overview/
      payouts/
      premiums/
      reviews/
    lib/
      api/
        client.js
      query/
        queryClient.js
      utils/
        format.js
    main.jsx
    styles.css
```

## Backend Dependencies

The panel expects the backend to expose these routes:

- `GET /api/admin/dashboard`
- `GET /api/admin/queues/premiums`
- `GET /api/admin/queues/payouts`
- `GET /api/admin/queues/reviews`
- `GET /api/finance/dashboard`
- `GET /api/finance/summary`
- `GET /api/finance/snapshots/latest`
- `GET /api/fraud`

## UX Notes

- The shell, cards, tables, and ranked panels intentionally mirror `mock-monitor`.
- Row selection drives the detail panels on core operational routes.
- Premium, payout, and review routes include lightweight local filters.
- The panel is intentionally read-only.

## Current Scope

Done:
- monitor-style shell
- finance and company overview
- premium, payout, finance, and review routes
- row selection
- local no-login usage

Not included:
- auth/login flow
- deep charting beyond ranked panels
- CSV export
- advanced server-side filtering UI
- admin write workflows
