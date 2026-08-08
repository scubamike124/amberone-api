# Changelog

All notable changes to the AmberOne API and its SDKs.
Format follows [Keep a Changelog](https://keepachangelog.com/); the API follows
semantic versioning at the version-path level — breaking changes ship as `/api/v2`,
never as a change to `/api/v1`.

## [1.0.0] — 2026-08-07

First public packaging release as **AmberOne API** (repository `amberone-api`).

### API

- `POST /api/v1/scan` — compatibility scan across https, security, pwa, mobile,
  seo, accessibility, performance and links. Checks that require a browser are
  reported as `requires_browser` and excluded from scores rather than estimated.
- `POST /api/v1/jobs`, `GET /api/v1/jobs`, `GET /api/v1/jobs/{id}`,
  `DELETE /api/v1/jobs/{id}` — wrap job lifecycle with progress and stage.
- `GET /api/v1/jobs/{id}/logs` — per-job log lines.
- `GET /api/v1/jobs/{id}/download` — project archive, with `X-Artifact-SHA256`.
- `GET /api/v1/account` — key, plan, limits and usage. Consumes no wrap quota.
- `GET /api/v1/usage` — metered consumption by kind and by day, live separated
  from test.
- `GET /api/v1/openapi.json` — generated spec (committed copy always available).

### Platforms

- `PWA`, `CAPACITOR`, `ELECTRON`, `ANDROID_PROJECT`, `IOS_PROJECT`.
- Outputs are build-ready projects. Nothing is compiled, signed, or submitted —
  signing keys stay on your machine.

### Auto-fix

- Web app manifest, installable icon set, mobile viewport, and an offline
  service worker are supplied in the generated package when the source site
  lacks them.
- A fix is reported as `applied` only after its evidence file has been read back
  and confirmed present in the archive; otherwise it is reported as `failed`.
- Fixes apply to the generated package only. Source websites are never modified.

### SDKs

- `amberone-api` (JavaScript/TypeScript) — zero dependencies, typed errors,
  download hash verification. `WrapperClient` kept as an alias.
- `amberone-api` (Python) — `requests` only, same behaviour.

[1.0.0]: https://github.com/scubamike124/amberone-api/releases/tag/v1.0.0
