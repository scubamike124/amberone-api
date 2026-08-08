# Marketplace submission kit

Ready-to-paste copy for each channel. Nothing here needs writing at submission
time — open the marketplace, work down the section, paste.

**Prerequisite for every channel below:** the API must answer calls. Run
`npm run deploy:verify` in Amber HQ first. It exits non-zero if the deploy has
not taken, and marketplaces validate by fetching the spec and calling a test
endpoint — a rejected submission is harder to retry than a delayed one.

---

## Read this before choosing channels

**Bundling changes which marketplaces can actually sell.** The API ships inside
the AmberOne subscription; we bill the customer. That splits the channels in two:

| Type | Marketplaces | Works with bundling? |
|---|---|---|
| **Discovery** — they list, you bill | Postman, GitHub, Product Hunt, npm, PyPI | ✅ yes |
| **Reseller** — they bill, you get a share | RapidAPI, Zyla, APILayer | ⚠️ not as-is |

RapidAPI takes roughly 20% and runs its own metering and checkout. It cannot
sell a wrap allowance that lives inside someone's AmberOne subscription. Two
options, and it is worth choosing deliberately rather than discovering it
mid-submission:

1. **Enable the standalone tiers for reseller channels only.** They already
   exist in `listing.json` marked `sellable: false`. Flip them for RapidAPI, and
   the same API is sold two ways at two prices — which is normal, but the prices
   must not contradict each other publicly.
2. **Treat reseller channels as lead generation.** List a free tier only, and
   convert to an AmberOne subscription. Lower revenue per signup, no pricing
   conflict, and much less to maintain.

**Recommendation: start with the discovery channels.** They are free, immediate,
and compatible with bundling as it stands. Decide the reseller question once
there is real signup data, not before.

---

## 1. Postman API Network — do this first

Free, no payout account, reaches a very large developer audience, and it bills
nothing so bundling is irrelevant to it.

**Needs:** a Postman account and a public workspace. No payment setup.

| Field | Value |
|---|---|
| Workspace name | `AmberOne` |
| Workspace visibility | Public |
| Collection | import `postman_collection.json` from this repo |
| Category | Developer Tools |
| Summary | Turn any website into build-ready mobile and desktop app projects. |

**Workspace description:**

> AmberOne turns a URL into a build-ready app project. Submit a site, get a
> compatibility scan across HTTPS, PWA, mobile, SEO, accessibility and
> performance, then download an Android, iOS, PWA, Electron or Capacitor project
> you build and sign yourself.
>
> Nothing is compiled, signed, or submitted on your behalf — which is the point.
> Your signing keys never leave your machine, because we never hold them.
>
> Every response uses one envelope: `{ ok: true, data, requestId }` or
> `{ ok: false, error: { code, message }, requestId }`. Branch on `ok`, match on
> `error.code`, quote `requestId` to support.
>
> Keys beginning `wrap_test_` run the full pipeline and are never billed, so the
> whole collection is runnable before you spend anything.

**After publishing:** set the collection's first request to `GET /api/v1/account`.
It proves the key works, shows plan limits in one round trip, and spends no quota.

---

## 2. GitHub — already live

https://github.com/scubamike124/amberone-api — public, MIT, 15 topics, v1.0.0
released. Nothing further required.

**Still worth doing:** submit to
[Awesome REST](https://github.com/marmelab/awesome-rest) and
[Public APIs](https://github.com/public-apis/public-apis) once the endpoints
answer. Both are PR-based, free, and drive steady traffic. Neither accepts an
API that fails a smoke test, so both wait on the deploy.

---

## 3. npm + PyPI — one tag away

Both SDKs are certified end to end: JavaScript 8/8, Python 10/10 in a clean
virtualenv with a real job and a hash-verified download.

```
@amberone/api    sdk/javascript    MIT
amberone-api     sdk/python        MIT
```

**Needs:** `NPM_TOKEN` and `PYPI_TOKEN` as repository secrets, or a PyPI trusted
publisher configured against this repo. Then push a `v*` tag — the workflow in
`.github/workflows/publish.yml` does the rest, npm with `--provenance`.

Missing secrets skip their job rather than failing the run.

---

## 4. RapidAPI — needs the pricing decision above

The largest single revenue channel and the slowest to set up.

**Needs:** a provider account, a business entity, and **a PayPal payout
account — RapidAPI does not pay providers via Stripe.** Then the pricing
decision above, because RapidAPI runs its own checkout.

| Field | Value |
|---|---|
| API name | AmberOne API |
| Category | Tools |
| Base URL | `https://hq.amberoneai.com` |
| Spec import | `openapi.json` from this repo |
| Auth | Bearer token, header `Authorization` |

**Short description (under 200 chars):**

> Submit a URL, get back a build-ready Android, iOS, PWA, Electron or Capacitor
> project. Compatibility scan included. Your signing keys never leave your machine.

**Long description:**

> **What it does.** POST a URL. AmberOne scans it across HTTPS, security, PWA,
> mobile, SEO, accessibility, performance and links, applies the fixes it can
> safely make to the generated package, and returns a downloadable project.
>
> **What you get is a project, not a compiled app.** Android and iOS outputs are
> Capacitor projects ready for `gradlew assembleRelease` or Xcode's Archive.
> Nothing is compiled, signed, installed or submitted for you. That is a design
> choice with a real benefit: your signing keys stay on your machine, because we
> never hold them. If you wanted a finished signed `.apk`, this is not that, and
> you should know before you pay.
>
> **Honest reporting.** A fix is reported as `applied` only after its evidence
> file has been read back out of the archive. Checks that need a browser are
> reported as `requires_browser` and excluded from scores rather than estimated.
>
> **Testing is free.** Keys beginning `wrap_test_` run the full pipeline and are
> never billed.
>
> 9 endpoints. Every response uses one envelope; `error.code` is stable.

**Tags:** `pwa`, `capacitor`, `android`, `ios`, `electron`, `webview`,
`app-generator`, `mobile`, `wrapper`, `site-to-app`, `no-code`

---

## 5. Zyla API Hub / APILayer — after RapidAPI

Both are curated: a human tests the API before it lists. Do not approach either
until `deploy:verify` passes and a test key can be issued on request. Same
reseller-billing question as RapidAPI.

---

## 6. Product Hunt — last, and only once

A launch spike is worth nothing if signup-to-first-call is broken, and you only
get one. Preconditions: a stranger can sign up, get a key, and complete a wrap
without help.

**Tagline:** Turn any website into a real app project — keys stay yours.

---

## Status

| Channel | Blocked on |
|---|---|
| GitHub | — **live** |
| Postman | deploy + a Postman account |
| npm / PyPI | tokens |
| Awesome REST / Public APIs | deploy |
| RapidAPI | deploy + PayPal payout + pricing decision |
| Zyla / APILayer | deploy + pricing decision |
| Product Hunt | deploy + a clean stranger signup run |
