"""
AmberOne API — Python quick start.

The whole path in one file: check the key, scan, wrap, wait, download.

    export AMBERONE_API_KEY=wrap_live_…
    pip install amberone-api
    python main.py https://your-site.com
"""

import os
import sys

from wrapper_api import WrapperApiError, WrapperClient


def main() -> int:
    api_key = os.environ.get("AMBERONE_API_KEY") or os.environ.get("WRAPPER_API_KEY")
    if not api_key:
        print("Set AMBERONE_API_KEY first. Create a key in your dashboard under API keys.")
        return 1

    if len(sys.argv) < 2:
        print("Usage: python main.py https://your-site.com")
        return 1

    target = sys.argv[1]
    client = WrapperClient(
        api_key=api_key,
        base_url=os.environ.get("AMBERONE_BASE_URL", "https://hq.amberoneai.com"),
    )

    try:
        # 1. Confirm the key works. Costs nothing against your wrap quota.
        account = client.account()
        print(f"Account: {account['account']['name']}")
        print(f"Plan:    {account['plan']['name']} ({account['plan']['slug']})")
        wraps = account["usage"]["wraps"]
        print(f"Wraps:   {wraps['used']}/{wraps['limit']} used this period\n")

        # 2. Scan first — cheap, synchronous, tells you what a wrap will inherit.
        print(f"Scanning {target} …")
        scan = client.scan(target)
        print(f"  overall {scan['scores']['overall']}/100")
        for category, score in scan["scores"].items():
            if category != "overall":
                print(f"  {category:<14} {score}/100")

        for blocker in scan["wrapReadiness"]["blockers"]:
            print(f"  BLOCKER: {blocker}")

        # 3 & 4. Submit and wait. Raises on FAILED rather than returning one.
        print("\nSubmitting wrap job …")
        job = client.wrap_and_wait(
            target,
            app_name="My App",
            platforms=["PWA", "CAPACITOR", "ANDROID_PROJECT"],
            on_progress=lambda j: print(f"  {j['status'].lower()} — {j['stage']} ({j['progress']}%)"),
        )

        # 5. What was fixed, and what was not.
        print("\nFixes applied to the generated package:")
        for fix in job["fixReport"]["fixes"]:
            print(f"  [{fix['outcome']}] {fix['title']}")
            if fix["outcome"] == "applied":
                print(f"     {fix['before']}")
                print(f"     → {fix['after']}")
        print(f"\n  {job['fixReport']['scope']}")

        # 6. Download. The SDK verifies the published hash before returning.
        archive = client.download(job["id"])
        out = f"wrapper-{job['id'][:8]}.zip"
        with open(out, "wb") as handle:
            handle.write(archive.content)

        size_kb = len(archive.content) / 1024
        print(f"\nSaved {out} ({size_kb:.1f} KB, sha256 verified)")
        print("Unzip it and follow README.md to build.")
        return 0

    except WrapperApiError as err:
        # err.code is the stable string to branch on; the message may be reworded.
        print(f"\n{err.code}: {err.message}", file=sys.stderr)
        if err.request_id:
            print(f"requestId: {err.request_id}", file=sys.stderr)
        if err.code == "quota_exceeded":
            print("Upgrade your plan or wait for the period to roll over.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
