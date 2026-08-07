# Licensing

Two different things live under this one repository, and they are licensed
differently. The short version:

**You may fork this SDK, vendor it, and ship it inside a closed-source product.
You may not resell access to the API itself without a separate agreement.**

---

## The code in this repository — MIT

[`LICENSE`](./LICENSE) is a plain MIT licence and it covers everything here:

- the JavaScript/TypeScript SDK (`sdk/javascript`)
- the Python SDK (`sdk/python`)
- the example projects (`examples/`)
- the OpenAPI document and the documentation

Use it commercially, modify it, redistribute it, relicense your fork. No
attribution beyond the copyright notice, no notification, no restriction.

## The hosted API service — commercial terms

MIT does **not** licence the AmberOne API service. Access to the hosted service
is governed by the commercial terms at <https://amberoneai.com/terms> and by
whichever plan you subscribe to.

Nothing in those terms restricts what you do with the client code above, and
nothing in the MIT licence grants a right to use the service beyond your plan.

## Why this split

It is the arrangement almost every commercial API uses, and it exists so that
the client library never becomes a liability for you. If the SDK were licensed
under the service terms, vendoring it into your product would drag those terms
along with it — and a dependency that carries someone else's commercial terms
into your codebase is a dependency your legal team will make you remove.

Keeping the client permissive and the service commercial means the only thing
you are ever buying is the thing that actually costs us money to run.

## Questions

If your situation does not fit — reselling, white-labelling, air-gapped or
on-premise deployment — those are all negotiable and none of them are covered by
the standard terms. Open an issue or use the contact route in the terms page.
