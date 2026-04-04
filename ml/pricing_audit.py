from __future__ import annotations

import argparse
import json
import math
import random
from collections.abc import Iterable

import pandas as pd

from .config import MongoSettings
from .feature_builders import load_cached_feature_tables
from .premium_model import PremiumEngine


def _latest_workers(weekly: pd.DataFrame, platform: str | None, city_tier: str | None) -> pd.DataFrame:
    latest = weekly.sort_values("week_start").groupby("platform_driver_id", as_index=False).tail(1).copy()
    if platform:
        latest = latest[latest["platform_name"].str.lower() == platform.lower()]
    if city_tier:
        latest = latest[latest["city_tier"].str.lower() == city_tier.lower()]
    return latest.sort_values(["city", "platform_name", "platform_driver_id"]).reset_index(drop=True)


def _sample_workers(latest: pd.DataFrame, limit: int, seed: int) -> pd.DataFrame:
    if len(latest) <= limit:
        return latest.copy()
    return latest.sample(n=limit, random_state=seed).sort_values(["city", "platform_name", "platform_driver_id"]).reset_index(
        drop=True
    )


def _quantiles(series: pd.Series) -> dict[str, float]:
    clean = series.dropna().astype(float)
    if clean.empty:
        return {}
    return {
        "min": round(float(clean.min()), 2),
        "p10": round(float(clean.quantile(0.10)), 2),
        "p25": round(float(clean.quantile(0.25)), 2),
        "median": round(float(clean.quantile(0.50)), 2),
        "p75": round(float(clean.quantile(0.75)), 2),
        "p90": round(float(clean.quantile(0.90)), 2),
        "p95": round(float(clean.quantile(0.95)), 2),
        "max": round(float(clean.max()), 2),
        "mean": round(float(clean.mean()), 2),
    }


def _summarize_group(rows: pd.DataFrame) -> dict[str, object]:
    return {
        "count": int(len(rows)),
        "premium_inr": _quantiles(rows["premium_inr"]),
        "premium_share_of_income_pct": _quantiles(rows["premium_share_of_income_pct"]),
        "forecast_event_pressure": _quantiles(rows["forecast_event_pressure"]),
        "expected_shortfall_share_pct": _quantiles(rows["expected_shortfall_share_pct"]),
        "risk_mix": {str(k): int(v) for k, v in rows["risk_label"].value_counts().to_dict().items()},
    }


def _group_summary(rows: pd.DataFrame, column: str) -> dict[str, dict[str, object]]:
    summary: dict[str, dict[str, object]] = {}
    for key, group in rows.groupby(column):
        summary[str(key)] = _summarize_group(group)
    return summary


def _outlier_rows(rows: pd.DataFrame, limit: int) -> list[dict[str, object]]:
    cols = [
        "platform_driver_id",
        "platform_name",
        "city",
        "state",
        "city_tier",
        "premium_inr",
        "premium_share_of_income_pct",
        "predicted_next_week_income_inr",
        "expected_income_shortfall_inr",
        "expected_shortfall_share_pct",
        "forecast_event_pressure",
        "aria_total",
        "risk_label",
        "quote_confidence_score",
        "quote_confidence_band",
    ]
    ordered = rows.sort_values(["premium_inr", "premium_share_of_income_pct"], ascending=[False, False])[cols].head(limit)
    payload = ordered.to_dict(orient="records")
    for item in payload:
        for key, value in list(item.items()):
            if isinstance(value, float):
                item[key] = round(value, 2)
    return payload


