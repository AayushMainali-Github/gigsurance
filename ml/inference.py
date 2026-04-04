from __future__ import annotations

import argparse
import json

import pandas as pd

from .config import MongoSettings
from .data_loader import MongoFeatureStore
from .feature_builders import FeatureTables, build_live_worker_feature_tables, load_cached_feature_tables
from .payout_model import PayoutEngine
from .premium_model import PremiumEngine


def _load_worker_feature_tables(worker_id: str, platform_name: str | None = None) -> tuple[MongoSettings, FeatureTables]:
    settings = MongoSettings.from_env()
    cached_feature_tables = load_cached_feature_tables(settings)
    store = MongoFeatureStore(settings)
    try:
        live_worker_tables = build_live_worker_feature_tables(store, worker_id=worker_id, platform_name=platform_name)
    finally:
        store.close()

    if cached_feature_tables is not None:
        city = str(live_worker_tables.weekly_driver.iloc[-1]["city"])
        state = str(live_worker_tables.weekly_driver.iloc[-1]["state"])
        city_context = cached_feature_tables.weekly_driver[
            (cached_feature_tables.weekly_driver["city"] == city)
            & (cached_feature_tables.weekly_driver["state"] == state)
            & (cached_feature_tables.weekly_driver["platform_driver_id"] != worker_id)
        ].copy()
        feature_tables = FeatureTables(
            daily_driver=live_worker_tables.daily_driver,
            weekly_driver=pd.concat([city_context, live_worker_tables.weekly_driver], ignore_index=True),
            city_day=cached_feature_tables.city_day
            if not cached_feature_tables.city_day.empty
            else live_worker_tables.city_day,
        )
    else:
        feature_tables = live_worker_tables
    return settings, feature_tables


def build_worker_response(
    worker_id: str,
    platform_name: str | None = None,
    no_claim_weeks: int = 0,
    horizon_days: int = 7,
    forecast_overrides: dict | None = None,
) -> dict:
    settings, feature_tables = _load_worker_feature_tables(worker_id=worker_id, platform_name=platform_name)
    premium_engine = PremiumEngine(settings.artifact_dir)

    return premium_engine.quote_worker(
        worker_id=worker_id,
        platform_name=platform_name,
        feature_tables=feature_tables,
        horizon_days=horizon_days,
        no_claim_weeks=no_claim_weeks,
        forecast_overrides=forecast_overrides or {},
    )


def build_payout_response(
    worker_id: str,
    platform_name: str | None = None,
    affected_days: int = 1,
    no_claim_weeks: int = 0,
    horizon_days: int = 1,
    forecast_overrides: dict | None = None,
    verified_incident: bool = False,
    loss_ratio_override: float | None = None,
    incident_city: str | None = None,
    incident_state: str | None = None,
    days_since_enrollment: int | None = None,
) -> dict:
    settings, feature_tables = _load_worker_feature_tables(worker_id=worker_id, platform_name=platform_name)
    payout_engine = PayoutEngine(settings.artifact_dir)
    return payout_engine.assess_worker_payout(
        worker_id=worker_id,
        platform_name=platform_name,
        feature_tables=feature_tables,
        horizon_days=horizon_days,
        affected_days=affected_days,
        no_claim_weeks=no_claim_weeks,
        forecast_overrides=forecast_overrides or {},
        verified_incident=verified_incident,
        loss_ratio_override=loss_ratio_override,
        incident_city=incident_city,
        incident_state=incident_state,
        days_since_enrollment=days_since_enrollment,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Run premium inference for a single worker.")
    parser.add_argument("--worker-id", required=True, help="platform_driver_id from cached weekly features")
    parser.add_argument("--platform", help="Optional platform validation like zomato or swiggy")
    parser.add_argument("--no-claim-weeks", type=int, default=0, help="Optional loyalty discount input")
    parser.add_argument("--horizon-days", type=int, default=7, help="Weather forecast horizon used for pricing")
    args = parser.parse_args()
    print(
        json.dumps(
            build_worker_response(
                args.worker_id,
                platform_name=args.platform,
                no_claim_weeks=args.no_claim_weeks,
                horizon_days=args.horizon_days,
            ),
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
