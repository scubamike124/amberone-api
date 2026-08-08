# amberone-api

**Turn any website into a build-ready mobile or desktop app project.**

Official TypeScript/JavaScript SDK for the [AmberOne API](https://hq.amberoneai.com).
Zero dependencies — uses the built-in `fetch`.

```bash
npm install amberone-api
```

## What you get

A **project**, not a compiled app.

Android and iOS outputs are Capacitor projects ready for `./gradlew assembleRelease`
or Xcode's Archive. Nothing is compiled, signed, installed, or submitted on your
behalf — which means **your signing keys never leave your machine.** We cannot
lose what we never hold.

If you wanted a finished, signed `.apk`, this is not that, and you should know
before you pay.

## Quick start

```ts
import { AmberOneClient } from "amberone-api";

const client = new AmberOneClient({ apiKey: process.env.AMBERONE_API_KEY! });

// Costs no quota — proves the key works and shows your limits.
const account = await client.account();
console.log(account.plan.slug, account.plan.limits.wrapsPerPeriod);

// Scan first: tells you what a wrap would inherit. Synchronous.
const scan = await client.scan("https://your-site.com");
console.log(scan.checks.length);

// Submit, poll, download.
const job = await client.wrapAndWait(
  { url: "https://your-site.com", appName: "My App", platforms: ["PWA", "ANDROID_PROJECT"] },
  { onProgress: (j) => console.log(j.status, j.progress) },
);

const { bytes } = await client.download(job.id);
```

`download()` verifies the archive against the SHA-256 the certification report
published, and throws rather than handing you bytes that do not match.

## Platforms

| Platform | What you receive |
|---|---|
| `PWA` | Manifest, icons, service worker, install shell |
| `CAPACITOR` | Configured Capacitor project, ready for `npx cap add` |
| `ANDROID_PROJECT` | Capacitor project plus manifest/theme merges and build steps |
| `IOS_PROJECT` | Capacitor project plus Info.plist merges and associated domains |
| `ELECTRON` | Desktop shell with external-link handling |

## Testing is free

Keys beginning `wrap_test_` run the **full** pipeline and are never billed. Get
one from **Dashboard → API keys** and evaluate the whole thing before spending
anything.

## Errors

Every failure throws `AmberOneApiError` with a stable `code` you can match on:

```ts
import { AmberOneApiError } from "amberone-api";

try {
  await client.scan("http://192.168.1.1");
} catch (err) {
  if (err instanceof AmberOneApiError) {
    console.log(err.code);      // "url_rejected" — stable, match on this
    console.log(err.retryable); // false
    console.log(err.requestId); // quote this to support
  }
}
```

Retry `rate_limited` and `5xx` — the client already honours `Retry-After`. Do not
retry other `4xx`; they will fail identically.

## Links

- **Docs, OpenAPI spec, Postman collection, examples:** [github.com/scubamike124/amberone-api](https://github.com/scubamike124/amberone-api)
- **Dashboard and keys:** [hq.amberoneai.com](https://hq.amberoneai.com)
- **Python SDK:** [`amberone-api`](https://pypi.org/project/amberone-api/)

`WrapperClient` and `WrapperApiError` remain exported as aliases of
`AmberOneClient` and `AmberOneApiError`, so existing code keeps working.

## Licence

MIT for this SDK. The hosted service is governed by the commercial terms at
[amberoneai.com/terms](https://amberoneai.com/terms) — you may vendor this client
freely, including in closed-source products; you may not resell API access.