def _format_worker_quote(worker_row: pd.Series, quote: dict[str, object]) -> dict[str, object]:
    predicted_income = float(quote["predicted_next_week_income_inr"])
    premium_inr = float(quote["premium_inr"])
    expected_shortfall = float(quote["expected_income_shortfall_inr"])
    return {
        "platform_driver_id": str(worker_row["platform_driver_id"]),
        "platform_name": str(worker_row["platform_name"]),
        "city": str(worker_row["city"]),
        "state": str(worker_row["state"]),
        "city_tier": str(worker_row["city_tier"]),
        "predicted_next_week_income_inr": predicted_income,
        "premium_inr": premium_inr,
        "premium_share_of_income_pct": 0.0 if predicted_income <= 0 else (premium_inr / predicted_income) * 100.0,
        "expected_income_shortfall_inr": expected_shortfall,
        "expected_shortfall_share_pct": float(quote["expected_income_shortfall_share"]) * 100.0,
        "forecast_event_pressure": float(quote["forecast_event_pressure"]),
        "aria_total": float(quote["aria_total"]),
        "risk_label": str(quote["risk_label"]),
        "quote_confidence_score": int(quote["quote_confidence_score"]),
        "quote_confidence_band": str(quote["quote_confidence_band"]),
    }


def audit_pricing(limit: int, seed: int, platform: str | None, city_tier: str | None, no_claim_weeks: int) -> dict[str, object]:
    settings = MongoSettings.from_env()
    feature_tables = load_cached_feature_tables(settings)
    if feature_tables is None:
        raise RuntimeError("Feature cache not found. Run `py -m ml.train_all` first.")

    latest = _latest_workers(feature_tables.weekly_driver, platform=platform, city_tier=city_tier)
    if latest.empty:
        raise RuntimeError("No workers matched the requested filters.")

    sample = _sample_workers(latest, limit=limit, seed=seed)
    premium_engine = PremiumEngine(settings.artifact_dir)
    rows: list[dict[str, object]] = []

    for _, worker_row in sample.iterrows():
        quote = premium_engine.quote_worker(
            worker_id=str(worker_row["platform_driver_id"]),
            platform_name=str(worker_row["platform_name"]),
            feature_tables=feature_tables,
            horizon_days=7,
            no_claim_weeks=no_claim_weeks,
        )
        rows.append(_format_worker_quote(worker_row, quote))

    audited = pd.DataFrame(rows)
    overall = _summarize_group(audited)
    premium_mean = float(audited["premium_inr"].mean())
    mean_income = float(audited["predicted_next_week_income_inr"].mean())
    portfolio = {
        "weekly_premium_pool_inr": round(float(audited["premium_inr"].sum()), 2),
        "mean_premium_inr": round(premium_mean, 2),
        "mean_predicted_income_inr": round(mean_income, 2),
        "mean_premium_share_of_income_pct": round(float(audited["premium_share_of_income_pct"].mean()), 2),
        "high_premium_worker_count": int((audited["premium_inr"] >= 80.0).sum()),
        "premium_over_5pct_income_count": int((audited["premium_share_of_income_pct"] > 5.0).sum()),
    }

    return {
        "filters": {
            "limit": int(limit),
            "seed": int(seed),
            "platform": platform,
            "city_tier": city_tier,
            "no_claim_weeks": int(no_claim_weeks),
        },
        "sample_size": int(len(audited)),
        "portfolio": portfolio,
        "overall": overall,
        "by_platform": _group_summary(audited, "platform_name"),
        "by_city_tier": _group_summary(audited, "city_tier"),
        "top_premium_outliers": _outlier_rows(audited, limit=12),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit premium distribution across a worker cohort.")
    parser.add_argument("--limit", type=int, default=100, help="Number of workers to audit")
    parser.add_argument("--seed", type=int, default=42, help="Sampling seed")
    parser.add_argument("--platform", type=str, default=None, help="Optional platform filter")
    parser.add_argument("--city-tier", type=str, default=None, help="Optional city tier filter")
    parser.add_argument("--no-claim-weeks", type=int, default=0, help="Apply the same no-claim weeks to the cohort")
    args = parser.parse_args()

    result = audit_pricing(
        limit=args.limit,
        seed=args.seed,
        platform=args.platform,
        city_tier=args.city_tier,
        no_claim_weeks=args.no_claim_weeks,
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
