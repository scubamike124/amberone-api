# Marketplace listings — AmberOne API

Status tracker for packaging AmberOne APIs onto supported discovery and billing
surfaces so revenue can start. Owned with Business Ops for pricing copy; Auto
owns the repo, OpenAPI, SDKs, and technical listing payloads.

**Public storefront repo:** https://github.com/scubamike124/amberone-api  
**API origin (today):** https://hq.amberoneai.com  
**OpenAPI artifact:** [`openapi.json`](./openapi.json)

---

## Priority order (revenue-first)

| # | Surface | Effort | Status | Notes |
|---|---|---|---|---|
| 1 | **GitHub public repo** | low | **in progress → live once push succeeds** | Storefront + docs + SDK source. Unblocks every other listing. |
| 2 | **GitHub Releases** | low | next | Tag `v1.0.0` from CHANGELOG; attach nothing secret. |
| 3 | **npm `@amberone/api`** | low | blocked on org/token | Package built; needs npm org `amberone` + publish token (`registry_publish`). |
| 4 | **PyPI `amberone-api`** | low | blocked on token | Package written; needs Twine token. |
| 5 | **RapidAPI Hub** | medium | preparing | Buyers arrive intending to buy an API. Use OpenAPI import; decide billing share (~20%) deliberately. |
| 6 | **GitHub Marketplace** | medium | preparing | Needs verified publisher; start review after public repo exists. |
| 7 | Product Hunt | low | hold | After stranger-proof signup → first successful call. |
| 8 | Cloudflare / Capacitor directories | low | hold | After public URL + README are stable. |
| 9 | AWS Marketplace | high | defer | Enterprise only after a deal stalls on procurement. |

---

## Listing payloads (ready)

### RapidAPI / OpenAPI hubs

- Spec file: `openapi.json` (regenerate with `npm run wrap:publish-check` in Amber HQ)
- Base URL: `https://hq.amberoneai.com`
- Auth: `Authorization: Bearer wrap_live_…` (also `X-API-Key`)
- Unauthenticated browse of the committed OpenAPI in this repo for evaluators

### npm

```
Package: @amberone/api
Path:    sdk/javascript
License: MIT
```

### PyPI

```
Package: amberone-api
Import:  amberone_api
Path:    sdk/python
License: MIT
```

---

## Owner actions still required for paid channels

1. Confirm npm organisation name `amberone` (or alias) and paste `NPM_TOKEN` into HQ Vault when ready to flip `AMBER_PUBLISHING_WORKFLOW=registry_publish`.
2. Paste `PYPI_TOKEN` the same way.
3. Create RapidAPI provider account (business entity + payout) — then Auto can import OpenAPI.
4. Apply for GitHub Marketplace verified publisher under the chosen org/account.

Do **not** paste tokens into chat.

---

## Done definition for “we can generate revenue”

Minimum viable revenue path:

1. Public GitHub storefront with correct branding and OpenAPI  
2. Working key issuance + Checkout on HQ for at least one paid plan  
3. At least one discovery channel live (GitHub alone is enough to start; RapidAPI or npm accelerates)

npm/PyPI and RapidAPI are amplifiers, not prerequisites for the first paying customer who finds the repo or HQ dashboard.
