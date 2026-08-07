"""
Wrapper API — official Python SDK.

Depends only on `requests`. Import-time cost and dependency surface both matter
to the people integrating this, and neither is worth an async framework for what
is six HTTP calls.
"""

from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass
from typing import Any, Callable, Iterable, Literal, Optional

import requests

__version__ = "1.0.0"

Platform = Literal["PWA", "CAPACITOR", "ELECTRON", "ANDROID_PROJECT", "IOS_PROJECT"]
JobStatus = Literal[
    "QUEUED", "SCANNING", "FIXING", "PACKAGING", "TESTING", "COMPLETED", "FAILED", "CANCELLED"
]

TERMINAL_STATUSES = {"COMPLETED", "FAILED", "CANCELLED"}
DEFAULT_BASE_URL = "https://hq.amberoneai.com"


class WrapperApiError(Exception):
    """
    Raised for any non-2xx response.

    ``code`` is the stable machine string — branch on that, not on the message.
    ``request_id`` identifies the exact request in our logs; quoting it in a
    support ticket saves both sides a round of "when did this happen".
    """

    def __init__(
        self,
        code: str,
        message: str,
        status: int,
        request_id: Optional[str] = None,
        details: Any = None,
    ) -> None:
        super().__init__(f"[{code}] {message}")
        self.code = code
        self.message = message
        self.status = status
        self.request_id = request_id
        self.details = details

    @property
    def retryable(self) -> bool:
        """True when retrying the identical request could succeed."""
        return self.status == 429 or self.status >= 500


@dataclass
class Download:
    content: bytes
    sha256: str


class WrapperClient:
    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 60.0,
        max_retries: int = 2,
        session: Optional[requests.Session] = None,
    ) -> None:
        if not api_key:
            raise ValueError("api_key is required")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        self._session = session or requests.Session()
        self._session.headers.update(
            {"Authorization": f"Bearer {api_key}", "User-Agent": f"amberone-api-python/{__version__}"}
        )

    # ---------------------------------------------------------------- internals

    def _request(self, method: str, path: str, json: Any = None, params: Any = None) -> Any:
        last_error: Optional[WrapperApiError] = None

        for attempt in range(self.max_retries + 1):
            response = self._session.request(
                method, f"{self.base_url}{path}", json=json, params=params, timeout=self.timeout
            )
            try:
                payload = response.json()
            except ValueError:
                payload = {}

            if response.ok and payload.get("ok"):
                return payload.get("data")

            error = payload.get("error") or {}
            last_error = WrapperApiError(
                code=error.get("code", "internal_error"),
                message=error.get("message", f"HTTP {response.status_code}"),
                status=response.status_code,
                request_id=payload.get("requestId"),
                details=error.get("details"),
            )

            if not last_error.retryable or attempt == self.max_retries:
                raise last_error

            # Honour Retry-After when the server sent one. Guessing an interval
            # we have already been told is how a client turns a rate limit into
            # a rate-limit loop.
            retry_after = response.headers.get("Retry-After")
            wait = float(retry_after) if retry_after and retry_after.isdigit() else min(2**attempt, 8)
            time.sleep(wait)

        raise last_error or RuntimeError("Request failed")

    # ------------------------------------------------------------------- calls

    def account(self) -> dict:
        """Confirm the key works and read the plan's limits. Consumes no wrap quota."""
        return self._request("GET", "/api/v1/account")

    def scan(self, url: str) -> dict:
        """Scan a site for wrap compatibility without generating a package."""
        return self._request("POST", "/api/v1/scan", json={"url": url})

    def create_job(
        self,
        url: str,
        app_name: Optional[str] = None,
        platforms: Optional[Iterable[Platform]] = None,
        theme_color: Optional[str] = None,
    ) -> dict:
        body: dict[str, Any] = {"url": url}
        if app_name:
            body["appName"] = app_name
        if platforms:
            body["platforms"] = list(platforms)
        if theme_color:
            body["themeColor"] = theme_color
        return self._request("POST", "/api/v1/jobs", json=body)

    def get_job(self, job_id: str) -> dict:
        return self._request("GET", f"/api/v1/jobs/{job_id}")

    def list_jobs(
        self, status: Optional[JobStatus] = None, limit: int = 20, cursor: Optional[str] = None
    ) -> dict:
        params: dict[str, Any] = {"limit": limit}
        if status:
            params["status"] = status
        if cursor:
            params["cursor"] = cursor
        return self._request("GET", "/api/v1/jobs", params=params)

    def cancel_job(self, job_id: str) -> dict:
        return self._request("DELETE", f"/api/v1/jobs/{job_id}")

    def get_logs(self, job_id: str, limit: int = 200, level: Optional[str] = None) -> dict:
        params: dict[str, Any] = {"limit": limit}
        if level:
            params["level"] = level
        return self._request("GET", f"/api/v1/jobs/{job_id}/logs", params=params)

    def usage(self, days: int = 30) -> dict:
        return self._request("GET", "/api/v1/usage", params={"days": days})

    def download(self, job_id: str) -> Download:
        """
        Fetch the generated archive.

        The published SHA-256 is verified against the bytes received before this
        returns. A silently truncated archive that you then unzip into a build
        is a worse failure than an exception here.
        """
        response = self._session.get(
            f"{self.base_url}/api/v1/jobs/{job_id}/download", timeout=self.timeout
        )
        if not response.ok:
            try:
                payload = response.json()
            except ValueError:
                payload = {}
            error = payload.get("error") or {}
            raise WrapperApiError(
                code=error.get("code", "internal_error"),
                message=error.get("message", f"HTTP {response.status_code}"),
                status=response.status_code,
                request_id=payload.get("requestId"),
            )

        content = response.content
        expected = response.headers.get("X-Artifact-SHA256")
        actual = hashlib.sha256(content).hexdigest()
        if expected and expected != actual:
            raise RuntimeError(
                f"Downloaded archive does not match its published hash "
                f"(expected {expected}, got {actual})."
            )
        return Download(content=content, sha256=actual)

    # ------------------------------------------------------------ convenience

    def wrap_and_wait(
        self,
        url: str,
        app_name: Optional[str] = None,
        platforms: Optional[Iterable[Platform]] = None,
        theme_color: Optional[str] = None,
        poll_interval: float = 3.0,
        timeout: float = 600.0,
        on_progress: Optional[Callable[[dict], None]] = None,
    ) -> dict:
        """
        Submit and wait.

        Raises on FAILED rather than returning a failed job, so the call either
        gives you something you can build or raises — no silent half-success.
        """
        job = self.create_job(url, app_name=app_name, platforms=platforms, theme_color=theme_color)
        if on_progress:
            on_progress(job)

        deadline = time.time() + timeout
        while job["status"] not in TERMINAL_STATUSES:
            if time.time() > deadline:
                raise TimeoutError(
                    f"Job {job['id']} did not finish within {timeout}s (last status: {job['status']})."
                )
            time.sleep(poll_interval)
            job = self.get_job(job["id"])
            if on_progress:
                on_progress(job)

        if job["status"] != "COMPLETED":
            error = job.get("error") or {}
            raise WrapperApiError(
                code=error.get("code", "internal_error"),
                message=error.get("message", f"Job ended as {job['status']}."),
                status=200,
            )
        return job


__all__ = ["WrapperClient", "WrapperApiError", "Download", "__version__"]


# Preferred names for new integrations
AmberOneClient = WrapperClient
AmberOneApiError = WrapperApiError
