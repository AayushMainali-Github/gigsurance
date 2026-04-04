from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

from .feature_builders import build_feature_tables
from .model_utils import (
    load_artifact,
    make_preprocessor,
    make_regressor,
    regression_metrics,
    save_artifact,
    save_feature_importance,
    save_metrics,
    transform_frame,
)


@dataclass(slots=True)
class EarningsForecaster:
    artifact_dir: Path

    feature_columns = [
        "city",
        "state",
        "city_tier",
        "platform_name",
        "archetype",
        "experience_bucket",
        "weather_sensitivity",
        "preferred_shift",
        "resilience_score",
        "attendance_discipline",
        "platform_loyalty_score",
        "preferred_hub_count",
        "tenure_days",
        "lookback_weeks",
        "hist_income_mean_4",
        "hist_income_mean_12",
        "hist_income_mean_52",
        "hist_income_std_12",
        "hist_income_trend_4",
        "hist_gigs_mean_4",
        "hist_hours_mean_4",
        "hist_active_days_mean_4",
        "hist_avg_gig_income_8",
        "hist_disruption_mean_12",
        "hist_trigger_days_mean_12",
        "hist_max_aqi_12",
        "hist_max_rain_12",
        "hist_max_heat_12",
        "forecast_disruption_mean",
        "forecast_disruption_max",
        "forecast_trigger_probability",
        "forecast_peak_aqi",
        "forecast_total_rain_mm",
        "forecast_peak_heat_risk",
        "forecast_weather_stress_index",
    ]

    @staticmethod
    def _safe_mean(series: pd.Series, window: int, default: float = 0.0) -> float:
        if series.empty:
            return default
        return float(series.tail(window).mean())

    @staticmethod
    def _safe_std(series: pd.Series, window: int, default: float = 0.0) -> float:
        if len(series.tail(window)) <= 1:
            return default
        return float(series.tail(window).std(ddof=0))

    def _supervised_frame(self, weekly: pd.DataFrame) -> pd.DataFrame:
        frames: list[pd.DataFrame] = []
        for _, driver in weekly.sort_values(["platform_driver_id", "week_start"]).groupby("platform_driver_id", sort=False):
            frame = driver.copy().reset_index(drop=True)
            frame["lookback_weeks"] = frame.index
            frame["hist_income_mean_4"] = frame["weekly_income"].shift(1).rolling(4, min_periods=2).mean()
            frame["hist_income_mean_12"] = frame["weekly_income"].shift(1).rolling(12, min_periods=4).mean()
            frame["hist_income_mean_52"] = frame["weekly_income"].shift(1).rolling(52, min_periods=8).mean()
            frame["hist_income_std_12"] = frame["weekly_income"].shift(1).rolling(12, min_periods=4).std(ddof=0)
            frame["hist_gigs_mean_4"] = frame["weekly_gigs"].shift(1).rolling(4, min_periods=2).mean()
            frame["hist_hours_mean_4"] = frame["total_active_hours"].shift(1).rolling(4, min_periods=2).mean()
            frame["hist_active_days_mean_4"] = frame["active_days"].shift(1).rolling(4, min_periods=2).mean()
            frame["hist_avg_gig_income_8"] = frame["avg_gig_income"].shift(1).rolling(8, min_periods=3).mean()
            frame["hist_disruption_mean_12"] = frame["mean_combined_disruption"].shift(1).rolling(12, min_periods=4).mean()
            frame["hist_trigger_days_mean_12"] = frame["trigger_days"].shift(1).rolling(12, min_periods=4).mean()
            frame["hist_max_aqi_12"] = frame["max_aqi"].shift(1).rolling(12, min_periods=4).max()
            frame["hist_max_rain_12"] = frame["max_rain_mm"].shift(1).rolling(12, min_periods=4).max()
            frame["hist_max_heat_12"] = frame["max_heat_risk"].shift(1).rolling(12, min_periods=4).max()
            frame["hist_income_trend_4"] = frame["hist_income_mean_4"] - frame["hist_income_mean_12"]
            frame["forecast_disruption_mean"] = frame["mean_combined_disruption"]
            frame["forecast_disruption_max"] = frame["mean_combined_disruption"]
            frame["forecast_trigger_probability"] = (frame["trigger_days"] / 7.0).clip(upper=1.0)
            frame["forecast_peak_aqi"] = frame["max_aqi"]
            frame["forecast_total_rain_mm"] = frame["avg_rain_mm"] * 7.0
            frame["forecast_peak_heat_risk"] = frame["max_heat_risk"]
            frame["forecast_weather_stress_index"] = (
                0.52 * frame["forecast_disruption_mean"]
                + 0.08 * (frame["forecast_peak_aqi"] / 320.0).clip(upper=1.0)
                + 0.24 * (frame["forecast_total_rain_mm"] / 120.0).clip(upper=1.0)
                + 0.16 * frame["forecast_peak_heat_risk"]
            ).clip(upper=1.0)
            frames.append(frame)

        supervised = pd.concat(frames, ignore_index=True)
        return supervised.dropna(subset=["hist_income_mean_12", "hist_gigs_mean_4", "hist_hours_mean_4"])

    def train(self, store=None, feature_tables=None) -> dict:
        feature_tables = feature_tables or build_feature_tables(store)
        supervised = self._supervised_frame(feature_tables.weekly_driver.copy())
        split_date = supervised["week_start"].quantile(0.8)
        train = supervised[supervised["week_start"] < split_date].reset_index(drop=True)
        test = supervised[supervised["week_start"] >= split_date].reset_index(drop=True)

        preprocessor = make_preprocessor(train, self.feature_columns)
        preprocessor.fit(train[self.feature_columns])
        save_artifact(self.artifact_dir / "earnings_preprocessor.joblib", preprocessor)

        model = make_regressor()
        x_train = transform_frame(preprocessor, train, self.feature_columns)
        x_test = transform_frame(preprocessor, test, self.feature_columns)
        model.fit(x_train, train["weekly_income"])
        predictions = np.maximum(model.predict(x_test), 120.0)
        save_artifact(self.artifact_dir / "earnings_forecaster.joblib", model)
        save_feature_importance(self.artifact_dir / "earnings_feature_importance.json", model, preprocessor)
        metrics = {
            "model_family": "xgboost_regressor" if str(type(model)).lower().find("xgb") != -1 else "gradient_boosting_regressor",
            "rows_train": int(len(train)),
            "rows_test": int(len(test)),
            "metrics": regression_metrics(test["weekly_income"], predictions),
        }
        save_metrics(self.artifact_dir / "earnings_metrics.json", metrics)
        return metrics

    def build_quote_features(self, driver_history: pd.DataFrame, forecast_week: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
        history = driver_history.sort_values("week_start").tail(52).reset_index(drop=True)
        latest = history.iloc[-1]
        forecast_disruption_mean = float(forecast_week["combined_disruption_score"].mean())
        forecast_disruption_max = float(forecast_week["combined_disruption_score"].max())
        forecast_trigger_probability = float(forecast_week["trigger_event"].mean())
        forecast_peak_aqi = float(forecast_week["max_aqi"].max())
        forecast_total_rain_mm = float(forecast_week["max_rain_mm"].sum())
        forecast_peak_heat_risk = float(forecast_week["max_heat_risk"].max())
        forecast_weather_stress_index = min(
            1.0,
            0.52 * forecast_disruption_mean
            + 0.08 * min(1.0, forecast_peak_aqi / 320.0)
            + 0.24 * min(1.0, forecast_total_rain_mm / 120.0)
            + 0.16 * forecast_peak_heat_risk,
        )

        row = {
            "city": latest["city"],
            "state": latest["state"],
            "city_tier": latest["city_tier"],
            "platform_name": latest["platform_name"],
            "archetype": latest["archetype"],
            "experience_bucket": latest["experience_bucket"],
            "weather_sensitivity": latest["weather_sensitivity"],
            "preferred_shift": latest["preferred_shift"],
            "resilience_score": float(latest["resilience_score"]),
            "attendance_discipline": float(latest["attendance_discipline"]),
            "platform_loyalty_score": float(latest["platform_loyalty_score"]),
            "preferred_hub_count": int(latest["preferred_hub_count"]),
            "tenure_days": int(latest["tenure_days"]) + 7,
            "lookback_weeks": int(len(history)),
            "hist_income_mean_4": self._safe_mean(history["weekly_income"], 4, float(history["weekly_income"].mean())),
            "hist_income_mean_12": self._safe_mean(history["weekly_income"], 12, float(history["weekly_income"].mean())),
            "hist_income_mean_52": self._safe_mean(history["weekly_income"], 52, float(history["weekly_income"].mean())),
            "hist_income_std_12": self._safe_std(history["weekly_income"], 12, 0.0),
            "hist_income_trend_4": self._safe_mean(history["weekly_income"], 4, 0.0) - self._safe_mean(history["weekly_income"], 12, 0.0),
            "hist_gigs_mean_4": self._safe_mean(history["weekly_gigs"], 4, float(history["weekly_gigs"].mean())),
            "hist_hours_mean_4": self._safe_mean(history["total_active_hours"], 4, float(history["total_active_hours"].mean())),
            "hist_active_days_mean_4": self._safe_mean(history["active_days"], 4, float(history["active_days"].mean())),
            "hist_avg_gig_income_8": self._safe_mean(history["avg_gig_income"], 8, float(history["avg_gig_income"].mean())),
            "hist_disruption_mean_12": self._safe_mean(history["mean_combined_disruption"], 12, float(history["mean_combined_disruption"].mean())),
            "hist_trigger_days_mean_12": self._safe_mean(history["trigger_days"], 12, float(history["trigger_days"].mean())),
            "hist_max_aqi_12": float(history["max_aqi"].tail(12).max()),
            "hist_max_rain_12": float(history["max_rain_mm"].tail(12).max()),
            "hist_max_heat_12": float(history["max_heat_risk"].tail(12).max()),
            "forecast_disruption_mean": forecast_disruption_mean,
            "forecast_disruption_max": forecast_disruption_max,
            "forecast_trigger_probability": forecast_trigger_probability,
            "forecast_peak_aqi": forecast_peak_aqi,
            "forecast_total_rain_mm": forecast_total_rain_mm,
            "forecast_peak_heat_risk": forecast_peak_heat_risk,
            "forecast_weather_stress_index": forecast_weather_stress_index,
        }
        meta = {
            "forecast_disruption_mean": forecast_disruption_mean,
            "forecast_disruption_max": forecast_disruption_max,
            "forecast_trigger_probability": forecast_trigger_probability,
            "forecast_peak_aqi": forecast_peak_aqi,
            "forecast_total_rain_mm": forecast_total_rain_mm,
            "forecast_peak_heat_risk": forecast_peak_heat_risk,
            "forecast_weather_stress_index": forecast_weather_stress_index,
            "baseline_income_trailing_12w": row["hist_income_mean_12"],
            "avg_gig_income_trailing_8w": row["hist_avg_gig_income_8"],
        }
        return pd.DataFrame([row]), meta

    def predict_next_week_income(self, driver_history: pd.DataFrame, forecast_week: pd.DataFrame) -> tuple[float, dict]:
        preprocessor = load_artifact(self.artifact_dir / "earnings_preprocessor.joblib")
        model = load_artifact(self.artifact_dir / "earnings_forecaster.joblib")
        features, meta = self.build_quote_features(driver_history, forecast_week)
        matrix = transform_frame(preprocessor, features, self.feature_columns)
        prediction = max(120.0, float(model.predict(matrix)[0]))
        meta["predicted_next_week_income_inr"] = prediction
        return prediction, meta
