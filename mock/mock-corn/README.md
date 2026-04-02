# Mock Corn

Long-running incremental updater for the mock datasets.

It does not reseed the database. It keeps the existing collections moving forward:

- appends missing `weather_snapshots` every 30 minutes
- appends missing `aqi_snapshots` every 6 hours
- adds a few new delivery drivers each cycle
- appends fresh gigs to a sampled set of existing drivers

## Setup

```bash
npm install
```

Create `.env` from `.env.example`.

## Run

```bash
npm run dev
```

One-shot catch-up tick:

```bash
npm run tick
```

## Notes

- weather and AQI jobs backfill any missing slots up to the current time
- delivery job is incremental, not a full rebuild
- delivery appends only to a sampled set of drivers per cycle to keep the worker bounded
- new drivers are added gradually using city and tier-weighted platform mix
