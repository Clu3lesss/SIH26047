"""
config.py — LLM provider configuration and global rate limiter.

All LLM calls in the system must go through llm_call(), not chain.ainvoke() directly.
Provider, model, and API key are read from environment variables. No API keys hardcoded.

Environment variables:
  MISTRAL_API_KEY       — required
  MISTRAL_MODEL         — optional, defaults to mistral-small-latest
  MISTRAL_MIN_INTERVAL  — minimum seconds between any two LLM calls (default: 10.0)

Rate limiting design:
  A single asyncio.Semaphore(1) serializes all LLM calls across the entire app.
  Between calls, we wait at least MISTRAL_MIN_INTERVAL seconds.
  If Mistral returns a 429, llm_call() backs off exponentially (10 → 20 → 40 → 80 → 160 s)
  and retries until the server-side rate-limit window clears.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from typing import Any

from langchain_core.runnables import Runnable
from langchain_mistralai import ChatMistralAI

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# LLM singleton
# ---------------------------------------------------------------------------

_llm_instance: ChatMistralAI | None = None


def get_llm() -> ChatMistralAI:
    """Return the shared ChatMistralAI instance, creating it on first call."""
    global _llm_instance
    if _llm_instance is None:
        api_key = os.getenv("MISTRAL_API_KEY")
        if not api_key:
            raise EnvironmentError(
                "MISTRAL_API_KEY is not set. "
                "Add it to your .env file or environment before starting."
            )
        model = os.getenv("MISTRAL_MODEL", "mistral-small-latest")
        _llm_instance = ChatMistralAI(
            api_key=api_key,
            model=model,
            temperature=0,
        )
    return _llm_instance


# ---------------------------------------------------------------------------
# Global async rate limiter + 429-aware retry
# ---------------------------------------------------------------------------

_llm_semaphore = asyncio.Semaphore(1)
_last_llm_call_time: float = 0.0
_MIN_INTERVAL: float = float(os.getenv("MISTRAL_MIN_INTERVAL", "3.0"))

_MAX_RETRIES = 6
_BASE_BACKOFF = 10.0   # seconds for first 429 retry; doubles each attempt


def _is_rate_limit_error(exc: Exception) -> bool:
    """Return True if the exception represents a Mistral 429 rate-limit error."""
    msg = str(exc).lower()
    return "429" in msg or "rate_limit" in msg or "rate limit" in msg


async def llm_call(chain: Runnable, inputs: dict[str, Any]) -> Any:
    """
    Invoke a LangChain chain with global rate limiting and 429 retry.

    Guarantees:
      - Only one LLM request in-flight at a time (Semaphore).
      - At least MISTRAL_MIN_INTERVAL seconds between consecutive calls.
      - On 429: exponential backoff (10 s, 20 s, 40 s, 80 s, 160 s, 320 s)
        before retrying — waits out Mistral's server-side quota window.

    Args:
        chain:  A compiled LangChain Runnable (prompt | structured_llm, etc.)
        inputs: Template variables for chain.ainvoke().

    Returns:
        The validated Pydantic result from the chain.

    Raises:
        RuntimeError: If all retry attempts are exhausted.
    """
    global _last_llm_call_time

    async with _llm_semaphore:
        # ---- baseline interval ----
        elapsed = time.monotonic() - _last_llm_call_time
        gap = _MIN_INTERVAL - elapsed
        if gap > 0:
            log.debug("Rate limiter: waiting %.1f s before next LLM call.", gap)
            await asyncio.sleep(gap)

        # ---- call with 429-aware retry ----
        backoff = _BASE_BACKOFF
        for attempt in range(1, _MAX_RETRIES + 1):
            try:
                result = await chain.ainvoke(inputs)
                _last_llm_call_time = time.monotonic()
                return result
            except Exception as exc:
                if _is_rate_limit_error(exc):
                    if attempt == _MAX_RETRIES:
                        raise RuntimeError(
                            f"Mistral rate limit: all {_MAX_RETRIES} retry attempts exhausted. "
                            "Try increasing MISTRAL_MIN_INTERVAL in .env."
                        ) from exc
                    log.warning(
                        "Mistral 429 on attempt %d/%d — backing off %.0f s.",
                        attempt, _MAX_RETRIES, backoff,
                    )
                    await asyncio.sleep(backoff)
                    backoff = min(backoff * 2, 320)   # cap at ~5 minutes
                else:
                    raise   # non-rate-limit errors propagate immediately

        # Should not be reached, but satisfies type checkers
        raise RuntimeError("llm_call: retry loop exited unexpectedly")


# ---------------------------------------------------------------------------
# Retry wrapper (secondary defence, handles non-429 transient errors)
# ---------------------------------------------------------------------------

def make_retriable(chain: Runnable) -> Runnable:
    """Wrap a chain with LangChain's built-in retry for non-429 transient errors."""
    return chain.with_retry(
        retry_if_exception_type=(Exception,),
        stop_after_attempt=3,
        wait_exponential_jitter=True,
    )


