from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pandas as pd

from .earnings_forecast_model import EarningsForecaster
from .environment_forecast_model import EnvironmentForecaster


@dataclass(slots=True)
class PremiumEngine:
    artifact_dir: Path
    environment: EnvironmentForecaster = field(init=False)
    earnings: EarningsForecaster = field(init=False)
    parameters: dict[str, float] = field(init=False)

    def __post_init__(self) -> None:
        self.environment = EnvironmentForecaster(self.artifact_dir)
        self.earnings = EarningsForecaster(self.artifact_dir)
        self.parameters = {
            "minimum_premium_inr": 18.0,
            "target_base_share_of_income": 0.0075,
            "target_expected_loss_share": 0.085,
            "target_max_share_of_income": 0.075,
        }

    @staticmethod
    def _clip01(value: float) -> float:
        return max(0.0, min(1.0, float(value)))

    def _estimate_recovery_lag_weeks(self, history: pd.DataFrame) -> tuple[float, float]:
        history = history.sort_values("week_start").tail(26).reset_index(drop=True)
        event_indices = history.index[
            (history["mean_combined_disruption"] >= 0.42) | (history["trigger_days"] >= 2)
        ].tolist()
        if not event_indices:
            resilience = float(history["resilience_score"].iloc[-1])
            normalized = self._clip01(0.45 * (1.0 - resilience))
            return round(1.0 + 3.0 * normalized, 2), normalized

        lags: list[int] = []
        for idx in event_indices:
            prior = history.iloc[max(0, idx - 4):idx]
            baseline = float(prior["weekly_income"].mean()) if not prior.empty else float(history.iloc[idx]["weekly_income"])
            target = baseline * 0.90
            lag_found = 4
            for ahead in range(1, 5):
                next_idx = idx + ahead
                if next_idx >= len(history):
                    break
                if float(history.iloc[next_idx]["weekly_income"]) >= target:
                    lag_found = ahead
                    break
            lags.append(lag_found)
        avg_lag = float(sum(lags) / len(lags))
        return round(avg_lag, 2), self._clip01((avg_lag - 1.0) / 3.0)

    def _estimate_income_floor_adequacy(self, history: pd.DataFrame) -> float:
        recent = history.sort_values("week_start").tail(26)
        median_income = float(recent["weekly_income"].median()) if not recent.empty else 0.0
        if median_income <= 0:
            return 0.35
        p10_income = float(recent["weekly_income"].quantile(0.10))
        return self._clip01(p10_income / median_income)

    def _estimate_bisi_risk(self, history: pd.DataFrame) -> float:
        recent = history.sort_values("week_start").tail(12)
        mean_income = float(recent["weekly_income"].mean()) if not recent.empty else 0.0
        if mean_income <= 0:
            return 0.5
        coefficient_var = float((recent["weekly_income"].std(ddof=0) or 0.0) / mean_income)
        return self._clip01(coefficient_var / 0.85)

    def _estimate_earnings_regime_shift(self, history: pd.DataFrame) -> tuple[float, float]:
        recent = history.sort_values("week_start").tail(12)
        if recent.empty:
            return 0.0, 0.0
        mean_12 = float(recent["weekly_income"].mean())
        if mean_12 <= 0:
            return 0.0, 0.0
        mean_4 = float(recent["weekly_income"].tail(4).mean())
        shift_ratio = abs(mean_4 - mean_12) / mean_12
        # Treat small within-band movement as normal noise; price only material regime drift.
        shift_loading = self._clip01(max(0.0, shift_ratio - 0.10) / 0.25)
        return shift_ratio, shift_loading

    def _estimate_resilience_trajectory(self, history: pd.DataFrame) -> tuple[float, float, float, str]:
        recent = history.sort_values("week_start").tail(10).reset_index(drop=True)
        if len(recent) < 4:
            return 0.0, 0.0, 0.0, "stable"

        baseline_income = recent["weekly_income"].rolling(4, min_periods=2).mean().shift(1)
        income_ratio = (recent["weekly_income"] / baseline_income).replace([float("inf"), float("-inf")], 0.0).fillna(1.0)
        recovery_proxy = (
            0.35 * income_ratio.clip(lower=0.0, upper=1.4)
            + 0.25 * (recent["active_days"] / 7.0).clip(lower=0.0, upper=1.0)
            + 0.20 * (1.0 - (recent["mean_combined_disruption"] / 0.9).clip(lower=0.0, upper=1.0))
            + 0.20 * recent["attendance_discipline"].clip(lower=0.0, upper=1.0)
        )
        x = pd.Series(range(len(recovery_proxy)), dtype="float64")
        slope = float((((x - x.mean()) * (recovery_proxy - recovery_proxy.mean())).sum()) / max(1e-9, ((x - x.mean()) ** 2).sum()))
        normalized = max(-1.0, min(1.0, slope / 0.05))
        decline_loading = self._clip01(max(0.0, -normalized))
        improvement_credit = self._clip01(max(0.0, normalized))
        if normalized >= 0.18:
            label = "improving"
        elif normalized <= -0.18:
            label = "declining"
        else:
            label = "stable"
        return normalized, decline_loading, improvement_credit, label

    def _estimate_swec(self, history: pd.DataFrame) -> float:
        recent = history.sort_values("week_start").tail(26).copy()
        if recent.empty:
            return 0.0
        severe_mask = (
            (recent["mean_combined_disruption"] >= 0.45)
            | (recent["trigger_days"] >= 2)
            | (recent["max_rain_mm"] >= 18)
            | (recent["max_heat_risk"] >= 0.70)
        )
        severe_income = float(recent.loc[severe_mask, "weekly_income"].sum())
        total_income = max(1.0, float(recent["weekly_income"].sum()))
        return self._clip01(severe_income / total_income)

    def _estimate_city_rebound_velocity(self, city_weekly: pd.DataFrame) -> tuple[float, float]:
        grouped = (
            city_weekly.sort_values("week_start")
            .groupby("week_start", as_index=False)
            .agg(
                city_income=("weekly_income", "sum"),
                city_gigs=("weekly_gigs", "sum"),
                city_disruption=("mean_combined_disruption", "mean"),
                city_trigger_days=("trigger_days", "sum"),
            )
            .reset_index(drop=True)
        )
        event_indices = grouped.index[
            (grouped["city_disruption"] >= 0.42) | (grouped["city_trigger_days"] >= 8)
        ].tolist()
        if not event_indices:
            return 0.70, 1.45

        lags: list[int] = []
        for idx in event_indices:
            prior = grouped.iloc[max(0, idx - 4):idx]
            baseline = float(prior["city_gigs"].mean()) if not prior.empty else float(grouped.iloc[idx]["city_gigs"])
            target = baseline * 0.90
            lag_found = 4
            for ahead in range(1, 5):
                next_idx = idx + ahead
                if next_idx >= len(grouped):
                    break
                if float(grouped.iloc[next_idx]["city_gigs"]) >= target:
                    lag_found = ahead
                    break
            lags.append(lag_found)
        avg_lag = float(sum(lags) / len(lags))
        velocity = self._clip01(1.0 - ((avg_lag - 1.0) / 3.0))
        return velocity, avg_lag

    def _estimate_quote_confidence(
        self,
        history: pd.DataFrame,
        fragility: dict[str, Any],
        meta: dict[str, Any],
    ) -> tuple[int, str, dict[str, float]]:
        lookback_quality = self._clip01(min(len(history), 52) / 52.0)
        cohort_density = self._clip01(float(fragility.get("city_cohort_size", 1)) / 120.0)
        stability_evidence = self._clip01(
            0.55 * (1.0 - float(fragility["bisi_risk"]))
            + 0.25 * float(fragility["weather_resilience_dividend"])
            + 0.20 * (1.0 - float(fragility["earnings_regime_shift_loading"]))
        )
        forecast_signal_strength = self._clip01(
            0.55 * float(fragility["forecast_event_pressure"])
            + 0.30 * float(meta["forecast_weather_stress_index"])
            + 0.15 * float(fragility["severe_rain_loading"])
        )
        score = int(
            round(
                100.0
                * (
                    0.36 * lookback_quality
                    + 0.22 * cohort_density
                    + 0.24 * stability_evidence
                    + 0.18 * forecast_signal_strength
                )
            )
        )
        if score >= 75:
            band = "high"
        elif score >= 55:
            band = "medium"
        else:
            band = "low"
        return score, band, {
            "lookback_quality": round(lookback_quality, 4),
            "cohort_density": round(cohort_density, 4),
            "stability_evidence": round(stability_evidence, 4),
            "forecast_signal_strength": round(forecast_signal_strength, 4),
        }

    def _seasonal_phase(self, state: str, forecast_start: str, peak_aqi: float, total_rain_mm: float, peak_heat_risk: float) -> tuple[str, float]:
        month = pd.Timestamp(forecast_start).month
        north_states = {
            "delhi",
            "haryana",
            "punjab",
            "uttar pradesh",
            "rajasthan",
            "bihar",
            "jharkhand",
        }
        state_key = state.lower()
        if month in {6, 7, 8, 9} or total_rain_mm >= 45:
            return "monsoon", 0.72
        if month in {3, 4, 5, 6} or peak_heat_risk >= 0.62:
            return "heat", 0.60
        if (month in {11, 12, 1} and state_key in north_states) or peak_aqi >= 260:
            return "winter_aqi", 0.34
        return "neutral", 0.18

    def _build_fragility_profile(self, history: pd.DataFrame, city_weekly: pd.DataFrame, meta: dict, no_claim_weeks: int) -> dict:
        recent12 = history.sort_values("week_start").tail(12).reset_index(drop=True)
        recovery_lag_weeks, recovery_lag_score = self._estimate_recovery_lag_weeks(history)
        ifas = self._estimate_income_floor_adequacy(history)
        bisi_risk = self._estimate_bisi_risk(history)
        earnings_regime_shift_ratio, earnings_regime_shift_loading = self._estimate_earnings_regime_shift(history)
        resilience_trajectory_score, resilience_decline_loading, resilience_improvement_credit, resilience_trajectory_label = (
            self._estimate_resilience_trajectory(history)
        )
        swec = self._estimate_swec(history)

        preferred_shift = str(history.iloc[-1]["preferred_shift"]).lower()
        shift_architecture_risk = {
            "mixed": 0.12,
            "breakfast": 0.22,
            "lunch": 0.31,
            "evening": 0.27,
            "night": 0.21,
        }.get(preferred_shift, 0.20)
        platform_dependency_loading = self._clip01((float(history.iloc[-1]["platform_loyalty_score"]) - 0.60) / 0.40)
        weather_resilience_dividend = self._clip01(
            float(history.iloc[-1]["resilience_score"]) * 0.55
            + float(history.iloc[-1]["attendance_discipline"]) * 0.25
            + min(no_claim_weeks, 8) / 8.0 * 0.20
        )
        city_rebound_velocity, city_rebound_lag_weeks = self._estimate_city_rebound_velocity(city_weekly)
        city_cohort_size = int(city_weekly["platform_driver_id"].nunique()) if not city_weekly.empty else 1

        season_phase, season_phase_score = self._seasonal_phase(
            state=str(history.iloc[-1]["state"]),
            forecast_start=str(meta["forecast_window_start"]),
            peak_aqi=float(meta["forecast_peak_aqi"]),
            total_rain_mm=float(meta["forecast_total_rain_mm"]),
            peak_heat_risk=float(meta["forecast_peak_heat_risk"]),
        )

        acute_aqi_loading = self._clip01(max(0.0, float(meta["forecast_peak_aqi"]) - 180.0) / 170.0)
        severe_rain_loading = self._clip01(max(0.0, float(meta["forecast_total_rain_mm"]) - 18.0) / 72.0)
        forecast_event_pressure = self._clip01(
            0.42 * float(meta["forecast_trigger_probability"])
            + 0.28 * float(meta["forecast_weather_stress_index"])
            + 0.15 * min(1.0, float(meta["forecast_total_rain_mm"]) / 110.0)
            + 0.11 * float(meta["forecast_peak_heat_risk"])
            + 0.04 * acute_aqi_loading
            + 0.05 * season_phase_score
        )

        aria_structural = self._clip01(
            0.30 * recovery_lag_score
            + 0.20 * (1.0 - ifas)
            + 0.20 * swec
            + 0.15 * bisi_risk
            + 0.15 * platform_dependency_loading
        )
        aria_environmental = self._clip01(
            0.40 * (1.0 - city_rebound_velocity)
            + 0.35 * season_phase_score
            + 0.25 * forecast_event_pressure
        )
        aria_total = self._clip01(0.65 * aria_structural + 0.35 * aria_environmental)

        return {
            "recovery_lag_weeks_est": recovery_lag_weeks,
            "recovery_lag_score": round(recovery_lag_score, 4),
            "ifas": round(ifas, 4),
            "bisi_risk": round(bisi_risk, 4),
            "earnings_regime_shift_ratio": round(earnings_regime_shift_ratio, 4),
            "earnings_regime_shift_loading": round(earnings_regime_shift_loading, 4),
            "resilience_trajectory_score": round(resilience_trajectory_score, 4),
            "resilience_decline_loading": round(resilience_decline_loading, 4),
            "resilience_improvement_credit": round(resilience_improvement_credit, 4),
            "resilience_trajectory_label": resilience_trajectory_label,
            "swec": round(swec, 4),
            "shift_architecture_risk": round(shift_architecture_risk, 4),
            "platform_dependency_loading": round(platform_dependency_loading, 4),
            "weather_resilience_dividend": round(weather_resilience_dividend, 4),
            "city_cohort_size": city_cohort_size,
            "city_rebound_velocity": round(city_rebound_velocity, 4),
            "city_rebound_lag_weeks": round(city_rebound_lag_weeks, 2),
            "seasonal_risk_phase": season_phase,
            "seasonal_risk_phase_score": round(season_phase_score, 4),
            "aqi_sensitivity_loading": round(acute_aqi_loading, 4),
            "severe_rain_loading": round(severe_rain_loading, 4),
            "forecast_event_pressure": round(forecast_event_pressure, 4),
            "aria_structural": round(aria_structural, 4),
            "aria_environmental": round(aria_environmental, 4),
            "aria_total": round(aria_total, 4),
        }

    def _apply_forecast_overrides(self, forecast: pd.DataFrame, overrides: dict[str, Any] | None) -> pd.DataFrame:
        if not overrides:
            return forecast
        adjusted = forecast.copy()
        for column in ["combined_disruption_score", "max_aqi", "max_rain_mm", "max_heat_risk"]:
            if column in overrides:
                adjusted[column] = overrides[column]
        if "aqi_multiplier" in overrides:
            adjusted["max_aqi"] = adjusted["max_aqi"] * float(overrides["aqi_multiplier"])
        if "rain_multiplier" in overrides:
            adjusted["max_rain_mm"] = adjusted["max_rain_mm"] * float(overrides["rain_multiplier"])
        if "heat_multiplier" in overrides:
            adjusted["max_heat_risk"] = adjusted["max_heat_risk"] * float(overrides["heat_multiplier"])
        adjusted["combined_disruption_score"] = adjusted["combined_disruption_score"].clip(lower=0.0, upper=1.0)
        adjusted["max_heat_risk"] = adjusted["max_heat_risk"].clip(lower=0.0, upper=1.0)
        adjusted["trigger_event"] = (
            (adjusted["combined_disruption_score"] >= 0.58)
            | (adjusted["max_aqi"] >= 280)
            | (adjusted["max_rain_mm"] >= 18)
            | (adjusted["max_heat_risk"] >= 0.70)
        ).astype(int)
        return adjusted

    def _build_counterfactual_forecast(self, history: pd.DataFrame, forecast: pd.DataFrame) -> pd.DataFrame:
        neutral = forecast.copy()
        recent = history.sort_values("week_start").tail(12)

        actual_disruption_mean = float(neutral["combined_disruption_score"].mean())
        actual_peak_aqi = float(neutral["max_aqi"].max())
        actual_total_rain = float(neutral["max_rain_mm"].sum())
        actual_peak_heat = float(neutral["max_heat_risk"].max())

        target_disruption_mean = min(
            actual_disruption_mean,
            max(0.18, float(recent["mean_combined_disruption"].quantile(0.35)) if not recent.empty else 0.18),
        )
        target_peak_aqi = min(
            actual_peak_aqi,
            max(120.0, float(recent["max_aqi"].quantile(0.40)) if not recent.empty else 120.0),
        )
        target_total_rain = min(
            actual_total_rain,
            max(10.0, float(recent["avg_rain_mm"].median() * 7.0) if not recent.empty else 10.0),
        )
        target_peak_heat = min(
            actual_peak_heat,
            max(0.34, float(recent["max_heat_risk"].quantile(0.40)) if not recent.empty else 0.34),
        )

        if actual_disruption_mean > 0:
            neutral["combined_disruption_score"] *= target_disruption_mean / actual_disruption_mean
        if actual_peak_aqi > 0:
            neutral["max_aqi"] *= target_peak_aqi / actual_peak_aqi
        if actual_total_rain > 0:
            neutral["max_rain_mm"] *= target_total_rain / actual_total_rain
        if actual_peak_heat > 0:
            neutral["max_heat_risk"] *= target_peak_heat / actual_peak_heat

        neutral["combined_disruption_score"] = neutral["combined_disruption_score"].clip(lower=0.0, upper=1.0)
        neutral["max_heat_risk"] = neutral["max_heat_risk"].clip(lower=0.0, upper=1.0)
        neutral["trigger_event"] = (
            (neutral["combined_disruption_score"] >= 0.58)
            | (neutral["max_aqi"] >= 280)
            | (neutral["max_rain_mm"] >= 18)
            | (neutral["max_heat_risk"] >= 0.70)
        ).astype(int)
        return neutral

    def _estimate_historical_disruption_drag(self, history: pd.DataFrame) -> float:
        recent = history.sort_values("week_start").tail(26).copy()
        if recent.empty:
            return 0.12
        severe_mask = (
            (recent["mean_combined_disruption"] >= 0.42)
            | (recent["trigger_days"] >= 2)
            | (recent["max_rain_mm"] >= 18)
            | (recent["max_heat_risk"] >= 0.70)
        )
        severe = recent.loc[severe_mask, "weekly_income"]
        mild = recent.loc[~severe_mask, "weekly_income"]
        if severe.empty or mild.empty:
            return 0.12
        mild_mean = float(mild.mean())
        severe_mean = float(severe.mean())
        if mild_mean <= 0:
            return 0.12
        return self._clip01(max(0.0, mild_mean - severe_mean) / mild_mean)

    def _estimate_worker_stress_susceptibility(self, history: pd.DataFrame) -> float:
        latest = history.sort_values("week_start").iloc[-1]
        weather_sensitivity = {
            "low": 0.18,
            "medium": 0.42,
            "high": 0.68,
        }.get(str(latest["weather_sensitivity"]).lower(), 0.35)
        historical_drag = self._estimate_historical_disruption_drag(history)
        resilience_penalty = 1.0 - float(latest["resilience_score"])
        attendance_penalty = 1.0 - float(latest["attendance_discipline"])
        return self._clip01(
            0.38 * historical_drag
            + 0.28 * weather_sensitivity
            + 0.22 * resilience_penalty
            + 0.12 * attendance_penalty
        )

    def _estimate_stress_income_drag(
        self,
        history: pd.DataFrame,
        actual_meta: dict[str, float],
        neutral_meta: dict[str, float],
        counterfactual_baseline_income: float,
    ) -> dict[str, float]:
        stress_delta = self._clip01(
            0.38 * max(0.0, float(actual_meta["forecast_disruption_mean"]) - float(neutral_meta["forecast_disruption_mean"]))
            + 0.20 * max(0.0, float(actual_meta["forecast_trigger_probability"]) - float(neutral_meta["forecast_trigger_probability"]))
            + 0.18 * max(0.0, float(actual_meta["forecast_total_rain_mm"]) - float(neutral_meta["forecast_total_rain_mm"])) / 90.0
            + 0.14 * max(0.0, float(actual_meta["forecast_peak_heat_risk"]) - float(neutral_meta["forecast_peak_heat_risk"]))
            + 0.10 * max(0.0, float(actual_meta["forecast_peak_aqi"]) - float(neutral_meta["forecast_peak_aqi"])) / 220.0
        )
        worker_susceptibility = self._estimate_worker_stress_susceptibility(history)
        effective_stress_delta = max(0.0, stress_delta - 0.10)
        drag_ratio = self._clip01(effective_stress_delta * (0.18 + 0.95 * worker_susceptibility))
        drag_inr = counterfactual_baseline_income * drag_ratio
        return {
            "stress_delta": round(stress_delta, 4),
            "effective_stress_delta": round(effective_stress_delta, 4),
            "worker_stress_susceptibility": round(worker_susceptibility, 4),
            "stress_income_drag_ratio": round(drag_ratio, 4),
            "stress_income_drag_inr": round(drag_inr, 2),
        }

    def _prepare_quote_inputs(
        self,
        history: pd.DataFrame,
        city_weekly: pd.DataFrame,
        forecast: pd.DataFrame,
        no_claim_weeks: int,
    ) -> tuple[float, dict]:
        predicted_income, meta = self.earnings.predict_next_week_income(history, forecast)
        meta["forecast_window_start"] = str(forecast["date"].min())
        meta["forecast_window_end"] = str(forecast["date"].max())
        meta["fragility_profile"] = self._build_fragility_profile(history, city_weekly, meta, no_claim_weeks)
        return predicted_income, meta

    def _quote_from_forecast(
        self,
        history: pd.DataFrame,
        city_weekly: pd.DataFrame,
        forecast: pd.DataFrame,
        no_claim_weeks: int,
    ) -> dict:
        neutral_forecast = self._build_counterfactual_forecast(history, forecast)
        predicted_income, meta = self._prepare_quote_inputs(history, city_weekly, forecast, no_claim_weeks)
        neutral_income, neutral_meta = self._prepare_quote_inputs(history, city_weekly, neutral_forecast, no_claim_weeks)
        counterfactual_baseline_income = max(float(meta["baseline_income_trailing_12w"]), neutral_income)
        stress_drag = self._estimate_stress_income_drag(history, meta, neutral_meta, counterfactual_baseline_income)
        adjusted_predicted_income = max(
            120.0,
            min(
                predicted_income,
                counterfactual_baseline_income - float(stress_drag["stress_income_drag_inr"]),
            ),
        )
        meta["counterfactual_baseline_income_inr"] = counterfactual_baseline_income
        meta["stress_income_drag_inr"] = stress_drag["stress_income_drag_inr"]
        meta["stress_income_drag_ratio"] = stress_drag["stress_income_drag_ratio"]
        meta["worker_stress_susceptibility"] = stress_drag["worker_stress_susceptibility"]
        meta["forecast_stress_delta"] = stress_drag["stress_delta"]
        meta["effective_forecast_stress_delta"] = stress_drag["effective_stress_delta"]
        return self._price_quote(history, adjusted_predicted_income, meta, no_claim_weeks=no_claim_weeks)

    def _should_apply_rain_monotonic_floor(
        self,
        baseline_forecast: pd.DataFrame,
        adjusted_forecast: pd.DataFrame,
        forecast_overrides: dict[str, Any] | None,
    ) -> bool:
        if not forecast_overrides:
            return False
        rain_multiplier = float(forecast_overrides.get("rain_multiplier", 1.0))
        explicit_rain_override = "max_rain_mm" in forecast_overrides
        if rain_multiplier <= 1.0 and not explicit_rain_override:
            return False

        baseline_total_rain = float(baseline_forecast["max_rain_mm"].sum())
        adjusted_total_rain = float(adjusted_forecast["max_rain_mm"].sum())
        adjusted_peak_rain = float(adjusted_forecast["max_rain_mm"].max())
        rain_increase = adjusted_total_rain - baseline_total_rain

        return rain_increase >= 4.0 and (adjusted_peak_rain >= 18.0 or adjusted_total_rain >= 35.0)

    def _price_quote(self, history: pd.DataFrame, predicted_income: float, meta: dict, no_claim_weeks: int) -> dict:
        latest = history.sort_values("week_start").iloc[-1]
        trailing_baseline_income = float(meta["baseline_income_trailing_12w"])
        counterfactual_baseline_income = float(meta.get("counterfactual_baseline_income_inr", trailing_baseline_income))
        baseline_income = max(trailing_baseline_income, counterfactual_baseline_income, predicted_income)
        expected_shortfall = max(0.0, baseline_income - predicted_income)
        shortfall_share = self._clip01(expected_shortfall / max(1.0, baseline_income))
        weather_stress = float(meta["forecast_weather_stress_index"])
        avg_gig_income = max(1.0, float(meta["avg_gig_income_trailing_8w"]))
        fragility = meta["fragility_profile"]
        disruption_probability = float(fragility["forecast_event_pressure"])
        base_rate = max(
            self.parameters["minimum_premium_inr"],
            baseline_income
            * (
                self.parameters["target_base_share_of_income"]
                + 0.003 * fragility["forecast_event_pressure"]
                + 0.0015 * fragility["aria_total"]
            ),
        )
        expected_loss_component = expected_shortfall * (
            self.parameters["target_expected_loss_share"]
            + 0.035 * fragility["forecast_event_pressure"]
            + 0.015 * fragility["aria_environmental"]
        )
        structural_loading_inr = base_rate * (
            0.12 * fragility["aria_structural"]
            + 0.05 * fragility["aria_environmental"]
            + 0.03 * fragility["earnings_regime_shift_loading"]
            + 0.03 * fragility["resilience_decline_loading"]
            + 0.02 * fragility["shift_architecture_risk"]
            + 0.015 * fragility["platform_dependency_loading"]
            + 0.015 * fragility["aqi_sensitivity_loading"]
            + 0.02 * fragility["severe_rain_loading"]
        )
        stability_credit_inr = min(
            base_rate * 0.55,
            baseline_income
            * (
                0.008 * fragility["weather_resilience_dividend"]
                + 0.004 * fragility["resilience_improvement_credit"]
                + 0.008 * (min(no_claim_weeks, 8) / 8.0)
            ),
        )
        affordability_share = min(
            self.parameters["target_max_share_of_income"],
            0.038
            + 0.015 * fragility["forecast_event_pressure"]
            + 0.01 * fragility["aria_total"],
        )
        severe_rain_floor_inr = base_rate * (
            0.88
            + 0.08 * fragility["severe_rain_loading"]
            + 0.03 * fragility["aria_environmental"]
        )
        premium_inr = base_rate + expected_loss_component + structural_loading_inr - stability_credit_inr
        premium_inr = max(premium_inr, severe_rain_floor_inr)
        premium_inr = max(self.parameters["minimum_premium_inr"], premium_inr)
        premium_inr = min(premium_inr, predicted_income * affordability_share)

        coverage_cap_inr = baseline_income * (
            0.78
            + 0.85 * fragility["forecast_event_pressure"]
            + 0.25 * fragility["aria_structural"]
            + 0.15 * fragility["aria_environmental"]
        )
        coverage_cap_inr = max(350.0, min(coverage_cap_inr, baseline_income * 1.90))

        severity_index = (
            0.34 * fragility["forecast_event_pressure"]
            + 0.24 * weather_stress
            + 0.16 * fragility["aria_environmental"]
            + 0.16 * fragility["aria_structural"]
            + 0.06 * fragility["aqi_sensitivity_loading"]
        )
        if severity_index >= 0.76:
            risk_label = "High"
        elif severity_index >= 0.46:
            risk_label = "Moderate"
        else:
            risk_label = "Low"

        quote_confidence_score, quote_confidence_band, quote_confidence_components = self._estimate_quote_confidence(
            history,
            fragility,
            meta,
        )

        pricing_receipt = {
            "thesis": "We price recovery failure under disruption, not weather alone.",
            "component_groups": {
                "baseline": {
                    "base_rate_inr": round(base_rate, 2),
                    "counterfactual_baseline_income_inr": round(counterfactual_baseline_income, 2),
                    "expected_loss_component_inr": round(expected_loss_component, 2),
                },
                "risk_loadings": {
                    "structural_loading_inr": round(structural_loading_inr, 2),
                    "aria_structural_score": round(fragility["aria_structural"], 4),
                    "aria_environmental_score": round(fragility["aria_environmental"], 4),
                    "forecast_event_pressure": round(fragility["forecast_event_pressure"], 4),
                    "shortfall_share": round(shortfall_share, 4),
                    "earnings_regime_shift_loading": round(fragility["earnings_regime_shift_loading"], 4),
                    "resilience_decline_loading": round(fragility["resilience_decline_loading"], 4),
                    "platform_dependency_loading": round(fragility["platform_dependency_loading"], 4),
                    "shift_architecture_risk": round(fragility["shift_architecture_risk"], 4),
                },
                "credits": {
                    "stability_credit_inr": round(stability_credit_inr, 2),
                    "weather_resilience_dividend_score": round(fragility["weather_resilience_dividend"], 4),
                    "resilience_trajectory_label": fragility["resilience_trajectory_label"],
                },
                "guardrails": {
                    "minimum_premium_inr": round(self.parameters["minimum_premium_inr"], 2),
                    "premium_share_cap_of_income": round(affordability_share, 4),
                    "severe_rain_floor_inr": round(severe_rain_floor_inr, 2),
                },
                "confidence": {
                    "quote_confidence_score": quote_confidence_score,
                    "quote_confidence_band": quote_confidence_band,
                    **quote_confidence_components,
                },
            },
        }

        return {
            "predicted_next_week_income_inr": round(predicted_income, 2),
            "counterfactual_baseline_income_inr": round(counterfactual_baseline_income, 2),
            "baseline_income_trailing_12w_inr": round(baseline_income, 2),
            "expected_income_shortfall_inr": round(expected_shortfall, 2),
            "expected_income_shortfall_share": round(shortfall_share, 4),
            "stress_income_drag_inr": round(float(meta.get("stress_income_drag_inr", 0.0)), 2),
            "stress_income_drag_ratio": round(float(meta.get("stress_income_drag_ratio", 0.0)), 4),
            "worker_stress_susceptibility": round(float(meta.get("worker_stress_susceptibility", 0.0)), 4),
            "forecast_stress_delta": round(float(meta.get("forecast_stress_delta", 0.0)), 4),
            "effective_forecast_stress_delta": round(float(meta.get("effective_forecast_stress_delta", 0.0)), 4),
            "forecast_disruption_probability": round(disruption_probability, 4),
            "forecast_weather_stress_index": round(weather_stress, 4),
            "forecast_peak_aqi": round(float(meta["forecast_peak_aqi"]), 2),
            "forecast_total_rain_mm": round(float(meta["forecast_total_rain_mm"]), 2),
            "forecast_peak_heat_risk": round(float(meta["forecast_peak_heat_risk"]), 4),
            "forecast_event_pressure": float(fragility["forecast_event_pressure"]),
            "aria_structural": float(fragility["aria_structural"]),
            "aria_environmental": float(fragility["aria_environmental"]),
            "aria_total": float(fragility["aria_total"]),
            "recovery_lag_weeks_est": float(fragility["recovery_lag_weeks_est"]),
            "ifas": float(fragility["ifas"]),
            "bisi_risk": float(fragility["bisi_risk"]),
            "earnings_regime_shift_ratio": float(fragility["earnings_regime_shift_ratio"]),
            "earnings_regime_shift_loading": float(fragility["earnings_regime_shift_loading"]),
            "resilience_trajectory_score": float(fragility["resilience_trajectory_score"]),
            "resilience_decline_loading": float(fragility["resilience_decline_loading"]),
            "resilience_improvement_credit": float(fragility["resilience_improvement_credit"]),
            "resilience_trajectory_label": fragility["resilience_trajectory_label"],
            "swec": float(fragility["swec"]),
            "shift_architecture_risk": float(fragility["shift_architecture_risk"]),
            "platform_dependency_loading": float(fragility["platform_dependency_loading"]),
            "weather_resilience_dividend": float(fragility["weather_resilience_dividend"]),
            "stability_credit_inr": round(stability_credit_inr, 2),
            "city_rebound_velocity": float(fragility["city_rebound_velocity"]),
            "city_rebound_lag_weeks": float(fragility["city_rebound_lag_weeks"]),
            "seasonal_risk_phase": fragility["seasonal_risk_phase"],
            "seasonal_risk_phase_score": float(fragility["seasonal_risk_phase_score"]),
            "aqi_sensitivity_loading": float(fragility["aqi_sensitivity_loading"]),
            "severe_rain_loading": float(fragility["severe_rain_loading"]),
            "severe_rain_floor_inr": round(severe_rain_floor_inr, 2),
            "premium_inr": round(premium_inr, 2),
            "premium_deliveries": round(premium_inr / avg_gig_income, 2),
            "coverage_cap_inr": round(coverage_cap_inr, 2),
            "coverage_cap_deliveries": round(coverage_cap_inr / avg_gig_income, 2),
            "risk_label": risk_label,
            "quote_confidence_score": quote_confidence_score,
            "quote_confidence_band": quote_confidence_band,
            "rain_monotonic_floor_applied": False,
            "pricing_receipt": pricing_receipt,
        }

    def quote_worker(
        self,
        worker_id: str,
        platform_name: str | None,
        feature_tables,
        horizon_days: int = 7,
        no_claim_weeks: int = 0,
        forecast_overrides: dict[str, Any] | None = None,
    ) -> dict:
        weekly = feature_tables.weekly_driver
        history = weekly[weekly["platform_driver_id"] == worker_id].sort_values("week_start")
        if history.empty:
            raise ValueError(f"Worker {worker_id} not found in cached weekly features.")
        latest = history.iloc[-1]
        if platform_name and latest["platform_name"].lower() != platform_name.lower():
            raise ValueError(f"Worker {worker_id} exists, but platform does not match {platform_name}.")
        city_weekly = weekly[weekly["city"] == latest["city"]].sort_values("week_start").copy()

        baseline_forecast = self.environment.forecast_city_week(
            city=str(latest["city"]),
            state=str(latest["state"]),
            city_day=feature_tables.city_day,
            horizon_days=horizon_days,
        )
        forecast = self._apply_forecast_overrides(baseline_forecast, forecast_overrides)
        quote = self._quote_from_forecast(history, city_weekly, forecast, no_claim_weeks=no_claim_weeks)

        if self._should_apply_rain_monotonic_floor(baseline_forecast, forecast, forecast_overrides):
            baseline_quote = self._quote_from_forecast(
                history,
                city_weekly,
                baseline_forecast,
                no_claim_weeks=no_claim_weeks,
            )
            baseline_premium_inr = float(baseline_quote["premium_inr"])
            rain_floor_inr = round(
                baseline_premium_inr * (1.0 + 0.04 * float(quote["severe_rain_loading"])),
                2,
            )
            if float(quote["premium_inr"]) < rain_floor_inr:
                avg_gig_income = max(1.0, float(history.sort_values("week_start").tail(8)["avg_gig_income"].mean()))
                quote["premium_inr"] = rain_floor_inr
                quote["premium_deliveries"] = round(rain_floor_inr / avg_gig_income, 2)
                quote["rain_monotonic_floor_applied"] = True
                quote["rain_monotonic_floor_inr"] = rain_floor_inr
                quote["baseline_premium_inr"] = round(baseline_premium_inr, 2)

        return {
            "worker_id": worker_id,
            "platform_name": str(latest["platform_name"]),
            "city": str(latest["city"]),
            "state": str(latest["state"]),
            "latest_observed_week": str(latest["week_start"]),
            "lookback_weeks_used": int(min(len(history), 52)),
            "forecast_window_days": int(horizon_days),
            "forecast_window_start": str(forecast["date"].min()),
            "forecast_window_end": str(forecast["date"].max()),
            **quote,
        }


