"""Phase 7 hardening contract tests for the optimizer API.

Covers:
- CORS preflight from browser origins
- Startup readiness logging and GET /health behaviour when env is present
- Startup not-ready state and GET /health when required env is missing
- Safe GET / root and absence of the unauthenticated POST / optimization route
"""

from __future__ import annotations

import logging

import pytest
from fastapi.testclient import TestClient

from optimizer import app


def test_cors_preflight_allows_authorization_header(monkeypatch: pytest.MonkeyPatch) -> None:
    """OPTIONS /project from a Vercel preview origin must return a CORS success response
    that explicitly reflects allow-origin and allow-headers including Authorization."""
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "test-anon-key")

    with TestClient(app) as client:
        response = client.options(
            "/project",
            headers={
                "Origin": "https://preview.example.vercel.app",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization,content-type",
            },
        )

    assert response.status_code in (200, 204), (
        f"Expected CORS preflight success, got {response.status_code}"
    )
    assert "access-control-allow-origin" in response.headers, (
        "Preflight response must include access-control-allow-origin"
    )
    assert "access-control-allow-headers" in response.headers, (
        "Preflight response must include access-control-allow-headers"
    )
    allow_headers = response.headers["access-control-allow-headers"].lower()
    assert "authorization" in allow_headers, (
        f"access-control-allow-headers must contain 'authorization', got: {allow_headers}"
    )


def test_health_reports_ready_when_env_present(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """With required env vars present, startup logs a readiness summary and
    GET /health returns HTTP 200 with readiness JSON."""
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "test-anon-key")

    with caplog.at_level(logging.INFO):
        with TestClient(app) as client:
            response = client.get("/health")

    assert response.status_code == 200, (
        f"Expected HTTP 200 from /health when env is present, got {response.status_code}"
    )
    body = response.json()
    assert body.get("status") == "ready", f"Expected status='ready', got: {body}"
    assert body.get("ortools_ready") is True, f"Expected ortools_ready=True, got: {body}"
    assert "missing_env" in body, f"Response must include missing_env key, got: {body}"
    assert body["missing_env"] == [], f"Expected empty missing_env list, got: {body['missing_env']}"

    # Startup must emit at least one readiness summary log line
    log_text = " ".join(record.message for record in caplog.records)
    assert any(
        keyword in log_text.lower() for keyword in ("ready", "startup", "readiness")
    ), f"Expected readiness summary in startup logs, got: {log_text!r}"


def test_health_reports_missing_env_when_required_env_missing(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """With required env vars absent, startup completes in a not-ready state,
    logs the missing env groups, and GET /health returns a structured non-200 response
    naming the missing env groups."""
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("VITE_SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_ANON_KEY", raising=False)
    monkeypatch.delenv("VITE_SUPABASE_ANON_KEY", raising=False)

    with caplog.at_level(logging.WARNING):
        with TestClient(app) as client:
            response = client.get("/health")

    # Startup must not raise — the app should still respond
    assert response.status_code != 200, (
        f"Expected non-200 from /health when env is missing, got {response.status_code}"
    )
    body = response.json()
    assert "missing_env" in body, f"Response must include missing_env key, got: {body}"
    assert isinstance(body["missing_env"], list), "missing_env must be a list"
    assert len(body["missing_env"]) > 0, (
        f"missing_env must be non-empty when env groups are absent, got: {body['missing_env']}"
    )

    # Startup logs must mention the missing env group names
    log_text = " ".join(record.message for record in caplog.records)
    assert any(
        keyword in log_text.lower()
        for keyword in ("supabase_url", "supabase_anon_key", "missing", "not ready", "not-ready")
    ), f"Expected missing-env group names in startup logs, got: {log_text!r}"


def test_root_get_is_safe_and_root_post_is_not_exposed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """GET / returns a safe informational JSON payload.
    POST / is not an exposed unauthenticated optimization endpoint."""
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "test-anon-key")

    with TestClient(app) as client:
        get_response = client.get("/")
        post_response = client.post(
            "/",
            json={
                "projectId": "project-1",
                "constraints": {
                    "minClassSize": 1,
                    "maxClassSize": 30,
                    "genderPriority": "ignore",
                    "originPriority": "ignore",
                    "locationPriority": "ignore",
                    "needsPriority": "flexible",
                },
                "pupils": [
                    {
                        "id": "p1",
                        "name": "Ada",
                        "gender": "Female",
                        "originSchool": "North",
                        "needs": "None",
                        "zone": "A",
                    }
                ],
                "chemistry": {"positive": [], "negative": []},
            },
        )

    # GET / must return an informational JSON response (not an optimizer result)
    assert get_response.status_code == 200, (
        f"Expected GET / to return 200, got {get_response.status_code}"
    )
    get_body = get_response.json()
    # It should NOT look like an OptimizeResponse (no classes/score structure)
    assert "classes" not in get_body or "service" in get_body, (
        f"GET / should return informational JSON, not an optimization result: {get_body}"
    )

    # POST / must not perform optimization (404 = route removed, or 405/422 = not accepted)
    assert post_response.status_code in (404, 405), (
        f"Expected POST / to be absent (404) or method-not-allowed (405), "
        f"got {post_response.status_code} with body: {post_response.text}"
    )
