---
phase: 07
slug: code-hardening
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-21
updated: 2026-03-21
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 9.0.2 + FastAPI `TestClient` |
| **Config file** | none |
| **Quick run command** | `python -m pytest api/test_hardening.py -q` |
| **Full suite command** | `python -m pytest api -q` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `python -m pytest api/test_hardening.py -q`
- **After every plan wave:** Run `python -m pytest api -q`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | HARD-01 | integration | `python -m pytest api/test_hardening.py -q -k cors` | ✅ | ✅ green |
| 07-01-02 | 01 | 1 | HARD-02 | integration | `python -m pytest api/test_hardening.py -q -k health` | ✅ | ✅ green |
| 07-01-03 | 01 | 1 | HARD-01, HARD-02 | integration | `python -m pytest api/test_hardening.py -q -k "root or startup"` | ✅ | ✅ green |
| 07-02-01 | 02 | 2 | HARD-01, HARD-02 | regression | `python -m pytest api -q` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `api/test_hardening.py` — CORS preflight, authenticated route CORS, `/health`, safe `GET /`, and root-route exposure coverage
- [x] Dockerfile/runtime verification path — confirm `PYTHONUNBUFFERED=1` is enforced by code, test, or command-level assertion

---

## Runtime Contract Verification

### Command-level assertion: unbuffered logging

```bash
grep -n "PYTHONUNBUFFERED=1" docker/optimizer.Dockerfile
```

Expected output: a matching line. Exit 0 confirms the env var is set.

### Build verification

```bash
docker build -t skolegeni-optimizer-phase7 -f docker/optimizer.Dockerfile .
```

Expected: exits 0. Confirms the image can be built.

### Runtime verification: healthy container with injected PORT

```bash
docker run -d --rm \
  -e PORT=18080 \
  -e SUPABASE_URL=https://example.supabase.co \
  -e SUPABASE_ANON_KEY=test-anon-key \
  -p 18080:18080 \
  --name optimizer-phase7-ready \
  skolegeni-optimizer-phase7

sleep 3
curl -sf http://127.0.0.1:18080/health | python3 -m json.tool
# Expected: HTTP 200, {"status": "ready", "ortools_ready": true, "missing_env": []}

docker stop optimizer-phase7-ready
```

Expected: `GET http://127.0.0.1:18080/health` returns HTTP 200 with `status: "ready"`, confirming the `${PORT:-8000}` shell expansion correctly binds on the injected port.

### Runtime verification: not-ready container without required env vars

```bash
docker run -d --rm \
  -e PORT=18081 \
  -p 18081:18081 \
  --name optimizer-phase7-notready \
  skolegeni-optimizer-phase7

sleep 3
curl http://127.0.0.1:18081/health
# Expected: non-200 (503), {"status": "not_ready", "missing_env": ["SUPABASE_URL", "SUPABASE_ANON_KEY"]}

docker stop optimizer-phase7-notready
```

Expected: process stays up, `GET /health` returns HTTP 503 with structured `missing_env` list naming `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cloud Run probe compatibility against the deployed container | HARD-02 | Requires live Cloud Run environment from Phase 8 | After deploy, run `curl https://<cloud-run-url>/health` and confirm HTTP 200 with the expected readiness JSON |
| Browser preflight from a real remote frontend origin | HARD-01 | Final browser/network confirmation requires a deployed cross-origin setup | From the Vercel frontend or browser devtools, trigger an optimizer request and confirm the OPTIONS preflight and follow-up request are not blocked by CORS |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete
