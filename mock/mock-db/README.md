# Mock DB

Deterministic synthetic data generators for the India gig-worker insurance mock-data project.

This folder seeds three interrelated MongoDB collections:

- `deliverydrivers`
- `weather_snapshots`
- `aqi_snapshots`

The generators are fully offline. No live APIs are called.

## Stack

- Node.js
- MongoDB
- Mongoose
- `dayjs`
- `seedrandom`
- `bson`
- `@faker-js/faker`

## What Gets Generated

### 1. Delivery Drivers

Seeded by [delivery-db.js](/C:/Users/ACER/OneDrive/Desktop/coding/maintained/gigsurance/mock/mock-db/delivery-db.js)

Each document represents one driver and includes:

- platform metadata
- city and tier
- join date
- driver profile traits
- embedded `history` array of completed gigs

Each gig stores:

- `gigId`
- `amountPaid`
- `startTimeUnix`
- `reachedTimeUnix`
- `pickup`
- `drop`
- `durationMinutes`
- `dateKey`
- `weatherSeverityHint`
- `aqiBandHint`

### 2. Weather Snapshots

Seeded by [weather-db.js](/C:/Users/ACER/OneDrive/Desktop/coding/maintained/gigsurance/mock/mock-db/weather-db.js)

- 100 Indian cities
- 30-minute cadence
- last 24 months

Includes seasonality, monsoon clustering, humidity, storms, heat, and severity scoring.

### 3. AQI Snapshots

Seeded by [aqi-db.js](/C:/Users/ACER/OneDrive/Desktop/coding/maintained/gigsurance/mock/mock-db/aqi-db.js)

- 100 Indian cities
- 6-hour cadence
- last 24 months

Includes city baselines, regional effects, winter degradation in north India, and rare spikes.

## Interrelation Logic

The data is intentionally correlated.

Generation order:

1. weather
2. AQI
3. disruption layer
4. delivery history

The disruption engine derives city-day effects from persisted weather and AQI data:

- `weatherImpactScore`
- `aqiImpactScore`
- `combinedDisruptionScore`
- `strikeFlag`
- `shutdownFlag`

Delivery generation uses those signals to affect:

- whether a driver works that day
- active hours worked
- trip duration inflation
- surge probability and payout uplift
- weather and AQI hints attached to gigs

Delivery history now aligns to the same 24-month window as weather and AQI, so all generated gigs can be directly correlated against persisted environmental data.

## City Model

The city configuration lives in [config/cities.js](/C:/Users/ACER/OneDrive/Desktop/coding/maintained/gigsurance/mock/mock-db/config/cities.js).

Each city stores:

- `city`
- `state`
- `tier`
- `centerLat`
- `centerLng`
- `radiusKm`
- `weight`
- regional climate helpers used by the generators

Driver allocation is weighted and sums exactly to the configured total.

## Platforms

Configured in [config/platforms.js](/C:/Users/ACER/OneDrive/Desktop/coding/maintained/gigsurance/mock/mock-db/config/platforms.js):

- `blinkit`
- `zepto`
- `instamart`
- `zomato`
- `swiggy`
- `swish`
- `porter`

Tier-wise platform mix is different:

- `tier1`: stronger quick-commerce
- `tier2`: balanced
- `tier3`: more `swiggy` / `zomato` / `porter`

## Folder Structure

```text
mock-db/
  aqi-db.js
  delivery-db.js
  weather-db.js
  config/
  generators/
  models/
  utils/
  validators/
  .env.example
  package.json
```

## Setup

Install dependencies:

```bash
npm install
```

Create `.env` from [.env.example](/C:/Users/ACER/OneDrive/Desktop/coding/maintained/gigsurance/mock/mock-db/.env.example):

```env
MONGO_URI=
DB_NAME=
SEED=42
DRIVER_COUNT=100000
DELIVERY_MONTHS=24
ENV_MONTHS=24
BATCH_SIZE=1000
```

## Scripts

Available npm scripts from [package.json](/C:/Users/ACER/OneDrive/Desktop/coding/maintained/gigsurance/mock/mock-db/package.json):

```bash
npm run seed:weather
npm run seed:aqi
npm run seed:delivery
npm run seed:all
```

Recommended order:

```bash
npm run seed:weather
npm run seed:aqi
npm run seed:delivery
```

Or:

```bash
npm run seed:all
```

## CLI Usage

### Weather

```bash
node weather-db.js --seed
node weather-db.js --seed --city Bengaluru
node weather-db.js --seed --dry-run
node weather-db.js --seed --clear
```

### AQI

```bash
node aqi-db.js --seed
node aqi-db.js --seed --city Delhi
node aqi-db.js --seed --dry-run
node aqi-db.js --seed --clear
```

### Delivery

```bash
node delivery-db.js --seed
node delivery-db.js --seed --city Bengaluru
node delivery-db.js --seed --limit 1000
node delivery-db.js --seed --dry-run
node delivery-db.js --seed --clear
```

## Important Config

### `SEED`

Controls deterministic generation. The same seed produces the same synthetic patterns.

### `DRIVER_COUNT`

Total number of drivers to generate. Default is `100000`.

### `DELIVERY_MONTHS`

How much delivery history to generate. Default is `24`.

### `ENV_MONTHS`

How much weather and AQI history to generate. Default is `24`.

### `BATCH_SIZE`

The number of `bulkWrite` operations flushed to MongoDB per batch.

- larger batch: faster, more memory
- smaller batch: slower, less memory

Default is `1000`.

## BSON Safety Guard

Delivery history is embedded inside each driver document by design.

To prevent oversized MongoDB documents:

- BSON size is estimated before write using `bson`
- documents are kept below a 12 MiB safety threshold
- if a generated driver grows too large, older parts of the history are compacted
- oversized documents are not inserted

Relevant logic is in [generators/deliveryGenerator.js](/C:/Users/ACER/OneDrive/Desktop/coding/maintained/gigsurance/mock/mock-db/generators/deliveryGenerator.js).

## Indexes

### `deliverydrivers`

- unique: `platformName + platformDriverId`
- `city`
- `cityTier`
- `history.dateKey`

### `weather_snapshots`

- unique: `city + tsUnix`
- `tsUnix`
- `city`

### `aqi_snapshots`

- unique: `city + tsUnix`
- `tsUnix`
- `city`

## Validation and Reporting

After non-dry seeding, the utilities print sanity checks such as:

- total driver count
- top cities by driver count
- drivers by platform
- average tenure by platform
- average gigs/day by platform
- average payout and duration by platform
- no-work percentages for normal vs disrupted city-days
- top disrupted city-days
- duplicate slot checks for weather and AQI
- compacted oversized-driver count

Validation helpers live in [validators/reporting.js](/C:/Users/ACER/OneDrive/Desktop/coding/maintained/gigsurance/mock/mock-db/validators/reporting.js).

## Notes

- `traffic-db.js` is currently ignored.
- The generators are rerunnable because writes use upserts.
- `--clear` can be used to wipe the relevant collection before reseeding.
- `--dry-run` runs generation logic without writing data.
