from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime, timezone

import pandas as pd
from pymongo import MongoClient

from .config import MongoSettings


def utc_from_millis(ts_unix: int) -> datetime:
    return datetime.fromtimestamp(ts_unix / 1000, tz=timezone.utc)


class MongoFeatureStore:
    def __init__(self, settings: MongoSettings):
        self.settings = settings
        self.client = MongoClient(settings.mongo_uri)
        self.db = self.client[settings.db_name]

    def close(self) -> None:
        self.client.close()

    def load_weather_daily(self) -> pd.DataFrame:
        return self._load_weather_daily()

    def _load_weather_daily(self, city: str | None = None, state: str | None = None) -> pd.DataFrame:
        match_stage = {}
        if city is not None:
            match_stage["city"] = city
        if state is not None:
            match_stage["state"] = state
        pipeline = [
            *([{"$match": match_stage}] if match_stage else []),
            {
                "$group": {
                    "_id": {
                        "city": "$city",
                        "state": "$state",
                        "dateKey": {
                            "$dateToString": {
                                "format": "%Y-%m-%d",
                                "date": {"$toDate": "$tsUnix"},
                                "timezone": "UTC",
                            }
                        },
                    },
                    "avg_temp_c": {"$avg": "$tempC"},
                    "avg_feels_like_c": {"$avg": "$feelsLikeC"},
                    "avg_humidity": {"$avg": "$humidity"},
                    "max_rain_mm": {"$max": "$rainMm"},
                    "avg_rain_mm": {"$avg": "$rainMm"},
                    "max_heat_risk": {"$max": "$heatRisk"},
                    "max_storm_risk": {"$max": "$stormRisk"},
                    "avg_weather_severity": {"$avg": "$weatherSeverityScore"},
                }
            }
        ]
        rows = list(self.db.weather_snapshots.aggregate(pipeline, allowDiskUse=True))
        if not rows:
            return pd.DataFrame()
        frame = pd.DataFrame(
            {
                "city": [row["_id"]["city"] for row in rows],
                "state": [row["_id"]["state"] for row in rows],
                "date_key": [row["_id"]["dateKey"] for row in rows],
                "avg_temp_c": [row["avg_temp_c"] for row in rows],
                "avg_feels_like_c": [row["avg_feels_like_c"] for row in rows],
                "avg_humidity": [row["avg_humidity"] for row in rows],
                "max_rain_mm": [row["max_rain_mm"] for row in rows],
                "avg_rain_mm": [row["avg_rain_mm"] for row in rows],
                "max_heat_risk": [row["max_heat_risk"] for row in rows],
                "max_storm_risk": [row["max_storm_risk"] for row in rows],
                "avg_weather_severity": [row["avg_weather_severity"] for row in rows],
            }
        )
        frame["date"] = pd.to_datetime(frame["date_key"], utc=True)
        return frame

    def load_weather_daily_for_city(self, city: str, state: str) -> pd.DataFrame:
        return self._load_weather_daily(city=city, state=state)

    def load_aqi_daily(self) -> pd.DataFrame:
        return self._load_aqi_daily()

    def _load_aqi_daily(self, city: str | None = None, state: str | None = None) -> pd.DataFrame:
        match_stage = {}
        if city is not None:
            match_stage["city"] = city
        if state is not None:
            match_stage["state"] = state
        pipeline = [
            *([{"$match": match_stage}] if match_stage else []),
            {
                "$group": {
                    "_id": {
                        "city": "$city",
                        "state": "$state",
                        "dateKey": {
                            "$dateToString": {
                                "format": "%Y-%m-%d",
                                "date": {"$toDate": "$tsUnix"},
                                "timezone": "UTC",
                            }
                        },
                    },
                    "avg_aqi": {"$avg": "$aqi"},
                    "max_aqi": {"$max": "$aqi"},
                    "avg_pm25": {"$avg": "$pm25"},
                    "avg_pm10": {"$avg": "$pm10"},
                    "avg_aqi_severity": {"$avg": "$severityScore"},
                }
            }
        ]
        rows = list(self.db.aqi_snapshots.aggregate(pipeline, allowDiskUse=True))
        if not rows:
            return pd.DataFrame()
        frame = pd.DataFrame(
            {
                "city": [row["_id"]["city"] for row in rows],
                "state": [row["_id"]["state"] for row in rows],
                "date_key": [row["_id"]["dateKey"] for row in rows],
                "avg_aqi": [row["avg_aqi"] for row in rows],
                "max_aqi": [row["max_aqi"] for row in rows],
                "avg_pm25": [row["avg_pm25"] for row in rows],
                "avg_pm10": [row["avg_pm10"] for row in rows],
                "avg_aqi_severity": [row["avg_aqi_severity"] for row in rows],
            }
        )
        frame["date"] = pd.to_datetime(frame["date_key"], utc=True)
        return frame

    def load_aqi_daily_for_city(self, city: str, state: str) -> pd.DataFrame:
        return self._load_aqi_daily(city=city, state=state)

    def iter_delivery_drivers(self, batch_size: int = 100) -> Iterable[dict]:
        projection = {
            "_id": 0,
            "platformName": 1,
            "platformDriverId": 1,
            "city": 1,
            "state": 1,
            "cityTier": 1,
            "joinedAt": 1,
            "driverProfile": 1,
            "history": 1,
        }
        cursor = self.db.deliverydrivers.find({}, projection=projection, no_cursor_timeout=True).batch_size(batch_size)
        try:
            for doc in cursor:
                yield doc
        finally:
            cursor.close()

    def get_delivery_driver(self, worker_id: str, platform_name: str | None = None) -> dict | None:
        projection = {
            "_id": 0,
            "platformName": 1,
            "platformDriverId": 1,
            "city": 1,
            "state": 1,
            "cityTier": 1,
            "joinedAt": 1,
            "driverProfile": 1,
            "history": 1,
        }
        query: dict[str, object] = {"platformDriverId": worker_id}
        if platform_name:
            query["platformName"] = platform_name
        return self.db.deliverydrivers.find_one(query, projection=projection)
