# Marketplace submission kit

Ready-to-paste copy for each channel. Nothing here needs writing at submission
time — open the marketplace, work down the section, paste.

**The API is live** — `deploy:verify` reports 4 passed, 0 failed, and the customer
path was walked end to end on production. Re-run it before any submission anyway:
marketplaces validate by fetching the spec and calling a test endpoint, and a
rejected submission is harder to retry than a delayed one.

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

## 1. Postman — skipped, deliberately

**Do not pay for this.** Postman made its free plan single-user in March 2026
and moved workspace sharing behind Team (~$19/user/month). The upgrade prompt
that appears when you try to share a collection is that change, not a
misconfiguration.

The reach was the entire argument for Postman, and it was worth having because
it was free. A subscription bought before the first paying customer is the wrong
order of operations.

**What was built anyway, and still works:** a workspace exists with the
collection imported and verified — 4 folders, 9 requests, bearer auth, baseUrl
and apiKey variables. It is private to the account. If a Team plan is ever
justified for other reasons, publishing is one click from there:
https://go.postman.co/workspace/919be24a-0cf3-4f76-84af-288315c36b8e

**What replaces it, for nothing:** the collection is public on GitHub, so any
developer can import it by URL without either side holding a Postman plan:

```
https://raw.githubusercontent.com/scubamike124/amberone-api/main/postman_collection.json
```

Postman → Import → Link → paste. That is most of the value of a listing, minus
the discovery surface. Revisit if Postman changes the plan again, or once revenue
makes $19/month uninteresting.

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
amberone-api   sdk/javascript   MIT   npm
amberone-api   sdk/python       MIT   PyPI
```

### npm — the ground shifted, and chasing a token is the wrong fight

Two token types were tried. Each failed differently, and the difference matters:

| Token type | Result | What it means |
|---|---|---|
| Granular, read-only | `403 Forbidden` | authenticates, cannot write |
| Granular, read-write | `EOTP` | permissions are correct; 2FA blocks it |

Reaching `EOTP` is progress, not a dead end — a read-only token never gets that
far. Publishing needs a one-time password from an authenticator, which no
unattended process can supply. That is the setting working as intended.

The instinct is to hunt for a token type that bypasses 2FA. Do not: npm spent
2026 closing exactly that path. Bypass-2FA granular tokens were restricted in
July 2026, and npm has stated publishing moves to OIDC trusted publishing in
**January 2027**, with tokens reduced to staging a publish that a maintainer
approves. A token that skips 2FA is building on something with a published
expiry date.

**Two steps, and the first takes thirty seconds:**

1. **Publish this first version by hand.** From `sdk/javascript`, run
   `npm publish --access public` and type the OTP when prompted. Once.
2. **Then configure trusted publishing** on npmjs.com for `amberone-api`,
   pointing at this repo and `.github/workflows/publish.yml`. Every release after
   that is a git tag with no token anywhere.

The manual publish comes first because trusted publishing is configured on a
package that already exists. It is the ordering, not a workaround.

---

### PyPI — exactly how to make the token

Nothing else waits on this; do it when there are five minutes.

1. **pypi.org → log in**, creating the account if there is not one.
2. **Enable 2FA** if it is not on. PyPI requires it for uploads. Unlike npm this
   does *not* block automation — on PyPI the API token **is** the second factor,
   so a token keeps working unattended.
3. **Account settings → API tokens → Add API token.**
4. Name it something recognisable later, e.g. `amberone-api publish`.
5. **Scope: "Entire account".** This matters — `amberone-api` does not exist on
   PyPI yet, and a project-scoped token cannot create a project that is not there.
   Account scope is needed for the **first** upload only.
6. **Copy it.** It starts `pypi-` and is shown exactly once.
7. Store it in the vault as `PYPI_TOKEN`.

**Then narrow it.** After the first successful upload, create a second token
scoped to just the `amberone-api` project, replace `PYPI_TOKEN` with it, and
delete the account-scoped one. An account-scoped token can publish to every
project you own, and there is no reason to keep that alive once it has done its
single job.

Better still, configure **trusted publishing**: PyPI → project → Publishing →
add a GitHub publisher for this repo and `publish.yml`. That removes the stored
token in favour of a short-lived credential per workflow run. The workflow
already attempts trusted publishing first and falls back to the token.

Then push a `v*` tag — `.github/workflows/publish.yml` does the rest, npm with
`--provenance`. Missing secrets skip their job rather than failing the run.

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
| Postman | skipped — free plan no longer allows sharing |
| npm | one manual publish + OTP, then trusted publishing |
| PyPI | `PYPI_TOKEN` |
| Awesome REST / Public APIs | ready |
| RapidAPI | PayPal payout + reseller-pricing decision |
| Zyla / APILayer | reseller-pricing decision |
| Product Hunt | ready — stranger signup verified |
