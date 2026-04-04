from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from .config import FEATURE_CACHE_VERSION


AQI_BAND_SCORE = {
    "clean": 0.1,
    "elevated": 0.35,
    "poor": 0.6,
    "very_poor": 0.8,
    "severe": 1.0,
}

SHIFT_TO_HOURS = {
    "breakfast": 2.5,
    "lunch": 4.0,
    "evening": 5.0,
    "night": 4.0,
    "mixed": 8.0,
}


@dataclass(slots=True)
class FeatureTables:
    daily_driver: pd.DataFrame
    weekly_driver: pd.DataFrame
    city_day: pd.DataFrame


def _prepare_city_day(weather: pd.DataFrame, aqi: pd.DataFrame) -> pd.DataFrame:
    city_day = weather.merge(aqi, on=["city", "state", "date_key", "date"], how="outer")
    if city_day.empty:
        return city_day

    city_day = city_day.fillna(
        {
            "avg_temp_c": 0.0,
            "avg_feels_like_c": 0.0,
            "avg_humidity": 0.0,
            "max_rain_mm": 0.0,
            "avg_rain_mm": 0.0,
            "max_heat_risk": 0.0,
            "max_storm_risk": 0.0,
            "avg_weather_severity": 0.0,
            "avg_aqi": 0.0,
            "max_aqi": 0.0,
            "avg_pm25": 0.0,
            "avg_pm10": 0.0,
            "avg_aqi_severity": 0.0,
        }
    )
    city_day["trigger_event"] = (
        (city_day["max_rain_mm"] >= 25)
        | (city_day["max_heat_risk"] >= 0.85)
        | (city_day["max_aqi"] >= 400)
        | (city_day["avg_weather_severity"] >= 0.7)
    ).astype(int)
    city_day["combined_disruption_score"] = (
        0.45 * city_day["avg_weather_severity"]
        + 0.35 * city_day["avg_aqi_severity"]
        + 0.10 * (city_day["max_rain_mm"] / 25.0).clip(upper=1.0)
        + 0.10 * city_day["max_heat_risk"]
    ).clip(upper=1.0)
    city_day["dow"] = city_day["date"].dt.dayofweek
    city_day["month"] = city_day["date"].dt.month
    return city_day


