from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

try:
    from xgboost import XGBRegressor
except ImportError:  # pragma: no cover
    XGBRegressor = None


def make_preprocessor(frame: pd.DataFrame, feature_columns: list[str]) -> ColumnTransformer:
    categorical = [col for col in feature_columns if frame[col].dtype == "object"]
    numeric = [col for col in feature_columns if col not in categorical]
    return ColumnTransformer(
        transformers=[
            ("numeric", Pipeline([("imputer", SimpleImputer(strategy="median"))]), numeric),
            (
                "categorical",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("encoder", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                categorical,
            ),
        ]
    )


def make_regressor(random_state: int = 42):
    if XGBRegressor is not None:
        return XGBRegressor(
            n_estimators=320,
            max_depth=6,
            learning_rate=0.045,
            subsample=0.9,
            colsample_bytree=0.85,
            min_child_weight=4,
            reg_alpha=0.05,
            reg_lambda=1.0,
            objective="reg:squarederror",
            random_state=random_state,
            n_jobs=4,
        )
    return GradientBoostingRegressor(random_state=random_state)


def transform_frame(preprocessor: ColumnTransformer, frame: pd.DataFrame, feature_columns: list[str]):
    matrix = preprocessor.transform(frame[feature_columns])
    if XGBRegressor is None and hasattr(matrix, "toarray"):
        return matrix.toarray()
    return matrix


def save_artifact(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(payload, path)


def load_artifact(path: Path):
    return joblib.load(path)


def save_metrics(path: Path, metrics: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(metrics, indent=2), encoding="utf-8")


def get_feature_names(preprocessor: ColumnTransformer) -> list[str]:
    output: list[str] = []
    for name, transformer, columns in preprocessor.transformers_:
        if name == "remainder":
            continue
        if hasattr(transformer, "named_steps"):
            encoder = transformer.named_steps.get("encoder")
            if encoder is not None and hasattr(encoder, "get_feature_names_out"):
                output.extend(encoder.get_feature_names_out(columns).tolist())
                continue
        output.extend(list(columns))
    return output


def regression_metrics(y_true: pd.Series, y_pred: np.ndarray) -> dict[str, float]:
    absolute_errors = np.abs(y_true.to_numpy() - y_pred)
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    return {
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "median_ae": float(np.median(absolute_errors)),
        "rmse": rmse,
        "mean_prediction": float(np.mean(y_pred)),
    }


def save_feature_importance(path: Path, model, preprocessor: ColumnTransformer) -> None:
    feature_names = get_feature_names(preprocessor)
    if hasattr(model, "feature_importances_"):
        weights = model.feature_importances_.ravel().tolist()
        ranked = sorted(zip(feature_names, weights), key=lambda item: item[1], reverse=True)
    elif hasattr(model, "coef_"):
        weights = model.coef_.ravel().tolist()
        ranked = sorted(zip(feature_names, weights), key=lambda item: abs(item[1]), reverse=True)
    else:
        ranked = []
    save_metrics(
        path,
        {"top_features": [{"feature": name, "weight": weight} for name, weight in ranked[:25]]},
    )
