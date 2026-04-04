from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .inference import build_payout_response, build_worker_response


app = FastAPI(title="GIGSurance Premium API", version="2.0.0")


class QuoteRequest(BaseModel):
    worker_id: str = Field(..., description="platform_driver_id from the cached worker feature table")
    platform_name: str | None = Field(default=None, description="Optional platform validation like zomato or swiggy")
    horizon_days: int = Field(7, ge=3, le=14, description="Forecast horizon used for premium pricing")
    no_claim_weeks: int = Field(0, ge=0, description="Optional pricing discount input")
    forecast_overrides: dict[str, Any] = Field(
        default_factory=dict,
        description="Optional override inputs for AQI, rain, heat, or disruption when simulating live scenarios",
    )


class BatchQuoteItem(BaseModel):
    worker_id: str = Field(..., description="platform_driver_id to quote")
    platform_name: str | None = Field(default=None, description="Optional platform validation like zomato or swiggy")
    no_claim_weeks: int | None = Field(default=None, ge=0, description="Optional per-driver loyalty discount input")
    horizon_days: int | None = Field(default=None, ge=3, le=14, description="Optional per-driver forecast horizon override")
    forecast_overrides: dict[str, Any] | None = Field(
        default=None,
        description="Optional per-driver override inputs for AQI, rain, heat, or disruption",
    )


class BatchQuoteRequest(BaseModel):
    items: list[BatchQuoteItem] = Field(..., min_length=1, max_length=100, description="Drivers to quote in one request")
    horizon_days: int = Field(7, ge=3, le=14, description="Default forecast horizon for items that do not override it")
    no_claim_weeks: int = Field(0, ge=0, description="Default loyalty discount input for items that do not override it")
    forecast_overrides: dict[str, Any] = Field(
        default_factory=dict,
        description="Default override inputs applied to items that do not provide their own overrides",
    )
    continue_on_error: bool = Field(
        default=True,
        description="When true, return partial successes and per-item errors instead of failing the whole batch.",
    )


class PayoutRequest(BaseModel):
    worker_id: str = Field(..., description="platform_driver_id from the live worker record")
    platform_name: str | None = Field(default=None, description="Optional platform validation like zomato or swiggy")
    horizon_days: int = Field(1, ge=1, le=7, description="Observed or forecast payout window in days")
    affected_days: int = Field(1, ge=1, le=7, description="Days in the window materially affected by disruption")
    incident_city: str | None = Field(default=None, description="Optional affected city used for location-alignment confidence")
    incident_state: str | None = Field(default=None, description="Optional affected state used for location-alignment confidence")
    days_since_enrollment: int | None = Field(default=None, ge=0, description="Optional enrollment age used for enterprise confidence scoring")
    no_claim_weeks: int = Field(0, ge=0, description="Optional loyalty discount context from underwriting")
    verified_incident: bool = Field(False, description="Marks the payout event as externally verified")
    loss_ratio_override: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Optional observed income-loss ratio when backend has stronger live evidence",
    )
    forecast_overrides: dict[str, Any] = Field(
        default_factory=dict,
        description="Observed or simulated event inputs for AQI, rain, heat, or disruption",
    )


class BatchPayoutItem(BaseModel):
    worker_id: str = Field(..., description="platform_driver_id to assess")
    platform_name: str | None = Field(default=None, description="Optional platform validation like zomato or swiggy")
    horizon_days: int | None = Field(default=None, ge=1, le=7, description="Optional per-driver payout window override")
    affected_days: int | None = Field(default=None, ge=1, le=7, description="Optional per-driver affected day override")
    incident_city: str | None = Field(default=None, description="Optional per-driver affected city override")
    incident_state: str | None = Field(default=None, description="Optional per-driver affected state override")
    days_since_enrollment: int | None = Field(default=None, ge=0, description="Optional per-driver enrollment age override")
    no_claim_weeks: int | None = Field(default=None, ge=0, description="Optional per-driver loyalty context")
    verified_incident: bool | None = Field(default=None, description="Optional per-driver verified-incident override")
    loss_ratio_override: float | None = Field(default=None, ge=0.0, le=1.0, description="Optional per-driver observed loss ratio")
    forecast_overrides: dict[str, Any] | None = Field(
        default=None,
        description="Optional per-driver observed or simulated event inputs",
    )