def _build_driver_frames(driver: dict, city_day: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    history = driver.get("history") or []
    if not history:
        return pd.DataFrame(), pd.DataFrame()

    daily = pd.DataFrame(history)
    daily["date_key"] = daily["dateKey"]
    daily["date"] = pd.to_datetime(daily["date_key"], utc=True)
    daily["amountPaid"] = pd.to_numeric(daily["amountPaid"])
    daily["durationMinutes"] = pd.to_numeric(daily["durationMinutes"])
    daily["weatherSeverityHint"] = pd.to_numeric(daily["weatherSeverityHint"])
    daily["aqi_band_score"] = daily["aqiBandHint"].map(AQI_BAND_SCORE).fillna(0.2)

    grouped = daily.groupby("date_key", as_index=False).agg(
        gigs=("gigId", "count"),
        daily_income=("amountPaid", "sum"),
        avg_gig_income=("amountPaid", "mean"),
        avg_duration_minutes=("durationMinutes", "mean"),
        first_start_unix=("startTimeUnix", "min"),
        last_end_unix=("reachedTimeUnix", "max"),
        mean_weather_hint=("weatherSeverityHint", "mean"),
        mean_aqi_band_score=("aqi_band_score", "mean"),
    )
    grouped["active_hours"] = ((grouped["last_end_unix"] - grouped["first_start_unix"]) / 3_600_000).clip(lower=0)
    grouped["date"] = pd.to_datetime(grouped["date_key"], utc=True)
    grouped["week_start"] = grouped["date"].dt.floor("D") - pd.to_timedelta(grouped["date"].dt.dayofweek, unit="D")
    grouped["platform_name"] = driver["platformName"]
    grouped["platform_driver_id"] = driver["platformDriverId"]
    grouped["city"] = driver["city"]
    grouped["state"] = driver["state"]
    grouped["city_tier"] = driver["cityTier"]
    grouped["joined_at"] = pd.to_datetime(driver["joinedAt"], utc=True)
    profile = driver["driverProfile"]
    grouped["archetype"] = profile["archetype"]
    grouped["experience_bucket"] = profile["experienceBucket"]
    grouped["hours_preference_min"] = profile["hoursPreferenceMin"]
    grouped["hours_preference_max"] = profile["hoursPreferenceMax"]
    grouped["weather_sensitivity"] = profile["weatherSensitivity"]
    grouped["preferred_shift"] = profile["preferredShift"]
    grouped["resilience_score"] = profile["resilienceScore"]
    grouped["attendance_discipline"] = profile["attendanceDiscipline"]
    grouped["platform_loyalty_score"] = profile["platformLoyaltyScore"]
    grouped["preferred_hub_count"] = len(profile.get("preferredHubIds", []))
    grouped = grouped.merge(
        city_day.drop(columns=["state"], errors="ignore"),
        on=["city", "date_key", "date"],
        how="left",
    )
    grouped = grouped.sort_values(["platform_driver_id", "date"])
    grouped["dow"] = grouped["date"].dt.dayofweek
    grouped["month"] = grouped["date"].dt.month
    grouped["tenure_days"] = (grouped["date"] - grouped["joined_at"]).dt.days.clip(lower=0)

    weekly = (
        grouped.groupby(["platform_driver_id", "week_start"], as_index=False)
        .agg(
            city=("city", "first"),
            state=("state", "first"),
            city_tier=("city_tier", "first"),
            platform_name=("platform_name", "first"),
            archetype=("archetype", "first"),
            experience_bucket=("experience_bucket", "first"),
            weather_sensitivity=("weather_sensitivity", "first"),
            preferred_shift=("preferred_shift", "first"),
            resilience_score=("resilience_score", "first"),
            attendance_discipline=("attendance_discipline", "first"),
            platform_loyalty_score=("platform_loyalty_score", "first"),
            preferred_hub_count=("preferred_hub_count", "first"),
            tenure_days=("tenure_days", "max"),
            active_days=("date_key", "nunique"),
            weekly_income=("daily_income", "sum"),
            weekly_gigs=("gigs", "sum"),
            avg_gig_income=("avg_gig_income", "mean"),
            avg_duration_minutes=("avg_duration_minutes", "mean"),
            total_active_hours=("active_hours", "sum"),
            mean_weather_hint=("mean_weather_hint", "mean"),
            mean_aqi_band_score=("mean_aqi_band_score", "mean"),
            avg_weather_severity=("avg_weather_severity", "mean"),
            avg_aqi_severity=("avg_aqi_severity", "mean"),
            avg_aqi=("avg_aqi", "mean"),
            max_rain_mm=("max_rain_mm", "max"),
            max_heat_risk=("max_heat_risk", "max"),
            max_aqi=("max_aqi", "max"),
            avg_temp_c=("avg_temp_c", "mean"),
            avg_feels_like_c=("avg_feels_like_c", "mean"),
            avg_humidity=("avg_humidity", "mean"),
            avg_rain_mm=("avg_rain_mm", "mean"),
            max_storm_risk=("max_storm_risk", "max"),
            avg_pm25=("avg_pm25", "mean"),
            avg_pm10=("avg_pm10", "mean"),
            trigger_days=("trigger_event", "sum"),
            mean_combined_disruption=("combined_disruption_score", "mean"),
            dow=("dow", "last"),
            month=("month", "last"),
        )
        .sort_values(["platform_driver_id", "week_start"])
    )

    if not weekly.empty:
        weekly["avg_income_per_delivery"] = (weekly["weekly_income"] / weekly["weekly_gigs"].clip(lower=1)).fillna(0.0)
        weekly["active_hours_per_day"] = (weekly["total_active_hours"] / weekly["active_days"].clip(lower=1)).fillna(0.0)
        weekly["expected_shift_hours"] = weekly["preferred_shift"].map(SHIFT_TO_HOURS).fillna(4.0)
        weekly["disruption_income_ratio"] = (
            weekly["mean_combined_disruption"] * weekly["weekly_income"] / weekly["active_days"].clip(lower=1)
        ).fillna(0.0)
    return grouped, weekly


def _cache_key(settings) -> str:
    payload = {
        "mongo_uri": settings.mongo_uri,
        "db_name": settings.db_name,
        "include_version": FEATURE_CACHE_VERSION,
    }
    return hashlib.md5(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()[:12]


def _cache_paths(settings) -> dict[str, Path]:
    key = _cache_key(settings)
    base = settings.cache_dir
    return {
        "weekly": base / f"weekly_driver_{key}.pkl",
        "city_day": base / f"city_day_{key}.pkl",
        "meta": base / f"feature_cache_{key}.json",
    }


def load_cached_feature_tables(settings):
    paths = _cache_paths(settings)
    if not paths["weekly"].exists() or not paths["city_day"].exists():
        return None
    weekly = pd.read_pickle(paths["weekly"])
    city_day = pd.read_pickle(paths["city_day"])
    return FeatureTables(daily_driver=pd.DataFrame(), weekly_driver=weekly, city_day=city_day)


def save_feature_tables_to_cache(settings, feature_tables: FeatureTables) -> None:
    paths = _cache_paths(settings)
    feature_tables.weekly_driver.to_pickle(paths["weekly"])
    feature_tables.city_day.to_pickle(paths["city_day"])
    paths["meta"].write_text(
        json.dumps(
            {
                "weekly_rows": int(len(feature_tables.weekly_driver)),
                "city_day_rows": int(len(feature_tables.city_day)),
            },
            indent=2,
        ),
        encoding="utf-8",
    )


def build_feature_tables(store, include_daily: bool = False) -> FeatureTables:
    weather = store.load_weather_daily()
    aqi = store.load_aqi_daily()
    city_day = _prepare_city_day(weather, aqi)
    if city_day.empty:
        raise ValueError("No weather/AQI data found in MongoDB. Seed the mock database first.")

    daily_frames: list[pd.DataFrame] = []
    weekly_frames: list[pd.DataFrame] = []
    processed_drivers = 0
    for driver in store.iter_delivery_drivers():
        processed_drivers += 1
        if processed_drivers % 100 == 0:
            print(f"[ml] processed {processed_drivers} drivers...")
        grouped, weekly = _build_driver_frames(driver, city_day)
        if weekly.empty:
            continue
        weekly_frames.append(weekly)
        if include_daily and not grouped.empty:
            daily_frames.append(grouped)

    if not weekly_frames:
        raise ValueError("No delivery history found in MongoDB. Seed deliverydrivers first.")

    print(f"[ml] finished aggregating {processed_drivers} drivers.")
    weekly = pd.concat(weekly_frames, ignore_index=True)
    weekly["avg_income_per_delivery"] = (weekly["weekly_income"] / weekly["weekly_gigs"].clip(lower=1)).fillna(0.0)
    weekly["active_hours_per_day"] = (weekly["total_active_hours"] / weekly["active_days"].clip(lower=1)).fillna(0.0)
    weekly["expected_shift_hours"] = weekly["preferred_shift"].map(SHIFT_TO_HOURS).fillna(4.0)
    weekly["disruption_income_ratio"] = (
        weekly["mean_combined_disruption"] * weekly["weekly_income"] / weekly["active_days"].clip(lower=1)
    ).fillna(0.0)
    daily_driver = pd.concat(daily_frames, ignore_index=True) if include_daily and daily_frames else pd.DataFrame()
    return FeatureTables(daily_driver=daily_driver, weekly_driver=weekly, city_day=city_day)


def build_live_worker_feature_tables(store, worker_id: str, platform_name: str | None = None) -> FeatureTables:
    driver = store.get_delivery_driver(worker_id=worker_id, platform_name=platform_name)
    if not driver:
        raise ValueError(f"Worker {worker_id} not found in MongoDB.")

    weather = store.load_weather_daily_for_city(driver["city"], driver["state"])
    aqi = store.load_aqi_daily_for_city(driver["city"], driver["state"])
    city_day = _prepare_city_day(weather, aqi)
    if city_day.empty:
        raise ValueError(f"No weather/AQI history found for {driver['city']}, {driver['state']}.")

    daily_driver, weekly_driver = _build_driver_frames(driver, city_day)
    if weekly_driver.empty:
        raise ValueError(f"Worker {worker_id} has no delivery history in MongoDB.")
    return FeatureTables(daily_driver=daily_driver, weekly_driver=weekly_driver, city_day=city_day)
