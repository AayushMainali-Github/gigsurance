# Mock API

Express read API for the seeded MongoDB mock datasets in `mock-db`.

## Setup

```bash
npm install
```

Create `.env` from `.env.example`:

```env
MONGO_URI=
DB_NAME=
PORT=4000
```

## Run

```bash
npm run dev
```

Server starts on `http://localhost:4000` by default.

## Endpoints

### Health

- `GET /health`

### Metadata

- `GET /api/overview`
- `GET /api/platforms`
- `GET /api/cities`
- `GET /api/cities/:city/dashboard`

### Delivery

- `GET /api/delivery/drivers`
- `GET /api/delivery/drivers/:platformName/:platformDriverId`
- `GET /api/delivery/summary`
- `GET /api/delivery/cities/:city/summary`
- `GET /api/delivery/platforms/:platformName/summary`

### Weather

- `GET /api/weather/snapshots`
- `GET /api/weather/latest`
- `GET /api/weather/cities/:city/timeseries`

### AQI

- `GET /api/aqi/snapshots`
- `GET /api/aqi/latest`
- `GET /api/aqi/cities/:city/timeseries`

## Common Query Params

List endpoints support the usual pagination pattern:

- `page`
- `limit`
- `sortBy`
- `order=asc|desc`

Time-series endpoints also support:

- `tsFrom`
- `tsTo`

## Delivery Filters

`GET /api/delivery/drivers`

Supported filters:

- `city`
- `state`
- `platformName`
- `cityTier`
- `archetype`
- `experienceBucket`
- `weatherSensitivity`
- `page`
- `limit`
- `sortBy=joinedAt|city|platformName`
- `order=asc|desc`

Example:

```bash
curl "http://localhost:4000/api/delivery/drivers?city=Mumbai&platformName=zepto&limit=10"
```

Driver detail endpoint supports:

- `historyLimit`

Example:

```bash
curl "http://localhost:4000/api/delivery/drivers/zepto/ZEPTO-MUM-00000007?historyLimit=100"
```

## Delivery Summary Usage

Examples:

```bash
curl "http://localhost:4000/api/delivery/summary"
curl "http://localhost:4000/api/delivery/summary?city=Mumbai"
curl "http://localhost:4000/api/delivery/cities/Mumbai/summary"
curl "http://localhost:4000/api/delivery/platforms/swiggy/summary"
```

## Weather Usage

Examples:

```bash
curl "http://localhost:4000/api/weather/latest"
curl "http://localhost:4000/api/weather/latest?city=Mumbai"
curl "http://localhost:4000/api/weather/snapshots?city=Mumbai&limit=20"
curl "http://localhost:4000/api/weather/cities/Mumbai/timeseries?limit=48"
```

Filters for `GET /api/weather/snapshots`:

- `city`
- `state`
- `conditionMain`
- `tsFrom`
- `tsTo`
- `page`
- `limit`
- `sortBy=tsUnix|tempC|weatherSeverityScore`
- `order=asc|desc`

## AQI Usage

Examples:

```bash
curl "http://localhost:4000/api/aqi/latest"
curl "http://localhost:4000/api/aqi/latest?city=Delhi"
curl "http://localhost:4000/api/aqi/snapshots?city=Delhi&category=severe&limit=20"
curl "http://localhost:4000/api/aqi/cities/Delhi/timeseries?limit=60"
```

Filters for `GET /api/aqi/snapshots`:

- `city`
- `state`
- `category`
- `tsFrom`
- `tsTo`
- `page`
- `limit`
- `sortBy=tsUnix|aqi|severityScore`
- `order=asc|desc`