def save_premium_spec(artifact_dir: Path) -> None:
    spec = {
        "pricing_logic": "Premium = Base Rate x (1 + ARIA_structural) x (1 + 0.5 x ARIA_environmental) x FEPS_multiplier - Weather Resilience Dividend.",
        "signature_index": "ARIA = Adaptive Recovery Income Architecture",
        "aria_structural": "0.30*ERL + 0.20*(1-IFAS) + 0.20*SWEC + 0.15*BISI_risk + 0.15*PCR",
        "aria_environmental": "0.40*(1-CRV) + 0.35*SRPL + 0.25*FEPS",
        "core_components": [
            "ERL = Earnings Recovery Half-Life",
            "IFAS = Income Floor Adequacy Score",
            "BISI = Baseline Income Stability Index risk loading",
            "SWEC = Severe Weather Earning Concentration",
            "PCR = Platform Concentration Ratio proxy",
            "CRV = City Rebound Velocity",
            "SRPL = Seasonal Risk Phase Loading",
            "FEPS = Forecast Event Pressure Score",
            "Severe Rain Loading",
            "Weather Resilience Dividend",
        ],
        "coverage_logic": "Coverage grows with baseline income, forecast event pressure, and ARIA-driven fragility under disruption.",
    }
    (artifact_dir / "premium_spec.json").write_text(json.dumps(spec, indent=2), encoding="utf-8")
