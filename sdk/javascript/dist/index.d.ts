/**
 * AmberOne API — official JavaScript / TypeScript SDK.
 *
 * Zero dependencies: it wraps `fetch`, which every supported runtime now ships.
 * A client library for an HTTP API should not drag a tree of transitive
 * packages into a customer's build.
 */
export type WrapPlatform = "PWA" | "CAPACITOR" | "ELECTRON" | "ANDROID_PROJECT" | "IOS_PROJECT";
export type JobStatus = "QUEUED" | "SCANNING" | "FIXING" | "PACKAGING" | "TESTING" | "COMPLETED" | "FAILED" | "CANCELLED";
export type ErrorCode = "invalid_request" | "url_rejected" | "unsupported_platform" | "missing_api_key" | "invalid_api_key" | "api_key_revoked" | "api_key_expired" | "forbidden" | "plan_required" | "not_found" | "job_not_cancellable" | "conflict" | "payload_too_large" | "quota_exceeded" | "rate_limited" | "internal_error" | "not_implemented" | "upstream_unavailable";
/**
 * Thrown for any non-2xx response.
 *
 * `code` is the stable machine string — branch on it. `requestId` identifies
 * the exact request in our logs; quote it in a support ticket and we can find
 * it without asking you for a timestamp.
 */
export declare class WrapperApiError extends Error {
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
    });
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
    scores: Record<string, number> & {
        overall: number;
    };
    wrapReadiness: {
        pwa: boolean;
        capacitor: boolean;
        blockers: string[];
    };
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
    steps: {
        name: string;
        status: string;
        startedAt: string;
        finishedAt?: string;
        detail?: string;
    }[];
    error: {
        code: string;
        message: string;
    } | null;
    scanReport: ScanReport | Record<string, never>;
    fixReport: {
        attempted: number;
        applied: number;
        unnecessary: number;
        unsupported: number;
        failed: number;
        fixes: {
            id: string;
            title: string;
            outcome: string;
            before: string;
            after: string;
            evidenceFile?: string;
        }[];
        scope: string;
    } | Record<string, never>;
    certification: Record<string, unknown>;
    download: {
        available: boolean;
        bytes?: number;
        sha256?: string;
        url?: string;
    };
    attempts: number;
    queuedAt: string;
    startedAt: string | null;
    finishedAt: string | null;
};
export type Account = {
    account: {
        id: string;
        name: string;
        createdAt: string;
    };
    key: {
        prefix: string;
        environment: "live" | "test";
        scopes: string[];
    };
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
export declare class WrapperClient {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly timeoutMs;
    private readonly maxRetries;
    private readonly fetchImpl;
    constructor(options: ClientOptions);
    private request;
    /** Confirm the key works and read the plan's limits. Consumes no wrap quota. */
    account(): Promise<Account>;
    /** Scan a site without generating a package. */
    scan(url: string): Promise<ScanReport>;
    createJob(params: {
        url: string;
        appName?: string;
        platforms?: WrapPlatform[];
        themeColor?: string;
    }): Promise<Job>;
    getJob(id: string): Promise<Job>;
    listJobs(params?: {
        status?: JobStatus;
        limit?: number;
        cursor?: string;
    }): Promise<{
        jobs: Job[];
        nextCursor: string | null;
        hasMore: boolean;
    }>;
    cancelJob(id: string): Promise<Job>;
    getLogs(id: string, params?: {
        limit?: number;
        level?: "info" | "warn" | "error";
    }): Promise<{
        jobId: string;
        status: JobStatus;
        lines: {
            at: string;
            level: string;
            message: string;
        }[];
        truncated: boolean;
    }>;
    usage(days?: number): Promise<Record<string, unknown>>;
    /**
     * Download the generated archive.
     *
     * The SHA-256 the job reported is verified against the bytes received before
     * this resolves. A silently truncated download that you then unzip into a
     * build is a worse failure than an exception here.
     */
    download(id: string): Promise<{
        bytes: Uint8Array;
        sha256: string;
    }>;
    /**
     * Submit and wait. The convenience method most integrations actually want.
     *
     * Throws on FAILED rather than returning a failed job, so `await` either
     * gives you something you can build or raises — no silent half-success.
     */
    wrapAndWait(params: {
        url: string;
        appName?: string;
        platforms?: WrapPlatform[];
        themeColor?: string;
    }, options?: {
        pollIntervalMs?: number;
        timeoutMs?: number;
        onProgress?: (job: Job) => void;
    }): Promise<Job>;
}
/** Preferred name for new integrations. */
export { WrapperClient as AmberOneClient, WrapperApiError as AmberOneApiError };
export default WrapperClient;
