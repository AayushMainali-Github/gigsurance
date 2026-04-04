from __future__ import annotations

import argparse
import json

import pandas as pd

from .config import MongoSettings
from .feature_builders import load_cached_feature_tables
from .payout_model import PayoutEngine
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
        "p25": round(float(clean.quantile(0.25)), 2),
        "median": round(float(clean.quantile(0.50)), 2),
        "p75": round(float(clean.quantile(0.75)), 2),
        "p90": round(float(clean.quantile(0.90)), 2),
        "p95": round(float(clean.quantile(0.95)), 2),
        "max": round(float(clean.max()), 2),
        "mean": round(float(clean.mean()), 2),
    }


def _summarize(rows: pd.DataFrame) -> dict[str, object]:
    return {
        "count": int(len(rows)),
        "premium_inr": _quantiles(rows["premium_inr"]),
        "payout_inr": _quantiles(rows["recommended_payout_inr"]),
        "payout_to_premium_ratio": _quantiles(rows["payout_to_premium_ratio"]),
        "eligible_count": int(rows["payout_eligible"].sum()),
        "auto_payout_count": int((rows["recommended_action"] == "auto_payout").sum()),
        "partial_payout_count": int((rows["recommended_action"] == "partial_payout").sum()),
        "no_payout_count": int((rows["recommended_action"] == "no_payout").sum()),
    }


def _group_summary(rows: pd.DataFrame, column: str) -> dict[str, dict[str, object]]:
    result: dict[str, dict[str, object]] = {}
    for key, group in rows.groupby(column):
        result[str(key)] = _summarize(group)
    return result


def _top_exposure(rows: pd.DataFrame, limit: int) -> list[dict[str, object]]:
    cols = [
        "platform_driver_id",
        "platform_name",
        "city",
        "city_tier",
        "premium_inr",
        "recommended_payout_inr",
        "payout_to_premium_ratio",
        "trigger_strength",
        "decision_confidence_score",
        "recommended_action",
    ]
    selected = rows.sort_values(["recommended_payout_inr", "payout_to_premium_ratio"], ascending=[False, False])[cols].head(limit)
    records = selected.to_dict(orient="records")
    for record in records:
        for key, value in list(record.items()):
            if isinstance(value, float):
                record[key] = round(value, 2)
    return records


def _city_trigger_rates(city_day: pd.DataFrame) -> pd.DataFrame:
    grouped = (
        city_day.groupby(["city", "state"], as_index=False)
        .agg(
            trigger_rate=("trigger_event", "mean"),
            severe_disruption_rate=("combined_disruption_score", lambda s: float((s >= 0.58).mean())),
        )
        .fillna(0.0)
    )
    grouped["weekly_trigger_days_est"] = grouped["trigger_rate"] * 7.0
    return grouped


