/**
 * AmberOne API — Node.js quick start.
 *
 * The whole path in one file: check the key, scan, wrap, wait, download.
 *
 *   AMBERONE_API_KEY=wrap_live_… node index.js https://your-site.com
 *
 * No dependencies. Node 18+ has fetch built in.
 */

const fs = require("fs");
const { createHash } = require("crypto");

const API_KEY = process.env.AMBERONE_API_KEY || process.env.WRAPPER_API_KEY;
const BASE_URL = process.env.AMBERONE_BASE_URL || process.env.WRAPPER_BASE_URL || "https://hq.amberoneai.com";
const TARGET = process.argv[2];

if (!API_KEY) {
  console.error("Set AMBERONE_API_KEY first. Create a key in your dashboard under API keys.");
  process.exit(1);
}
if (!TARGET) {
  console.error("Usage: node index.js https://your-site.com");
  process.exit(1);
}

async function call(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${API_KEY}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await res.json();

  if (!payload.ok) {
    // error.code is the stable string to branch on; message may be reworded.
    console.error(`\n${payload.error.code}: ${payload.error.message}`);
    if (payload.requestId) console.error(`requestId: ${payload.requestId}`);
    process.exit(1);
  }
  return payload.data;
}

async function main() {
  // 1. Confirm the key works. This costs nothing against your wrap quota.
  const account = await call("GET", "/api/v1/account");
  console.log(`Account: ${account.account.name}`);
  console.log(`Plan:    ${account.plan.name} (${account.plan.slug})`);
  console.log(`Wraps:   ${account.usage.wraps.used}/${account.usage.wraps.limit} used this period\n`);

  // 2. Scan first. Cheap, synchronous, and tells you what a wrap will inherit.
  console.log(`Scanning ${TARGET} …`);
  const scan = await call("POST", "/api/v1/scan", { url: TARGET });
  console.log(`  overall ${scan.scores.overall}/100`);
  for (const [category, score] of Object.entries(scan.scores)) {
    if (category !== "overall") console.log(`  ${category.padEnd(14)} ${score}/100`);
  }
  if (scan.wrapReadiness.blockers.length) {
    console.log("\n  Blockers:");
    for (const blocker of scan.wrapReadiness.blockers) console.log(`   - ${blocker}`);
  }

  // 3. Wrap. Returns immediately with a queued job.
  console.log(`\nSubmitting wrap job …`);
  let job = await call("POST", "/api/v1/jobs", {
    url: TARGET,
    appName: "My App",
    platforms: ["PWA", "CAPACITOR", "ANDROID_PROJECT"],
  });
  console.log(`  job ${job.id}`);

  // 4. Poll. Three seconds is polite; the job publishes stage and progress.
  const TERMINAL = ["COMPLETED", "FAILED", "CANCELLED"];
  while (!TERMINAL.includes(job.status)) {
    await new Promise((r) => setTimeout(r, 3000));
    job = await call("GET", `/api/v1/jobs/${job.id}`);
    console.log(`  ${job.status.toLowerCase()} — ${job.stage} (${job.progress}%)`);
  }

  if (job.status !== "COMPLETED") {
    console.error(`\nJob ${job.status}: ${job.error?.message ?? "no detail"}`);
    const logs = await call("GET", `/api/v1/jobs/${job.id}/logs?level=error`);
    for (const line of logs.lines) console.error(`  ${line.message}`);
    process.exit(1);
  }

  // 5. What was fixed, and what was not.
  console.log(`\nFixes applied to the generated package:`);
  for (const fix of job.fixReport.fixes) {
    console.log(`  [${fix.outcome}] ${fix.title}`);
    if (fix.outcome === "applied") console.log(`     ${fix.before}\n     → ${fix.after}`);
  }
  console.log(`\n  ${job.fixReport.scope}`);

  // 6. Download, and verify the bytes against the published hash.
  const res = await fetch(`${BASE_URL}/api/v1/jobs/${job.id}/download`, {
    headers: { authorization: `Bearer ${API_KEY}` },
  });
  const bytes = Buffer.from(await res.arrayBuffer());
  const actual = createHash("sha256").update(bytes).digest("hex");
  const expected = res.headers.get("x-artifact-sha256");

  if (expected && actual !== expected) {
    console.error(`\nDownload does not match its published hash. Do not build this archive.`);
    process.exit(1);
  }

  const out = `wrapper-${job.id.slice(0, 8)}.zip`;
  fs.writeFileSync(out, bytes);
  console.log(`\nSaved ${out} (${(bytes.length / 1024).toFixed(1)} KB, sha256 verified)`);
  console.log(`Unzip it and follow README.md to build.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
