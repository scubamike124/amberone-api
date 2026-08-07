/**
 * AmberOne API — official JavaScript / TypeScript SDK.
 *
 * Zero dependencies: it wraps `fetch`, which every supported runtime now ships.
 * A client library for an HTTP API should not drag a tree of transitive
 * packages into a customer's build.
 */

export type WrapPlatform = "PWA" | "CAPACITOR" | "ELECTRON" | "ANDROID_PROJECT" | "IOS_PROJECT";

export type JobStatus =
  | "QUEUED"
  | "SCANNING"
  | "FIXING"
  | "PACKAGING"
  | "TESTING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type ErrorCode =
  | "invalid_request"
  | "url_rejected"
  | "unsupported_platform"
  | "missing_api_key"
  | "invalid_api_key"
  | "api_key_revoked"
  | "api_key_expired"
  | "forbidden"
  | "plan_required"
  | "not_found"
  | "job_not_cancellable"
  | "conflict"
  | "payload_too_large"
  | "quota_exceeded"
  | "rate_limited"
  | "internal_error"
  | "not_implemented"
  | "upstream_unavailable";

/**
 * Thrown for any non-2xx response.
 *
 * `code` is the stable machine string — branch on it. `requestId` identifies
 * the exact request in our logs; quote it in a support ticket and we can find
 * it without asking you for a timestamp.
 */
export class WrapperApiError extends Error {
  readonly code: ErrorCode | string;
  readonly status: number;
  readonly requestId: string | undefined;
  readonly details: unknown;
  /** True when retrying the identical request could succeed. */
  readonly retryable: boolean;

  constructor(params: {
    code: string;
    message: string;
    status: number;
    requestId?: string;
    details?: unknown;
  }) {
    super(params.message);
    this.name = "WrapperApiError";
    this.code = params.code;
    this.status = params.status;
    this.requestId = params.requestId;
    this.details = params.details;
    this.retryable = params.status === 429 || params.status >= 500;
  }
}

export type Check = {
  id: string;
  category: string;
  title: string;
  status: "pass" | "warn" | "fail" | "requires_browser" | "skipped";
  detail: string;
  evidence?: string;
  fixable: boolean;
};

export type ScanReport = {
  url: string;
  finalUrl: string;
  scannedAt: string;
  durationMs: number;
  checks: Check[];
  scores: Record<string, number> & { overall: number };
  wrapReadiness: { pwa: boolean; capacitor: boolean; blockers: string[] };
  notes: string[];
};