def audit_portfolio(
    limit: int,
    seed: int,
    platform: str | None,
    city_tier: str | None,
    no_claim_weeks: int,
    affected_days: int,
) -> dict[str, object]:
    settings = MongoSettings.from_env()
    feature_tables = load_cached_feature_tables(settings)
    if feature_tables is None:
        raise RuntimeError("Feature cache not found. Run `py -m ml.train_all` first.")

    latest = _latest_workers(feature_tables.weekly_driver, platform=platform, city_tier=city_tier)
    if latest.empty:
        raise RuntimeError("No workers matched the requested filters.")

    sample = _sample_workers(latest, limit=limit, seed=seed)
    premium_engine = PremiumEngine(settings.artifact_dir)
    payout_engine = PayoutEngine(settings.artifact_dir)
    trigger_rates = _city_trigger_rates(feature_tables.city_day)
    rows: list[dict[str, object]] = []

    for _, worker_row in sample.iterrows():
        worker_id = str(worker_row["platform_driver_id"])
        platform_name = str(worker_row["platform_name"])
        city = str(worker_row["city"])
        state = str(worker_row["state"])

        quote = premium_engine.quote_worker(
            worker_id=worker_id,
            platform_name=platform_name,
            feature_tables=feature_tables,
            horizon_days=7,
            no_claim_weeks=no_claim_weeks,
        )
        payout = payout_engine.assess_worker_payout(
            worker_id=worker_id,
            platform_name=platform_name,
            feature_tables=feature_tables,
            horizon_days=1,
            affected_days=affected_days,
            no_claim_weeks=no_claim_weeks,
            verified_incident=True,
            incident_city=city,
            incident_state=state,
            days_since_enrollment=90,
        )

        premium_inr = float(quote["premium_inr"])
        recommended_payout_inr = float(payout["recommended_payout_inr"])
        rows.append(
            {
                "platform_driver_id": worker_id,
                "platform_name": platform_name,
                "city": city,
                "state": state,
                "city_tier": str(worker_row["city_tier"]),
                "premium_inr": premium_inr,
                "recommended_payout_inr": recommended_payout_inr,
                "payout_to_premium_ratio": 0.0 if premium_inr <= 0 else recommended_payout_inr / premium_inr,
                "payout_eligible": bool(payout["payout_eligible"]),
                "recommended_action": str(payout["recommended_action"]),
                "trigger_strength": float(payout["payout_trigger_strength"]),
                "decision_confidence_score": int(payout["decision_confidence_score"]),
            }
        )

    audited = pd.DataFrame(rows)
    audited = audited.merge(trigger_rates, on=["city", "state"], how="left")
    audited["trigger_rate"] = audited["trigger_rate"].fillna(0.0)
    audited["weekly_trigger_days_est"] = audited["weekly_trigger_days_est"].fillna(0.0)
    audited["expected_weekly_payout_inr"] = audited["recommended_payout_inr"] * audited["trigger_rate"] * 7.0
    premium_pool = float(audited["premium_inr"].sum())
    payout_liability = float(audited["recommended_payout_inr"].sum())
    expected_weekly_liability = float(audited["expected_weekly_payout_inr"].sum())
    return {
        "filters": {
            "limit": int(limit),
            "seed": int(seed),
            "platform": platform,
            "city_tier": city_tier,
            "no_claim_weeks": int(no_claim_weeks),
            "affected_days": int(affected_days),
        },
        "sample_size": int(len(audited)),
        "portfolio": {
            "weekly_premium_pool_inr": round(premium_pool, 2),
            "single_incident_payout_liability_inr": round(payout_liability, 2),
            "liability_to_premium_pool_ratio": round(0.0 if premium_pool <= 0 else payout_liability / premium_pool, 2),
            "expected_weekly_payout_liability_inr": round(expected_weekly_liability, 2),
            "expected_liability_to_premium_pool_ratio": round(
                0.0 if premium_pool <= 0 else expected_weekly_liability / premium_pool, 2
            ),
            "eligible_worker_count": int(audited["payout_eligible"].sum()),
            "mean_premium_inr": round(float(audited["premium_inr"].mean()), 2),
            "mean_payout_inr": round(float(audited["recommended_payout_inr"].mean()), 2),
        },
        "overall": _summarize(audited),
        "by_platform": _group_summary(audited, "platform_name"),
        "by_city_tier": _group_summary(audited, "city_tier"),
        "top_payout_exposure": _top_exposure(audited, limit=12),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit premium pool versus payout exposure for a worker cohort.")
    parser.add_argument("--limit", type=int, default=100, help="Number of workers to audit")
    parser.add_argument("--seed", type=int, default=42, help="Sampling seed")
    parser.add_argument("--platform", type=str, default=None, help="Optional platform filter")
    parser.add_argument("--city-tier", type=str, default=None, help="Optional city tier filter")
    parser.add_argument("--no-claim-weeks", type=int, default=0, help="Apply the same no-claim weeks to the cohort")
    parser.add_argument("--affected-days", type=int, default=1, help="Incident days used for payout simulation")
    args = parser.parse_args()

    result = audit_portfolio(
        limit=args.limit,
        seed=args.seed,
        platform=args.platform,
        city_tier=args.city_tier,
        no_claim_weeks=args.no_claim_weeks,
        affected_days=args.affected_days,
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
