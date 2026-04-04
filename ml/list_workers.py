from __future__ import annotations

import argparse
import json

from .config import MongoSettings
from .feature_builders import load_cached_feature_tables


def main() -> None:
    parser = argparse.ArgumentParser(description="List valid worker IDs from cached weekly features.")
    parser.add_argument("--limit", type=int, default=20, help="Number of worker IDs to return")
    parser.add_argument("--city", type=str, default=None, help="Optional city filter")
    parser.add_argument("--platform", type=str, default=None, help="Optional platform filter")
    args = parser.parse_args()

    settings = MongoSettings.from_env()
    feature_tables = load_cached_feature_tables(settings)
    if feature_tables is None:
        raise RuntimeError("Feature cache not found. Run `py -m ml.train_all` first.")

    weekly = feature_tables.weekly_driver.copy()
    latest = weekly.sort_values("week_start").groupby("platform_driver_id", as_index=False).tail(1)
    if args.city:
        latest = latest[latest["city"].str.lower() == args.city.lower()]
    if args.platform:
        latest = latest[latest["platform_name"].str.lower() == args.platform.lower()]

    rows = latest[["platform_driver_id", "city", "platform_name", "week_start"]].head(args.limit)
    print(json.dumps(rows.to_dict(orient="records"), indent=2, default=str))


if __name__ == "__main__":
    main()
