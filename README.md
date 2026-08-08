# AmberOne API

**Turn any website into build-ready mobile and desktop app projects.**

AmberOne API is the commercial developer API for AmberOne mobile wrapping: submit
a URL, get a compatibility scan, optional package fixes, and a downloadable
project you build and sign yourself.

```bash
curl -X POST https://hq.amberoneai.com/api/v1/jobs \
  -H "Authorization: Bearer $AMBERONE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-site.com","platforms":["PWA","ANDROID_PROJECT"]}'
```

Public repository: [scubamike124/amberone-api](https://github.com/scubamike124/amberone-api)  
Accounts, billing, and keys: [hq.amberoneai.com](https://hq.amberoneai.com)

> ### Status: live
>
> The API is serving requests. Sign up at [Amber HQ](https://hq.amberoneai.com),
> create a key, and the quick start below works as written.
>
> Verified end to end on production: signup, key issuance, `/account`, `/scan`,
> `/jobs` and `/usage` all answer. A key beginning `wrap_test_` runs the full
> pipeline and is never billed, so you can evaluate the whole thing before
> spending anything.

**Prefer to look before signing up?** Import
[`postman_collection.json`](./postman_collection.json) into Postman. Every
endpoint is there with a working example body. Set the `apiKey` variable when
you have one — keys beginning `wrap_test_` run the full pipeline and are never
billed.

---

## What you get, stated plainly

You get a **project**, not a compiled app.

Android and iOS outputs are Capacitor projects ready for `./gradlew
assembleRelease` or Xcode's Archive. Nothing is compiled, signed, installed, or
submitted on your behalf. That is deliberate: **your signing keys never leave
your machine.**

If you were looking for a service that returns a finished, signed `.apk`, this
is not that, and we would rather you knew before you paid.

| Platform | What you receive |
|---|---|
| `PWA` | Manifest, icons, service worker, install shell — copy to your site root |
| `CAPACITOR` | Configured Capacitor project, ready for `npx cap add` |
| `ANDROID_PROJECT` | Capacitor project plus manifest/theme merges and build steps |
| `IOS_PROJECT` | Capacitor project plus Info.plist merges and associated-domain setup |
| `ELECTRON` | Desktop shell with external-link handling |

---

## Quick start

**1. Get a key.** Sign up at [Amber HQ](https://hq.amberoneai.com), open
**Dashboard → Wrapper API / API keys**, create one. Keys look like `wrap_live_…`.
Keys beginning `wrap_test_` run the full pipeline and are never billed.

**2. Check it works.** This spends no wrap quota:

```bash
curl https://hq.amberoneai.com/api/v1/account \
  -H "Authorization: Bearer $AMBERONE_API_KEY"
```

(`WRAPPER_API_KEY` is accepted as an alias env name in the examples.)

**3. Scan before you wrap.** Synchronous, and tells you what a wrap would inherit:

```bash
curl -X POST https://hq.amberoneai.com/api/v1/scan \
  -H "Authorization: Bearer $AMBERONE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-site.com"}'
```

**4. Wrap, poll, download.** See [`examples/node-quickstart`](examples/node-quickstart)
for the whole path in one file.

---

## SDKs

**JavaScript / TypeScript** — zero dependencies, uses built-in `fetch`.

```bash
npm install amberone-api
```

```ts
import { AmberOneClient } from "amberone-api";

const client = new AmberOneClient({ apiKey: process.env.AMBERONE_API_KEY! });

const job = await client.wrapAndWait(
  { url: "https://your-site.com", platforms: ["PWA", "ANDROID_PROJECT"] },
  { onProgress: (j) => console.log(j.status, j.progress) },
);

const { bytes } = await client.download(job.id); // hash-verified before it resolves
```

`WrapperClient` remains an exported alias of `AmberOneClient`.

**Python** — depends only on `requests`.

```bash
pip install amberone-api
```

```python
from amberone_api import AmberOneClient

client = AmberOneClient(api_key=os.environ["AMBERONE_API_KEY"])
job = client.wrap_and_wait("https://your-site.com", platforms=["PWA", "ANDROID_PROJECT"])
archive = client.download(job["id"])   # verifies the published SHA-256
```

Both SDKs verify the downloaded archive against the hash the certification
report published, and raise rather than hand you bytes that do not match.

> **Registry note:** GitHub is the source of truth today. npm / PyPI registry
> publish follows once org tokens are enabled for the `registry_publish`
> workflow. Until then, install from this repository or a release tarball.

---

## Endpoints

Full machine-readable spec: [`openapi.json`](openapi.json), also served live at
`GET /api/v1/openapi.json` (intended unauthenticated — use the committed file
if the live route is behind an older edge).

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/account` | Key, plan, limits, usage. Costs no quota. |
| `POST` | `/api/v1/scan` | Compatibility scan, synchronous |
| `POST` | `/api/v1/jobs` | Submit a wrap job → `202` |
| `GET` | `/api/v1/jobs` | List jobs, cursor-paginated |
| `GET` | `/api/v1/jobs/{id}` | Status, scan report, fix report, certification |
| `DELETE` | `/api/v1/jobs/{id}` | Cancel an unfinished job |
| `GET` | `/api/v1/jobs/{id}/logs` | Job log lines |
| `GET` | `/api/v1/jobs/{id}/download` | The archive (`application/zip`) |
| `GET` | `/api/v1/usage` | Metered consumption, by kind and day |

---

## Response format

Every JSON response uses one envelope. Branch on `ok`.

```jsonc
{ "ok": true,  "data": { }, "requestId": "req_0f3c1a9b2e4d" }
{ "ok": false, "error": { "code": "quota_exceeded", "message": "…" }, "requestId": "req_…" }
```

`error.code` is a stable machine string — match on it. `message` is for humans
and may be reworded. **Quote `requestId` in any support request.**

### Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `invalid_request` | 400 | Body or query failed validation — see `details` |
| `url_rejected` | 400 | The URL failed the safety gate or could not be scanned |
| `unsupported_platform` | 400 | Unknown platform requested |
| `missing_api_key` | 401 | No key sent |
| `invalid_api_key` | 401 | Key not recognised |
| `api_key_revoked` | 401 | Key was revoked or rotated away |
| `api_key_expired` | 401 | Key passed its expiry |
| `forbidden` | 403 | Key lacks the required scope |
| `plan_required` | 403 | Your plan does not include that platform or feature |
| `not_found` | 404 | No such resource **on your account** |
| `job_not_cancellable` | 409 | Job already finished |
| `conflict` | 409 | Wrong state for that action (e.g. download before completion) |
| `payload_too_large` | 413 | Body too large |
| `quota_exceeded` | 422 | Period quota or concurrency limit reached |
| `rate_limited` | 429 | Too many requests — honour `Retry-After` |
| `internal_error` | 500 | Our fault. Quote the `requestId` |
| `not_implemented` | 501 | Not available yet |
| `upstream_unavailable` | 503 | Dependency down; safe to retry |

Retry `429` and `5xx`. Do not retry `4xx` — the request will fail identically.

---

## Job lifecycle

```
QUEUED → SCANNING → FIXING → PACKAGING → TESTING → COMPLETED
                                                 ↘ FAILED
                                                 ↘ CANCELLED  (via DELETE)
```

Poll `GET /api/v1/jobs/{id}` every few seconds. `progress` is 0–100 and `stage`
names the current step.

A job that fails inside our pipeline is retried automatically and **is not
charged against your quota**.

---

## What the scan actually measures

Every check is a measurement of something fetched — transport, headers, the
manifest, the document. Checks that genuinely need a browser (runtime JS errors,
colour contrast) are reported as `requires_browser` and **excluded from the
scores** rather than estimated.

Categories: `https`, `security`, `pwa`, `mobile`, `seo`, `accessibility`,
`performance`, `links`.

## What "fixed" means

Fixes are applied **to the generated package**, never to your website. We have
read-only access to your site and no ability to change it.

So "manifest fixed" means the package now carries a complete manifest your app
uses — not that your site was edited. Every fix records what was wrong, what was
written, and which file proves it, and a fix is only reported as `applied` after
the generated file has been read back and confirmed present.

---

## Rate limits and quotas

Per-minute request limits and per-period wrap quotas depend on your plan;
`GET /api/v1/account` reports yours. Responses carry `X-RateLimit-Limit`,
`X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After` on a 429.

---

## Marketplace & distribution

See [MARKETPLACE.md](MARKETPLACE.md) for GitHub Marketplace, RapidAPI, npm,
PyPI, and directory listing checklist and status.

---

## Support

- **Issues with this SDK or these docs** — open a GitHub issue here.
- **Account, billing, or a failing job** — contact support via HQ with the `requestId`.
- **Security** — see [SECURITY.md](SECURITY.md). Please do not open a public
  issue for a vulnerability.

## Repository contents

This repository is the developer-facing layer: SDKs, examples, and
documentation. The API itself, along with accounts, billing, keys and usage
data, runs on Amber HQ infrastructure — none of it lives here, and no credentials
of any kind belong in this repo.

```
sdk/javascript            TypeScript SDK (amberone-api)
sdk/python                Python SDK (amberone-api)
examples/                 Runnable quick starts
openapi.json              Generated spec — do not hand-edit
postman_collection.json   Postman v2.1, generated from the spec
listing.json              Marketplace metadata: categories, tags, tiers
MARKETPLACE.md            Listing plan and status
SUBMISSIONS.md            Ready-to-paste copy for each marketplace
CHANGELOG.md              Released changes
SECURITY.md               Vulnerability reporting
LICENSE                   MIT, covering this repository
LICENSING.md              What MIT covers here and what it does not
```

`openapi.json` and `postman_collection.json` are both generated from the same
endpoint definitions the server validates against, so neither can drift from
what the API actually accepts. A Postman collection maintained by hand drifts
within a release, and a drifted collection is worse than none — it teaches a
request shape the server rejects.

## Licence

**You may fork these SDKs, vendor them, and ship them inside a closed-source
product. You may not resell access to the API itself without a separate
agreement.**

The code here is [MIT](./LICENSE). The hosted service is governed by the
commercial terms you accept at signup. [`LICENSING.md`](./LICENSING.md) explains
the split and why it exists — briefly, an SDK licensed under service terms drags
those terms into whatever vendors it, and that is a dependency legal teams make
you remove.
