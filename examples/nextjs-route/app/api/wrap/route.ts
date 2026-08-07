/**
 * AmberOne API — Next.js App Router example.
 *
 * Shows the one thing most integrations get wrong: **the API key stays on the
 * server.** This route is the boundary. Your browser code calls your route;
 * your route calls the AmberOne API. A key that reaches the client is a public
 * key, whatever the variable is named — `NEXT_PUBLIC_` prefixed or not, if it
 * ends up in a bundle a user downloads, it is disclosed.
 *
 *   POST /api/wrap   { "url": "https://your-site.com" }
 *   GET  /api/wrap?id=job_…
 */
import { NextResponse } from "next/server";
import { AmberOneClient as WrapperClient, AmberOneApiError as WrapperApiError } from "@amberone/api";

export const runtime = "nodejs"; // needs the server-only env var

function client() {
  const apiKey = process.env.AMBERONE_API_KEY;
  if (!apiKey) throw new Error("AMBERONE_API_KEY is not set on the server.");
  return new WrapperClient({ apiKey });
}

/** Map an SDK error onto a response that is safe to show a browser. */
function toResponse(err: unknown) {
  if (err instanceof WrapperApiError) {
    // Pass the code through — your UI can branch on it — but not the raw
    // details, which may describe your account's limits.
    return NextResponse.json(
      { error: err.code, message: err.message, requestId: err.requestId },
      { status: err.status },
    );
  }
  console.error("[wrap]", err);
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}

export async function POST(req: Request) {
  try {
    const { url } = (await req.json()) as { url?: string };
    if (!url) {
      return NextResponse.json({ error: "invalid_request", message: "url is required" }, { status: 400 });
    }

    // Submit and return immediately. Holding a serverless function open for the
    // duration of a wrap is how you meet your platform's execution timeout.
    const job = await client().createJob({ url, platforms: ["PWA", "ANDROID_PROJECT"] });

    return NextResponse.json({ jobId: job.id, status: job.status }, { status: 202 });
  } catch (err) {
    return toResponse(err);
  }
}

export async function GET(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "invalid_request", message: "id is required" }, { status: 400 });
    }

    const job = await client().getJob(id);

    // Return only what the browser needs. The full job carries the scan report
    // and certification, which are large and rarely wanted on every poll.
    return NextResponse.json({
      id: job.id,
      status: job.status,
      stage: job.stage,
      progress: job.progress,
      ready: job.download.available,
      error: job.error,
    });
  } catch (err) {
    return toResponse(err);
  }
}
