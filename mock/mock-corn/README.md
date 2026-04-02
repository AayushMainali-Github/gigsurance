# Mock Corn

Long-running incremental updater for the mock datasets.

It does not reseed the database. It keeps the existing collections moving forward:

- appends missing `weather_snapshots` every 30 minutes
- appends missing `aqi_snapshots` every 6 hours
- adds new delivery drivers once per city per day by tier
- appends fresh gigs to a sampled set of existing drivers each cycle

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
- weather and AQI generation follows the same formulas as the seeded mock-db generators
- delivery behavior follows the same platform and disruption logic as the seeded mock-db generators
- new drivers are added once per city per day using tier-based growth
- `tier1`: 4-5 new drivers per city per day
- `tier2`: 2-3 new drivers per city per day
- `tier3`: 1 new driver per city per day
- delivery appends only to a sampled set of drivers per cycle to keep the worker bounded
