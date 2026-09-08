"""
session/store.py — Thread-safe in-memory session store.

Maps session_id → PatientHistoryState for the duration of a patient interview.
No database, no Redis, no persistence — state is lost when the process restarts.

Can be imported and used independently of the pipeline logic.
"""

import threading
from typing import Dict, Optional

from microservice.piplines.models.state import PatientHistoryState


class SessionStore:
    """
    Thread-safe in-memory session store.

    Usage::

        store = SessionStore()
        state = store.get_or_create("session-abc")
        store.save("session-abc", state)
        store.delete("session-abc")
    """

    def __init__(self) -> None:
        self._sessions: Dict[str, PatientHistoryState] = {}
        self._lock = threading.Lock()

    def get(self, session_id: str) -> Optional[PatientHistoryState]:
        """Return the state for a session, or None if it does not exist."""
        with self._lock:
            return self._sessions.get(session_id)

    def get_or_create(self, session_id: str) -> PatientHistoryState:
        """Return existing state or create a fresh one for the given session."""
        with self._lock:
            if session_id not in self._sessions:
                self._sessions[session_id] = PatientHistoryState(session_id=session_id)
            return self._sessions[session_id].model_copy(deep=True)

    def save(self, session_id: str, state: PatientHistoryState) -> None:
        """Persist (overwrite) the state for a session."""
        with self._lock:
            self._sessions[session_id] = state.model_copy(deep=True)

    def delete(self, session_id: str) -> None:
        """Remove a session from the store (e.g., after completion)."""
        with self._lock:
            self._sessions.pop(session_id, None)

    def exists(self, session_id: str) -> bool:
        """Return True if a session exists in the store."""
        with self._lock:
            return session_id in self._sessions

    def all_session_ids(self) -> list[str]:
        """Return all active session IDs (for debugging / monitoring)."""
        with self._lock:
            return list(self._sessions.keys())


# Module-level singleton used by both Pipeline 1 and the API layer.
session_store = SessionStore()