export type Job = {
  id: string;
  status: JobStatus;
  stage: string;
  progress: number;
  environment: "live" | "test";
  sourceUrl: string;
  appName: string;
  platforms: WrapPlatform[];
  steps: { name: string; status: string; startedAt: string; finishedAt?: string; detail?: string }[];
  error: { code: string; message: string } | null;
  scanReport: ScanReport | Record<string, never>;
  fixReport: {
    attempted: number;
    applied: number;
    unnecessary: number;
    unsupported: number;
    failed: number;
    fixes: { id: string; title: string; outcome: string; before: string; after: string; evidenceFile?: string }[];
    scope: string;
  } | Record<string, never>;
  certification: Record<string, unknown>;
  download: { available: boolean; bytes?: number; sha256?: string; url?: string };
  attempts: number;
  queuedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export type Account = {
  account: { id: string; name: string; createdAt: string };
  key: { prefix: string; environment: "live" | "test"; scopes: string[] };
  plan: {
    slug: string;
    name: string;
    status: string;
    limits: Record<string, unknown>;
    periodStart: string;
    periodEnd: string;
  };
  usage: Record<string, unknown>;
};

export type ClientOptions = {
  apiKey: string;
  baseUrl?: string;
  /** Per-request timeout. Default 60s — the scan endpoint is synchronous. */
  timeoutMs?: number;
  /** Automatic retries for 429 and 5xx. Default 2. */
  maxRetries?: number;
  fetch?: typeof fetch;
};

const TERMINAL: JobStatus[] = ["COMPLETED", "FAILED", "CANCELLED"];

export class WrapperClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ClientOptions) {
    if (!options.apiKey) throw new Error("apiKey is required");
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? "https://hq.amberoneai.com").replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.maxRetries = options.maxRetries ?? 2;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let lastError: WrapperApiError | undefined;

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

        const payload = (await res.json()) as {
          ok: boolean;
          data?: T;
          error?: { code: string; message: string; details?: unknown };
          requestId?: string;
        };

        if (res.ok && payload.ok) return payload.data as T;

        lastError = new WrapperApiError({
          code: payload.error?.code ?? "internal_error",
          message: payload.error?.message ?? `HTTP ${res.status}`,
          status: res.status,
          requestId: payload.requestId,
          details: payload.error?.details,
        });

        if (!lastError.retryable || attempt === this.maxRetries) throw lastError;

        // Honour Retry-After when the server sent one — guessing an interval
        // when we have been told the right one is how a client turns a rate
        // limit into a rate-limit loop.
        const retryAfter = Number(res.headers.get("retry-after"));
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : Math.min(2 ** attempt * 1000, 8000);
        await new Promise((r) => setTimeout(r, waitMs));
      } catch (err) {
        if (err instanceof WrapperApiError) throw err;
        if (attempt === this.maxRetries) throw err;
        await new Promise((r) => setTimeout(r, Math.min(2 ** attempt * 1000, 8000)));
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError ?? new Error("Request failed");
  }

  /** Confirm the key works and read the plan's limits. Consumes no wrap quota. */
  account(): Promise<Account> {
    return this.request<Account>("GET", "/api/v1/account");
  }

  /** Scan a site without generating a package. */
  scan(url: string): Promise<ScanReport> {
    return this.request<ScanReport>("POST", "/api/v1/scan", { url });
  }

  createJob(params: {
    url: string;
    appName?: string;
    platforms?: WrapPlatform[];
    themeColor?: string;
  }): Promise<Job> {
    return this.request<Job>("POST", "/api/v1/jobs", params);
  }

  getJob(id: string): Promise<Job> {
    return this.request<Job>("GET", `/api/v1/jobs/${encodeURIComponent(id)}`);
  }

  listJobs(params: { status?: JobStatus; limit?: number; cursor?: string } = {}): Promise<{
    jobs: Job[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.limit) query.set("limit", String(params.limit));
    if (params.cursor) query.set("cursor", params.cursor);
    const qs = query.toString();
    return this.request("GET", `/api/v1/jobs${qs ? `?${qs}` : ""}`);
  }

  cancelJob(id: string): Promise<Job> {
    return this.request<Job>("DELETE", `/api/v1/jobs/${encodeURIComponent(id)}`);
  }

  getLogs(id: string, params: { limit?: number; level?: "info" | "warn" | "error" } = {}): Promise<{
    jobId: string;
    status: JobStatus;
    lines: { at: string; level: string; message: string }[];
    truncated: boolean;
  }> {
    const query = new URLSearchParams();
    if (params.limit) query.set("limit", String(params.limit));
    if (params.level) query.set("level", params.level);
    const qs = query.toString();
    return this.request("GET", `/api/v1/jobs/${encodeURIComponent(id)}/logs${qs ? `?${qs}` : ""}`);
  }

  usage(days = 30): Promise<Record<string, unknown>> {
    return this.request("GET", `/api/v1/usage?days=${days}`);
  }

  /**
   * Download the generated archive.
   *
   * The SHA-256 the job reported is verified against the bytes received before
   * this resolves. A silently truncated download that you then unzip into a
   * build is a worse failure than an exception here.
   */
  async download(id: string): Promise<{ bytes: Uint8Array; sha256: string }> {
    const res = await this.fetchImpl(`${this.baseUrl}/api/v1/jobs/${encodeURIComponent(id)}/download`, {
      headers: { authorization: `Bearer ${this.apiKey}` },
    });

    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as {
        error?: { code: string; message: string };
        requestId?: string;
      };
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
  async wrapAndWait(
    params: { url: string; appName?: string; platforms?: WrapPlatform[]; themeColor?: string },
    options: { pollIntervalMs?: number; timeoutMs?: number; onProgress?: (job: Job) => void } = {},
  ): Promise<Job> {
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
