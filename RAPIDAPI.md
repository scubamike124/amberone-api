# RapidAPI listing kit — AmberOne API

**Owner chose RapidAPI as the next revenue channel (2026-08-07).**  
This file is the exact payload to paste/import into RapidAPI Studio. Do not invent
billing numbers beyond what HQ plans already enforce.

## Links

| Asset | URL |
|-------|-----|
| Public storefront | https://github.com/scubamike124/amberone-api |
| OpenAPI (committed) | https://raw.githubusercontent.com/scubamike124/amberone-api/main/openapi.json |
| API base | https://hq.amberoneai.com |
| HQ dashboard / keys | https://hq.amberoneai.com |

## Provider account (owner)

1. Open https://rapidapi.com/provider  
2. Create / sign in as the Amber / AmberOne business entity  
3. Complete tax + payout (required before paid listings settle)  
4. Tell Amber “RapidAPI provider ready” — then we can finish the listing import in-session if you stay logged in

Do not paste RapidAPI secrets into chat.

## Listing fields (copy/paste)

**Name:** AmberOne API  

**Short description (≤160 chars):**  
Turn any website into build-ready PWA, Capacitor, Android, iOS, and Electron projects — with compatibility scan and package auto-fix.

**Category:** Mobile / Tools / Developer Tools (pick closest RapidAPI taxonomy)  

**Long description:**

AmberOne API wraps websites into **build-ready app projects** — not signed binaries.

Developers submit a URL. The API:

1. Scans for wrap compatibility (HTTPS, security headers, PWA signals, mobile, SEO, a11y, links)
2. Applies safe fixes **inside the generated package only** (manifest, icons, viewport, offline SW)
3. Returns a ZIP project for PWA / Capacitor / Android / iOS / Electron that **you** build and sign

Signing keys never leave your machine. Test keys (`wrap_test_…`) exercise the full pipeline and are not billed.

Docs & SDKs: https://github.com/scubamike124/amberone-api  

**Website:** https://hq.amberoneai.com  
**Terms / support:** HQ support with `requestId` from any error response  
**Security contact:** security@amberoneai.com  

## Auth for RapidAPI gateway

RapidAPI will typically inject `X-RapidAPI-Key` / `X-RapidAPI-Host`. Two options:

**A — Preferred for control:** RapidAPI proxies to HQ; map RapidAPI subscriber → AmberOne key server-side (custom middleware / RapidAPI monetization with your own backend key).  

**B — Faster discovery listing:** Document that callers still need an AmberOne `wrap_live_` bearer after signup on HQ, and use RapidAPI primarily as discovery (lower conversion, clearer ownership of billing).

Recommend **A** once provider account exists; ship **B** only as a temporary “docs + OpenAPI” listing if payout setup blocks A.

## OpenAPI import

1. RapidAPI Studio → Add New API → **Import OpenAPI**  
2. URL: `https://raw.githubusercontent.com/scubamike124/amberone-api/main/openapi.json`  
3. Set base URL / server to `https://hq.amberoneai.com`  
4. Verify unauthenticated `GET /api/v1/openapi.json` once HQ middleware exemption is on prod (committed OpenAPI always works)  
5. Mark endpoints per RapidAPI plan groups (BASIC/PRO/ULTRA) to match HQ plan caps where possible

## Endpoints to highlight (first impression)

| Method | Path | Why |
|--------|------|-----|
| GET | `/api/v1/account` | Zero-cost health / plan check |
| POST | `/api/v1/scan` | Synchronous value before wrap |
| POST | `/api/v1/jobs` | Core paid action |
| GET | `/api/v1/jobs/{id}/download` | Artifact delivery |

## Pricing note (Business Ops)

Do not invent RapidAPI sticker prices here. Mirror HQ paid tiers and apply RapidAPI’s ~20% share deliberately. Claude / Business Ops owns final list prices; Auto owns OpenAPI + auth wiring.

## Status checklist

- [x] Public repo + OpenAPI published  
- [x] Listing copy prepared (this file)  
- [ ] Owner RapidAPI provider account + payout  
- [ ] Import OpenAPI into Studio  
- [ ] Choose billing mode A or B  
- [ ] Publish listing + smoke one paid test call  
- [ ] Wire marketplace performance fields in Business OS when RapidAPI analytics exist  
