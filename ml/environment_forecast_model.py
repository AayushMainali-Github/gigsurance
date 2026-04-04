from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

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
class EnvironmentForecaster:
    artifact_dir: Path
    lag_steps: tuple[int, ...] = (1, 2, 3, 7, 14)
    rolling_windows: tuple[int, ...] = (3, 7)
    series_columns: tuple[str, ...] = ("combined_disruption_score", "max_aqi", "max_rain_mm", "max_heat_risk")
    target_columns: dict[str, str] = field(
        default_factory=lambda: {
            "next_disruption_score": "combined_disruption_score",
            "next_max_aqi": "max_aqi",
            "next_max_rain_mm": "max_rain_mm",
            "next_max_heat_risk": "max_heat_risk",
        }
    )

    @property
    def feature_columns(self) -> list[str]:
        columns = ["city", "state", "dow", "month", "weekofyear", "dayofyear"]
        for column in self.series_columns:
            columns.extend([f"{column}_lag_{lag}" for lag in self.lag_steps])
            columns.extend([f"{column}_rollmean_{window}" for window in self.rolling_windows])
        return columns

    def _build_training_frame(self, city_day: pd.DataFrame) -> pd.DataFrame:
        frames: list[pd.DataFrame] = []
        for (_, _), group in city_day.sort_values(["city", "state", "date"]).groupby(["city", "state"], sort=False):
            frame = group[["city", "state", "date", *self.series_columns]].copy()
            frame["dow"] = frame["date"].dt.dayofweek
            frame["month"] = frame["date"].dt.month
            frame["weekofyear"] = frame["date"].dt.isocalendar().week.astype(int)
            frame["dayofyear"] = frame["date"].dt.dayofyear
            for column in self.series_columns:
                for lag in self.lag_steps:
                    frame[f"{column}_lag_{lag}"] = frame[column].shift(lag)
                for window in self.rolling_windows:
                    frame[f"{column}_rollmean_{window}"] = frame[column].shift(1).rolling(window, min_periods=1).mean()
            for target_name, source in self.target_columns.items():
                frame[target_name] = frame[source].shift(-1)
            frames.append(frame)
        training = pd.concat(frames, ignore_index=True)
        return training.dropna(subset=list(self.target_columns))

    def train(self, store=None, feature_tables=None) -> dict:
        feature_tables = feature_tables or build_feature_tables(store)
        training = self._build_training_frame(feature_tables.city_day.copy())
        split_date = training["date"].quantile(0.8)
        train = training[training["date"] < split_date].reset_index(drop=True)
        test = training[training["date"] >= split_date].reset_index(drop=True)

        preprocessor = make_preprocessor(train, self.feature_columns)
        preprocessor.fit(train[self.feature_columns])
        save_artifact(self.artifact_dir / "environment_preprocessor.joblib", preprocessor)

        models: dict[str, object] = {}
        metrics: dict[str, dict] = {}
        x_train = transform_frame(preprocessor, train, self.feature_columns)
        x_test = transform_frame(preprocessor, test, self.feature_columns)
        for target_name in self.target_columns:
            model = make_regressor()
            model.fit(x_train, train[target_name])
            predictions = model.predict(x_test)
            models[target_name] = model
            metrics[target_name] = regression_metrics(test[target_name], predictions)
            save_feature_importance(self.artifact_dir / f"{target_name}_feature_importance.json", model, preprocessor)

        save_artifact(self.artifact_dir / "environment_models.joblib", models)
        summary = {
            "model_family": "xgboost_regressor" if str(type(next(iter(models.values())))).lower().find("xgb") != -1 else "gradient_boosting_regressor",
            "rows_train": int(len(train)),
            "rows_test": int(len(test)),
            "targets": metrics,
        }
        save_metrics(self.artifact_dir / "environment_metrics.json", summary)
        return summary

    def _load(self):
        preprocessor = load_artifact(self.artifact_dir / "environment_preprocessor.joblib")
        models = load_artifact(self.artifact_dir / "environment_models.joblib")
        return preprocessor, models

    def _make_forecast_row(self, history: pd.DataFrame, city: str, state: str, forecast_date: pd.Timestamp) -> pd.DataFrame:
        row: dict[str, float | int | str] = {
            "city": city,
            "state": state,
            "dow": int(forecast_date.dayofweek),
            "month": int(forecast_date.month),
            "weekofyear": int(forecast_date.isocalendar().week),
            "dayofyear": int(forecast_date.dayofyear),
        }
        tail = history.sort_values("date").reset_index(drop=True)
        for column in self.series_columns:
            series = tail[column]
            for lag in self.lag_steps:
                row[f"{column}_lag_{lag}"] = float(series.iloc[-lag]) if len(series) >= lag else float(series.iloc[0])
            for window in self.rolling_windows:
                row[f"{column}_rollmean_{window}"] = float(series.tail(window).mean())
        return pd.DataFrame([row])

    def forecast_city_week(self, city: str, state: str, city_day: pd.DataFrame, horizon_days: int = 7) -> pd.DataFrame:
        preprocessor, models = self._load()
        history = city_day[(city_day["city"] == city) & (city_day["state"] == state)].copy().sort_values("date")
        if history.empty:
            raise ValueError(f"No environment history found for {city}, {state}.")

        history = history[["city", "state", "date", *self.series_columns]].copy()
        forecasts: list[dict] = []
        current_date = history["date"].max()
        for _ in range(horizon_days):
            next_date = current_date + pd.Timedelta(days=1)
            feature_row = self._make_forecast_row(history, city, state, next_date)
            matrix = transform_frame(preprocessor, feature_row, self.feature_columns)
            predicted = {
                "combined_disruption_score": max(0.0, min(1.0, float(models["next_disruption_score"].predict(matrix)[0]))),
                "max_aqi": max(0.0, float(models["next_max_aqi"].predict(matrix)[0])),
                "max_rain_mm": max(0.0, float(models["next_max_rain_mm"].predict(matrix)[0])),
                "max_heat_risk": max(0.0, min(1.0, float(models["next_max_heat_risk"].predict(matrix)[0]))),
            }
            predicted["trigger_event"] = int(
                predicted["combined_disruption_score"] >= 0.58
                or predicted["max_aqi"] >= 280
                or predicted["max_rain_mm"] >= 18
                or predicted["max_heat_risk"] >= 0.70
            )
            row = {"city": city, "state": state, "date": next_date, **predicted}
            forecasts.append(row)
            history = pd.concat([history, pd.DataFrame([row])], ignore_index=True)
            current_date = next_date
        return pd.DataFrame(forecasts)
