from __future__ import annotations

import json

from .config import MongoSettings
from .data_loader import MongoFeatureStore
from .feature_builders import build_feature_tables, load_cached_feature_tables, save_feature_tables_to_cache
from .earnings_forecast_model import EarningsForecaster
from .environment_forecast_model import EnvironmentForecaster
from .premium_model import save_premium_spec


def main() -> None:
    settings = MongoSettings.from_env()
    store = MongoFeatureStore(settings)
    try:
        print("[ml] checking feature cache...")
        feature_tables = load_cached_feature_tables(settings)
        if feature_tables is None:
            print("[ml] cache miss. loading feature tables from MongoDB...")
            feature_tables = build_feature_tables(store, include_daily=False)
            save_feature_tables_to_cache(settings, feature_tables)
            print("[ml] feature tables cached for future runs.")
        else:
            print("[ml] loaded feature tables from cache.")
        print(
            f"[ml] feature tables ready: weekly_rows={len(feature_tables.weekly_driver)}, "
            f"city_day_rows={len(feature_tables.city_day)}"
        )
        print("[ml] training environment forecast model...")
        environment = EnvironmentForecaster(settings.artifact_dir).train(feature_tables=feature_tables)
        print("[ml] training driver earnings forecast model...")
        earnings = EarningsForecaster(settings.artifact_dir).train(feature_tables=feature_tables)
        save_premium_spec(settings.artifact_dir)
        summary = {
            "mongo_uri": settings.mongo_uri,
            "db_name": settings.db_name,
            "artifact_dir": str(settings.artifact_dir),
            "weekly_rows": int(len(feature_tables.weekly_driver)),
            "city_day_rows": int(len(feature_tables.city_day)),
            "environment_forecast": environment,
            "earnings_forecast": earnings,
            "premium_engine": {
                "pricing_basis": "Trailing 12-week baseline + next 7-day environment forecast",
                "artifact": "premium_spec.json",
            },
        }
        summary_path = settings.artifact_dir / "training_summary.json"
        summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
        print("[ml] training complete. Summary:")
        print(json.dumps(summary, indent=2))
        print(f"[ml] saved summary to {summary_path}")
    finally:
        store.close()


if __name__ == "__main__":
    main()
