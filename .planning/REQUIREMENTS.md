# Requirements: SkoleGeni

**Defined:** 2026-03-21
**Core Value:** School staff can generate balanced, defensible class rosters quickly without losing control over the final result.

## v1.1 Requirements

Requirements for the Optimizer in Cloud milestone. Each maps to roadmap phases.

### Infrastructure

- [x] **INFRA-01**: Optimizer container is deployed to Google Cloud Run and accessible via a public HTTPS endpoint
- [x] **INFRA-02**: Optimizer container image is stored in Google Artifact Registry
- [ ] **INFRA-03**: Pushes to main automatically build and deploy the optimizer via GitHub Actions with Workload Identity Federation

### Hardening

- [x] **HARD-01**: Optimizer responds to cross-origin requests from the Vercel frontend domain with correct CORS headers
- [x] **HARD-02**: Cloud Run can health-check the optimizer via a dedicated GET /health endpoint

### Wiring

- [x] **WIRE-01**: Vercel-hosted frontend calls the Cloud Run optimizer endpoint instead of localhost
- [x] **WIRE-02**: Supabase auth tokens are forwarded end-to-end from browser through Cloud Run to Supabase with RLS preserved

## Future Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Scenarios

- **SCEN-01**: Compare multiple generated roster scenarios for the same project
- **SCEN-02**: Keep alternate manual-edit branches before choosing a final roster

### Export

- **EXPT-01**: Export roster results in a staff-friendly format for review and handoff
- **EXPT-02**: Print or share a summary of score tradeoffs and constraint satisfaction

### Integration

- **INTG-01**: Import pupil data directly from an SIS or district data source
- **INTG-02**: Sync finalized classes back to an external system

### Async Optimization

- **ASYNC-01**: Submit long-running optimizations as background jobs with progress tracking
- **ASYNC-02**: Allow browser tab to close during optimization and return to results later

## Out of Scope

| Feature | Reason |
|---------|--------|
| Async job queue / Cloud Tasks | Deferred — Cloud Run's sync timeout (up to 60 min) is sufficient for current school-sized datasets |
| Cloud Run IAM authentication | Breaks CORS preflight; app-level Supabase JWT auth is the correct trust boundary |
| Google Cloud monitoring SDKs | Built-in Cloud Run metrics are sufficient for low-traffic school tool |
| Secret Manager for env vars | Cloud Run `--set-env-vars` is sufficient at current scale |
| Native mobile support | Product is desktop-first |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| HARD-01 | Phase 7 | Complete |
| HARD-02 | Phase 7 | Complete |
| INFRA-01 | Phase 8 | Complete |
| INFRA-02 | Phase 8 | Complete |
| WIRE-01 | Phase 9 | Complete |
| WIRE-02 | Phase 9 | Complete |
| INFRA-03 | Phase 10 | Pending |

**Coverage:**
- v1.1 requirements: 7 total
- Mapped to phases: 7
- Unmapped: 0

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-22 after Phase 9 completion (INFRA-01, INFRA-02, WIRE-01, WIRE-02 all complete)*
