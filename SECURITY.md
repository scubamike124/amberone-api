# Security policy

## Reporting a vulnerability

Email **security@amberoneai.com** (or use the contact path on
[hq.amberoneai.com](https://hq.amberoneai.com)). Please do not open a public
GitHub issue for a vulnerability — a public report is a disclosure, and it puts
every customer at risk for as long as the fix takes.

Include what you did, what happened, and what you expected. A `requestId` from
any response involved makes it far faster to find the request in our logs.

**What to expect:** acknowledgement within 2 business days, an assessment with
a severity and a target fix date within 7 days, and credit in the changelog if
you would like it.

We will not pursue legal action against good-faith research that stays within
the boundaries below.

## Scope

**In scope:** the public AmberOne API at `hq.amberoneai.com`, authentication and
key handling, tenant isolation, the URL safety gate, billing and quota
enforcement, and the SDKs in this repository.

**Out of scope:** findings against third-party sites you submit for scanning —
those belong to their owners; denial of service and volumetric testing; social
engineering; and reports from automated scanners with no demonstrated impact.

**Do not test with other people's websites.** Submit URLs you own or are
authorised to test. The API fetches what you give it, and pointing it at a
third party makes you responsible for that traffic.

## How we protect your data

**API keys** are stored only as SHA-256 hashes. We cannot recover a key — the
secret is shown once at creation, and losing it means rotating rather than
retrieving. Rotation issues a replacement and revokes the old key in one
operation, so there is no window with neither key valid or both.

**Tenant isolation** is enforced in the query, not after it: every read is
scoped by account in the same statement that selects by id. A resource
belonging to another account returns `404`, identical to one that does not
exist — distinguishing them would confirm the existence of somebody else's job.

**Submitted URLs** pass a safety gate before any request is made. Non-HTTP
schemes, embedded credentials, non-standard ports, and reserved or private
address ranges are refused — including a public hostname whose DNS answer is
private, and any redirect hop that lands on one. Each hop is re-checked rather
than only the address you typed.

**Signing keys and store credentials** are never requested, transmitted, or
stored. Builds happen on your machine. This is why the API returns projects
rather than signed binaries.

**Artifacts** are scoped to the account that produced them and expire with your
plan's retention period. Each download carries `X-Artifact-SHA256` so you can
verify the bytes match what the certification report attested to; the official
SDKs check this automatically and raise on mismatch.

## Your responsibilities

- Keep keys out of client-side code, mobile apps, and public repositories. A key
  in a front-end bundle is a public key.
- Use `wrap_test_` keys for development and CI.
- Rotate immediately if a key may have been exposed — from the dashboard.
- Scope keys to what an integration needs where you can.

## Supported versions

`v1` is the current API version. Breaking changes ship as a new version path,
never as a change to `v1`. Security fixes are applied to `v1` for as long as it
is served; the deprecation notice period will be at least 12 months.
