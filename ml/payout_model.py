from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .premium_model import PremiumEngine


@dataclass(slots=True)
class PayoutEngine:
    artifact_dir: Path
    premium: PremiumEngine = field(init=False)
    parameters: dict[str, float] = field(init=False)

    def __post_init__(self) -> None:
        self.premium = PremiumEngine(self.artifact_dir)
        self.parameters = {
            "minimum_actionable_shortfall_inr": 12.0,
            "base_deductible_inr": 18.0,
            "max_window_coverage_share": 0.65,
        }

    @staticmethod
    def _clip01(value: float) -> float:
        return max(0.0, min(1.0, float(value)))

    @staticmethod
    def _norm_text(value: str | None) -> str:
        return (value or "").strip().lower()

    def _trigger_strength(self, quote: dict[str, Any], verified_incident: bool) -> float:
        trigger_strength = self._clip01(
            0.34 * float(quote["forecast_event_pressure"])
            + 0.24 * float(quote["effective_forecast_stress_delta"])
            + 0.14 * float(quote["severe_rain_loading"])
            + 0.10 * float(quote["forecast_peak_heat_risk"])
            + 0.08 * float(quote["aqi_sensitivity_loading"])
            + 0.10 * float(quote["expected_income_shortfall_share"])
        )
        if verified_incident:
            trigger_strength = self._clip01(trigger_strength + 0.10)
        return trigger_strength

    def _observed_loss_ratio(
        self,
        quote: dict[str, Any],
        trigger_strength: float,
        loss_ratio_override: float | None,
    ) -> float:
        if loss_ratio_override is not None:
            return self._clip01(loss_ratio_override)
        return self._clip01(
            0.58 * float(quote["expected_income_shortfall_share"])
            + 0.30 * trigger_strength
            + 0.12 * (1.0 - float(quote["city_rebound_velocity"]))
        )

    def _peer_loss_ratio(self, quote: dict[str, Any], feature_tables) -> float:
        weekly = feature_tables.weekly_driver
        cohort = weekly[
            (weekly["city"] == quote["city"])
            & (weekly["platform_name"] == quote["platform_name"])
        ].copy()
        if len(cohort) < 18:
            return 0.14

        severe_mask = (
            (cohort["mean_combined_disruption"] >= 0.42)
            | (cohort["trigger_days"] >= 2)
            | (cohort["max_rain_mm"] >= 18)
            | (cohort["max_heat_risk"] >= 0.70)
        )
        severe = cohort.loc[severe_mask, "weekly_income"]
        mild = cohort.loc[~severe_mask, "weekly_income"]
        if severe.empty or mild.empty:
            return 0.14
        mild_mean = float(mild.mean())
        severe_mean = float(severe.mean())
        if mild_mean <= 0:
            return 0.14
        return self._clip01(max(0.0, mild_mean - severe_mean) / mild_mean)

    def _cohort_support_score(self, observed_loss_ratio: float, peer_loss_ratio: float) -> float:
        divergence = abs(observed_loss_ratio - peer_loss_ratio)
        tolerance = max(0.08, peer_loss_ratio * 0.75 + 0.05)
        return self._clip01(1.0 - (divergence / tolerance))

    def _certainty_band(self, trigger_strength: float, claim_confidence: float) -> tuple[str, float, float]:
        certainty_score = self._clip01(0.55 * trigger_strength + 0.45 * claim_confidence)
        if certainty_score >= 0.72:
            return "high", 0.95, certainty_score
        if certainty_score >= 0.48:
            return "medium", 0.82, certainty_score
        return "low", 0.65, certainty_score

    def _location_alignment(
        self,
        quote: dict[str, Any],
        incident_city: str | None,
        incident_state: str | None,
    ) -> tuple[float, str]:
        worker_city = self._norm_text(quote.get("city"))
        worker_state = self._norm_text(quote.get("state"))
        incident_city_norm = self._norm_text(incident_city)
        incident_state_norm = self._norm_text(incident_state)
        if not incident_city_norm and not incident_state_norm:
            return 0.65, "not_provided"
        if incident_city_norm and incident_city_norm == worker_city:
            return 1.0, "same_city"
        if incident_state_norm and incident_state_norm == worker_state:
            return 0.72, "same_state"
        return 0.18, "mismatch"

    def _counterfactual_coherence_score(
        self,
        quote: dict[str, Any],
        trigger_strength: float,
        observed_loss_ratio: float,
    ) -> float:
        expected_loss_signal = self._clip01(
            0.52 * float(quote["expected_income_shortfall_share"])
            + 0.28 * float(quote["effective_forecast_stress_delta"])
            + 0.20 * trigger_strength
        )
        divergence = abs(observed_loss_ratio - expected_loss_signal)
        return self._clip01(1.0 - (divergence / 0.35))

    def _environment_forecast_agreement_score(self, quote: dict[str, Any]) -> float:
        return self._clip01(
            0.62 * float(quote["forecast_event_pressure"])
            + 0.38 * float(quote["effective_forecast_stress_delta"])
        )

    def _historical_data_depth_score(self, quote: dict[str, Any]) -> float:
        return self._clip01(float(quote["lookback_weeks_used"]) / 52.0)

    def _registration_timing_penalty(self, days_since_enrollment: int | None) -> float:
        if days_since_enrollment is None:
            return 0.0
        if days_since_enrollment <= 7:
            return 0.22
        if days_since_enrollment <= 21:
            return 0.12
        if days_since_enrollment <= 42:
            return 0.05
        return 0.0

    def _decision_confidence_score(
        self,
        trigger_strength: float,
        location_alignment_score: float,
        cohort_support_score: float,
        counterfactual_coherence_score: float,
        historical_data_depth_score: float,
        environment_forecast_agreement_score: float,
        registration_timing_penalty: float,
    ) -> tuple[int, str, dict[str, float]]:
        raw_score = (
            0.30 * location_alignment_score
            + 0.20 * trigger_strength
            + 0.20 * cohort_support_score
            + 0.15 * counterfactual_coherence_score
            + 0.10 * historical_data_depth_score
            + 0.05 * environment_forecast_agreement_score
            - registration_timing_penalty
        )
        score = max(0, min(100, int(round(100.0 * raw_score))))
        if score >= 80:
            band = "very_strong"
        elif score >= 60:
            band = "good"
        elif score >= 40:
            band = "uncertain"
        else:
            band = "weak"
        if score >= 80:
            trust_action = "auto_allow"
        elif score >= 60:
            trust_action = "allow_with_checks"
        elif score >= 40:
            trust_action = "soft_hold"
        else:
            trust_action = "manual_review"
        return score, band, {
            "location_alignment_score": round(location_alignment_score, 4),
            "trigger_strength_score": round(trigger_strength, 4),
            "cohort_support_score": round(cohort_support_score, 4),
            "counterfactual_coherence_score": round(counterfactual_coherence_score, 4),
            "historical_data_depth_score": round(historical_data_depth_score, 4),
            "environment_forecast_agreement_score": round(environment_forecast_agreement_score, 4),
            "registration_timing_penalty": round(registration_timing_penalty, 4),
            "recommended_trust_action": trust_action,
        }

    def assess_worker_payout(
        self,
        worker_id: str,
        platform_name: str | None,
        feature_tables,
        horizon_days: int = 1,
        affected_days: int = 1,
        no_claim_weeks: int = 0,
        forecast_overrides: dict[str, Any] | None = None,
        verified_incident: bool = False,
        loss_ratio_override: float | None = None,
        incident_city: str | None = None,
        incident_state: str | None = None,
        days_since_enrollment: int | None = None,
    ) -> dict[str, Any]:
        quote = self.premium.quote_worker(
            worker_id=worker_id,
            platform_name=platform_name,
            feature_tables=feature_tables,
            horizon_days=horizon_days,
            no_claim_weeks=no_claim_weeks,
            forecast_overrides=forecast_overrides,
        )

        window_days = max(1, int(quote["forecast_window_days"]))
        affected_days = max(1, min(int(affected_days), window_days))
        affected_share = self._clip01(affected_days / window_days)

        trigger_strength = self._trigger_strength(quote, verified_incident)
        observed_loss_ratio = self._observed_loss_ratio(quote, trigger_strength, loss_ratio_override)
        peer_loss_ratio = self._peer_loss_ratio(quote, feature_tables)

        counterfactual_window_income = float(quote["counterfactual_baseline_income_inr"]) * affected_share
        expected_shortfall_window_inr = float(quote["expected_income_shortfall_inr"]) * affected_share
        worker_loss_basis_inr = max(
            expected_shortfall_window_inr,
            counterfactual_window_income * observed_loss_ratio,
        )
        peer_sanity_cap_inr = counterfactual_window_income * max(observed_loss_ratio, min(1.0, peer_loss_ratio * 1.15))
        gross_loss_basis_inr = min(worker_loss_basis_inr, max(expected_shortfall_window_inr, peer_sanity_cap_inr))

        deductible_ratio = max(0.06, 0.24 - 0.14 * trigger_strength)
        deductible_inr = max(
            self.parameters["base_deductible_inr"] * affected_share,
            gross_loss_basis_inr * deductible_ratio,
        )

        claim_confidence = self._clip01(
            0.48 * trigger_strength
            + 0.28 * float(quote["expected_income_shortfall_share"])
            + 0.14 * float(quote["forecast_event_pressure"])
            + 0.10 * (1.0 - float(quote["city_rebound_velocity"]))
        )
        if verified_incident:
            claim_confidence = self._clip01(claim_confidence + 0.08)
        certainty_band, certainty_multiplier, certainty_score = self._certainty_band(trigger_strength, claim_confidence)
        location_alignment_score, location_alignment_label = self._location_alignment(quote, incident_city, incident_state)
        cohort_support_score = self._cohort_support_score(observed_loss_ratio, peer_loss_ratio)
        counterfactual_coherence_score = self._counterfactual_coherence_score(quote, trigger_strength, observed_loss_ratio)
        historical_data_depth_score = self._historical_data_depth_score(quote)
        environment_forecast_agreement_score = self._environment_forecast_agreement_score(quote)
        registration_timing_penalty = self._registration_timing_penalty(days_since_enrollment)
        decision_confidence_score, decision_confidence_band, decision_confidence_components = self._decision_confidence_score(
            trigger_strength,
            location_alignment_score,
            cohort_support_score,
            counterfactual_coherence_score,
            historical_data_depth_score,
            environment_forecast_agreement_score,
            registration_timing_penalty,
        )

        severity_multiplier = 0.72 + 0.48 * trigger_strength + 0.18 * float(quote["aria_environmental"])
        gross_payable_inr = gross_loss_basis_inr * severity_multiplier * certainty_multiplier

        recovery_holdback_ratio = self._clip01(
            0.18 * (1.0 - trigger_strength)
            + 0.10 * float(quote["city_rebound_velocity"])
            + 0.06 * float(quote["weather_resilience_dividend"])
        )
        gross_after_deductible = max(0.0, gross_payable_inr - deductible_inr)
        holdback_inr = gross_after_deductible * recovery_holdback_ratio

        shortfall_guardrail_inr = expected_shortfall_window_inr * (0.88 + 0.28 * trigger_strength)
        coverage_guardrail_inr = float(quote["coverage_cap_inr"]) * min(
            self.parameters["max_window_coverage_share"],
            0.18 + 0.90 * affected_share,
        )
        income_guardrail_inr = counterfactual_window_income * (0.55 + 0.30 * trigger_strength)
        payout_cap_inr = min(shortfall_guardrail_inr, coverage_guardrail_inr, income_guardrail_inr)

        payout_eligible = (
            trigger_strength >= 0.30
            and gross_loss_basis_inr >= self.parameters["minimum_actionable_shortfall_inr"]
        ) or verified_incident

        net_payout_inr = 0.0
        recommended_action = "no_payout"
        if payout_eligible:
            net_payout_inr = max(0.0, min(gross_after_deductible - holdback_inr, payout_cap_inr))
            if net_payout_inr > 0:
                recommended_action = "auto_payout" if claim_confidence >= 0.62 else "partial_payout"

        retained_exposure_inr = max(0.0, gross_loss_basis_inr - net_payout_inr)
        payout_receipt = {
            "thesis": "We pay when forecasted disruption and observed worker impact create a credible income-loss event.",
            "decision_summary": {
                "recommended_action": recommended_action,
                "payout_eligible": bool(payout_eligible and net_payout_inr > 0),
                "certainty_band": certainty_band,
                "certainty_score": round(certainty_score, 4),
                "decision_confidence_score": decision_confidence_score,
                "decision_confidence_band": decision_confidence_band,
                "recommended_trust_action": decision_confidence_components["recommended_trust_action"],
            },
            "loss_basis": {
                "counterfactual_window_income_inr": round(counterfactual_window_income, 2),
                "worker_loss_basis_inr": round(worker_loss_basis_inr, 2),
                "peer_loss_ratio": round(peer_loss_ratio, 4),
                "peer_sanity_cap_inr": round(peer_sanity_cap_inr, 2),
                "gross_loss_basis_inr": round(gross_loss_basis_inr, 2),
            },
            "guardrails": {
                "deductible_inr": round(deductible_inr, 2),
                "holdback_inr": round(holdback_inr, 2),
                "payout_cap_inr": round(payout_cap_inr, 2),
                "retained_exposure_inr": round(retained_exposure_inr, 2),
            },
            "evidence": {
                "location_alignment_label": location_alignment_label,
                **decision_confidence_components,
            },
        }

        return {
            **quote,
            "assessment_type": "payout",
            "affected_days": affected_days,
            "affected_share_of_window": round(affected_share, 4),
            "verified_incident": verified_incident,
            "payout_trigger_strength": round(trigger_strength, 4),
            "claim_confidence": round(claim_confidence, 4),
            "decision_confidence_score": decision_confidence_score,
            "decision_confidence_band": decision_confidence_band,
            "recommended_trust_action": decision_confidence_components["recommended_trust_action"],
            "trigger_certainty_band": certainty_band,
            "trigger_certainty_score": round(certainty_score, 4),
            "trigger_certainty_multiplier": round(certainty_multiplier, 4),
            "location_alignment_score": round(location_alignment_score, 4),
            "location_alignment_score_100": int(round(location_alignment_score * 100.0)),
            "location_alignment_label": location_alignment_label,
            "historical_data_depth_score": round(historical_data_depth_score, 4),
            "cohort_support_score": round(cohort_support_score, 4),
            "counterfactual_coherence_score": round(counterfactual_coherence_score, 4),
            "environment_forecast_agreement_score": round(environment_forecast_agreement_score, 4),
            "registration_timing_penalty": round(registration_timing_penalty, 4),
            "observed_loss_ratio": round(observed_loss_ratio, 4),
            "peer_loss_ratio": round(peer_loss_ratio, 4),
            "counterfactual_window_income_inr": round(counterfactual_window_income, 2),
            "expected_shortfall_window_inr": round(expected_shortfall_window_inr, 2),
            "worker_loss_basis_inr": round(worker_loss_basis_inr, 2),
            "peer_sanity_cap_inr": round(peer_sanity_cap_inr, 2),
            "gross_loss_basis_inr": round(gross_loss_basis_inr, 2),
            "deductible_inr": round(deductible_inr, 2),
            "holdback_inr": round(holdback_inr, 2),
            "gross_payable_inr": round(gross_payable_inr, 2),
            "payout_cap_inr": round(payout_cap_inr, 2),
            "recommended_payout_inr": round(net_payout_inr, 2),
            "retained_exposure_inr": round(retained_exposure_inr, 2),
            "recommended_action": recommended_action,
            "payout_eligible": bool(payout_eligible and net_payout_inr > 0),
            "payout_receipt": payout_receipt,
        }