class BatchPayoutRequest(BaseModel):
    items: list[BatchPayoutItem] = Field(..., min_length=1, max_length=100, description="Drivers to assess in one payout request")
    horizon_days: int = Field(1, ge=1, le=7, description="Default payout window for items that do not override it")
    affected_days: int = Field(1, ge=1, le=7, description="Default affected days for items that do not override it")
    incident_city: str | None = Field(default=None, description="Default affected city for items that do not override it")
    incident_state: str | None = Field(default=None, description="Default affected state for items that do not override it")
    days_since_enrollment: int | None = Field(default=None, ge=0, description="Default enrollment age for items that do not override it")
    no_claim_weeks: int = Field(0, ge=0, description="Default loyalty context for items that do not override it")
    verified_incident: bool = Field(False, description="Default verified-incident flag for items that do not override it")
    loss_ratio_override: float | None = Field(default=None, ge=0.0, le=1.0, description="Default observed loss ratio")
    forecast_overrides: dict[str, Any] = Field(
        default_factory=dict,
        description="Default observed or simulated event inputs applied to items that do not override them",
    )
    continue_on_error: bool = Field(
        default=True,
        description="When true, return partial successes and per-item errors instead of failing the whole batch.",
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def _run_quote_request(
    worker_id: str,
    platform_name: str | None = None,
    horizon_days: int = 7,
    no_claim_weeks: int = 0,
    forecast_overrides: dict[str, Any] | None = None,
) -> dict:
    response = build_worker_response(
        worker_id,
        platform_name=platform_name,
        no_claim_weeks=no_claim_weeks,
        horizon_days=horizon_days,
        forecast_overrides=forecast_overrides,
    )
    return response


def _run_payout_request(
    worker_id: str,
    platform_name: str | None = None,
    horizon_days: int = 1,
    affected_days: int = 1,
    incident_city: str | None = None,
    incident_state: str | None = None,
    days_since_enrollment: int | None = None,
    no_claim_weeks: int = 0,
    forecast_overrides: dict[str, Any] | None = None,
    verified_incident: bool = False,
    loss_ratio_override: float | None = None,
) -> dict:
    return build_payout_response(
        worker_id,
        platform_name=platform_name,
        affected_days=affected_days,
        no_claim_weeks=no_claim_weeks,
        horizon_days=horizon_days,
        forecast_overrides=forecast_overrides,
        verified_incident=verified_incident,
        loss_ratio_override=loss_ratio_override,
        incident_city=incident_city,
        incident_state=incident_state,
        days_since_enrollment=days_since_enrollment,
    )


@app.get("/quote/{worker_id}")
def quote(worker_id: str) -> dict:
    try:
        return _run_quote_request(worker_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/quote")
def quote_post(request: QuoteRequest) -> dict:
    try:
        response = _run_quote_request(
            request.worker_id,
            platform_name=request.platform_name,
            no_claim_weeks=request.no_claim_weeks,
            horizon_days=request.horizon_days,
            forecast_overrides=request.forecast_overrides,
        )
        response["request_type"] = "post"
        return response
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/quote/batch")
def quote_batch(request: BatchQuoteRequest) -> dict[str, Any]:
    results: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []

    for index, item in enumerate(request.items):
        try:
            response = _run_quote_request(
                item.worker_id,
                platform_name=item.platform_name,
                no_claim_weeks=request.no_claim_weeks if item.no_claim_weeks is None else item.no_claim_weeks,
                horizon_days=request.horizon_days if item.horizon_days is None else item.horizon_days,
                forecast_overrides=request.forecast_overrides if item.forecast_overrides is None else item.forecast_overrides,
            )
            response["request_type"] = "batch"
            response["request_index"] = index
            results.append(response)
        except (ValueError, RuntimeError) as exc:
            error = {
                "request_index": index,
                "worker_id": item.worker_id,
                "platform_name": item.platform_name,
                "error": str(exc),
            }
            if not request.continue_on_error:
                status_code = 404 if isinstance(exc, ValueError) else 400
                raise HTTPException(status_code=status_code, detail=error) from exc
            errors.append(error)

    return {
        "request_type": "batch",
        "requested_count": len(request.items),
        "quoted_count": len(results),
        "error_count": len(errors),
        "results": results,
        "errors": errors,
    }


@app.get("/payout/{worker_id}")
def payout(worker_id: str) -> dict:
    try:
        return _run_payout_request(worker_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/payout")
def payout_post(request: PayoutRequest) -> dict:
    try:
        response = _run_payout_request(
            request.worker_id,
            platform_name=request.platform_name,
            horizon_days=request.horizon_days,
            affected_days=request.affected_days,
            incident_city=request.incident_city,
            incident_state=request.incident_state,
            days_since_enrollment=request.days_since_enrollment,
            no_claim_weeks=request.no_claim_weeks,
            forecast_overrides=request.forecast_overrides,
            verified_incident=request.verified_incident,
            loss_ratio_override=request.loss_ratio_override,
        )
        response["request_type"] = "post"
        return response
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/payout/batch")
def payout_batch(request: BatchPayoutRequest) -> dict[str, Any]:
    results: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []

    for index, item in enumerate(request.items):
        try:
            response = _run_payout_request(
                item.worker_id,
                platform_name=item.platform_name,
                horizon_days=request.horizon_days if item.horizon_days is None else item.horizon_days,
                affected_days=request.affected_days if item.affected_days is None else item.affected_days,
                incident_city=request.incident_city if item.incident_city is None else item.incident_city,
                incident_state=request.incident_state if item.incident_state is None else item.incident_state,
                days_since_enrollment=request.days_since_enrollment if item.days_since_enrollment is None else item.days_since_enrollment,
                no_claim_weeks=request.no_claim_weeks if item.no_claim_weeks is None else item.no_claim_weeks,
                forecast_overrides=request.forecast_overrides if item.forecast_overrides is None else item.forecast_overrides,
                verified_incident=request.verified_incident if item.verified_incident is None else item.verified_incident,
                loss_ratio_override=request.loss_ratio_override if item.loss_ratio_override is None else item.loss_ratio_override,
            )
            response["request_type"] = "batch"
            response["request_index"] = index
            results.append(response)
        except (ValueError, RuntimeError) as exc:
            error = {
                "request_index": index,
                "worker_id": item.worker_id,
                "platform_name": item.platform_name,
                "error": str(exc),
            }
            if not request.continue_on_error:
                status_code = 404 if isinstance(exc, ValueError) else 400
                raise HTTPException(status_code=status_code, detail=error) from exc
            errors.append(error)

    return {
        "request_type": "batch",
        "requested_count": len(request.items),
        "assessed_count": len(results),
        "error_count": len(errors),
        "results": results,
        "errors": errors,
    }
