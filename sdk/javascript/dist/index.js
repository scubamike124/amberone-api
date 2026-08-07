/**
 * AmberOne API — official JavaScript / TypeScript SDK.
 *
 * Zero dependencies: it wraps `fetch`, which every supported runtime now ships.
 * A client library for an HTTP API should not drag a tree of transitive
 * packages into a customer's build.
 */
/**
 * Thrown for any non-2xx response.
 *
 * `code` is the stable machine string — branch on it. `requestId` identifies
 * the exact request in our logs; quote it in a support ticket and we can find
 * it without asking you for a timestamp.
 */
export class WrapperApiError extends Error {
    code;
    status;
    requestId;
    details;
    /** True when retrying the identical request could succeed. */
    retryable;
    constructor(params) {
        super(params.message);
        this.name = "WrapperApiError";
        this.code = params.code;
        this.status = params.status;
        this.requestId = params.requestId;
        this.details = params.details;
        this.retryable = params.status === 429 || params.status >= 500;
    }
}
const TERMINAL = ["COMPLETED", "FAILED", "CANCELLED"];
export class WrapperClient {
    apiKey;
    baseUrl;
    timeoutMs;
    maxRetries;
    fetchImpl;
    constructor(options) {
        if (!options.apiKey)
            throw new Error("apiKey is required");
        this.apiKey = options.apiKey;
        this.baseUrl = (options.baseUrl ?? "https://hq.amberoneai.com").replace(/\/$/, "");
        this.timeoutMs = options.timeoutMs ?? 60_000;
        this.maxRetries = options.maxRetries ?? 2;
        this.fetchImpl = options.fetch ?? globalThis.fetch;
    }
    async request(method, path, body) {
        let lastError;
        for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), this.timeoutMs);
            try {
                const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
                    method,
                    headers: {
                        authorization: `Bearer ${this.apiKey}`,
                        ...(body ? { "content-type": "application/json" } : {}),
                    },
                    ...(body ? { body: JSON.stringify(body) } : {}),
                    signal: controller.signal,
                });
                const payload = (await res.json());
                if (res.ok && payload.ok)
                    return payload.data;
                lastError = new WrapperApiError({
                    code: payload.error?.code ?? "internal_error",
                    message: payload.error?.message ?? `HTTP ${res.status}`,
                    status: res.status,
                    requestId: payload.requestId,
                    details: payload.error?.details,
                });
                if (!lastError.retryable || attempt === this.maxRetries)
                    throw lastError;
                // Honour Retry-After when the server sent one — guessing an interval
                // when we have been told the right one is how a client turns a rate
                // limit into a rate-limit loop.
                const retryAfter = Number(res.headers.get("retry-after"));
                const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
                    ? retryAfter * 1000
                    : Math.min(2 ** attempt * 1000, 8000);
                await new Promise((r) => setTimeout(r, waitMs));
            }
            catch (err) {
                if (err instanceof WrapperApiError)
                    throw err;
                if (attempt === this.maxRetries)
                    throw err;
                await new Promise((r) => setTimeout(r, Math.min(2 ** attempt * 1000, 8000)));
            }
            finally {
                clearTimeout(timer);
            }
        }
        throw lastError ?? new Error("Request failed");
    }
    /** Confirm the key works and read the plan's limits. Consumes no wrap quota. */
    account() {
        return this.request("GET", "/api/v1/account");
    }
    /** Scan a site without generating a package. */
    scan(url) {
        return this.request("POST", "/api/v1/scan", { url });
    }
    createJob(params) {
        return this.request("POST", "/api/v1/jobs", params);
    }
    getJob(id) {
        return this.request("GET", `/api/v1/jobs/${encodeURIComponent(id)}`);
    }
    listJobs(params = {}) {
        const query = new URLSearchParams();
        if (params.status)
            query.set("status", params.status);
        if (params.limit)
            query.set("limit", String(params.limit));
        if (params.cursor)
            query.set("cursor", params.cursor);
        const qs = query.toString();
        return this.request("GET", `/api/v1/jobs${qs ? `?${qs}` : ""}`);
    }
    cancelJob(id) {
        return this.request("DELETE", `/api/v1/jobs/${encodeURIComponent(id)}`);
    }
    getLogs(id, params = {}) {
        const query = new URLSearchParams();
        if (params.limit)
            query.set("limit", String(params.limit));
        if (params.level)
            query.set("level", params.level);
        const qs = query.toString();
        return this.request("GET", `/api/v1/jobs/${encodeURIComponent(id)}/logs${qs ? `?${qs}` : ""}`);
    }
    usage(days = 30) {
        return this.request("GET", `/api/v1/usage?days=${days}`);
    }
    /**
     * Download the generated archive.
     *
     * The SHA-256 the job reported is verified against the bytes received before
     * this resolves. A silently truncated download that you then unzip into a
     * build is a worse failure than an exception here.
     */
    async download(id) {
        const res = await this.fetchImpl(`${this.baseUrl}/api/v1/jobs/${encodeURIComponent(id)}/download`, {
            headers: { authorization: `Bearer ${this.apiKey}` },
        });
        if (!res.ok) {
            const payload = (await res.json().catch(() => ({})));
            throw new WrapperApiError({
                code: payload.error?.code ?? "internal_error",
                message: payload.error?.message ?? `HTTP ${res.status}`,
                status: res.status,
                requestId: payload.requestId,
            });
        }
        const bytes = new Uint8Array(await res.arrayBuffer());
        const expected = res.headers.get("x-artifact-sha256");
        if (expected) {
            const digest = await crypto.subtle.digest("SHA-256", bytes);
            const actual = Array.from(new Uint8Array(digest))
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("");
            if (actual !== expected) {
                throw new Error(`Downloaded archive does not match its published hash (expected ${expected}, got ${actual}).`);
            }
        }
        return { bytes, sha256: expected ?? "" };
    }
    /**
     * Submit and wait. The convenience method most integrations actually want.
     *
     * Throws on FAILED rather than returning a failed job, so `await` either
     * gives you something you can build or raises — no silent half-success.
     */
    async wrapAndWait(params, options = {}) {
        const pollIntervalMs = options.pollIntervalMs ?? 3000;
        const timeoutMs = options.timeoutMs ?? 10 * 60_000;
        const deadline = Date.now() + timeoutMs;
        let job = await this.createJob(params);
        options.onProgress?.(job);
        while (!TERMINAL.includes(job.status)) {
            if (Date.now() > deadline) {
                throw new Error(`Job ${job.id} did not finish within ${timeoutMs}ms (last status: ${job.status}).`);
            }
            await new Promise((r) => setTimeout(r, pollIntervalMs));
            job = await this.getJob(job.id);
            options.onProgress?.(job);
        }
        if (job.status !== "COMPLETED") {
            throw new WrapperApiError({
                code: job.error?.code ?? "internal_error",
                message: job.error?.message ?? `Job ended as ${job.status}.`,
                status: 200,
            });
        }
        return job;
    }
}
/** Preferred name for new integrations. */
export { WrapperClient as AmberOneClient, WrapperApiError as AmberOneApiError };
export default WrapperClient;
