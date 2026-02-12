# Changelog

All notable changes to this project are documented in this file.

## [0.24] - 2026-02-12
### Added
- AI code-scan: LLM-based static analysis of project files (persisted JSON results).
- Playwright deep-scan: browser behavioral tests with screenshots persisted to MinIO.
- Predicted grade computation (60% code-scan, 40% deep-scan) and UI display across student/professor tables.
- Screenshot proxy endpoint: backend serves screenshots so browser `<img>` can load them (no auth header required).

### Fixed
- Increased Playwright/worker timeouts to prevent premature aborts on slow projects.
- Database migration issues: added `ALTER TABLE IF NOT EXISTS` safeguards and fixed drizzle migrations.
- Bug fix: `computePredictedGrade` now reads from `aiScanResult` correctly.

### Notes
- Screenshots are stored in MinIO under `screenshots/{projectId}/...` and proxied at `/api/ai/screenshot/:projectId/:index`.
- Release contains DB schema updates (`predicted_grade`, `deep_scan_screenshots`) — ensure migrations were applied during deployment.
