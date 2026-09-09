"""
pipeline1/orchestrator.py — Pipeline 1 turn-by-turn orchestrator.

Wires together all Pipeline 1 components into the complete per-turn flow:

  Patient Message
        ↓
  Get / Create Session State
        ↓
  Extraction Agent  (LLM)
        ↓
  Apply Updates     (deterministic merge)
        ↓
  Red-flag Agent    (LLM)
        ↓
  Completion Check  (deterministic)
        ↓
  ┌─── Incomplete ──────────────────────────────────┐
  │   Precedence Queue (deterministic)              │
  │        ↓                                        │
  │   Question Phrasing Agent (LLM)                 │
  │        ↓                                        │
  │   Return IntakeResponse(status=in_progress)     │
  └─────────────────────────────────────────────────┘
  └─── Complete ─────────────────────────────────────┐
       Return IntakeResponse(status=completed)        │
  ────────────────────────────────────────────────────┘

Pipeline 1 does NOT generate the physician summary.

LLM calls per turn:
  Normal turn: 3  (extraction + red-flag + question phrasing)
  Final turn:  2  (extraction + red-flag; no next question needed)
"""

from __future__ import annotations

import asyncio

from microservice.piplines.models.state import (
    FamilyHistoryEntry,
    IntakeResponse,
    PatientHistoryState,
    RedFlagResult,
    StateUpdate,
)
from microservice.piplines.pipeline1.agents import extraction_agent, question_agent, redflag_agent
from microservice.piplines.pipeline1.logic import completion_check, precedence_queue
from microservice.piplines.session.store import session_store


# ---------------------------------------------------------------------------
# State merge helper
# ---------------------------------------------------------------------------

def _apply_updates(state: PatientHistoryState, updates: StateUpdate) -> PatientHistoryState:
    """
    Merge extraction agent output into the current state.

    Strategy:
    - String fields: replace if update is not None.
    - List fields:   extend with new items (deduplicated by value).
    - _asked flags:  set to True if update says True (never set back to False).
    - Nested models: merge field-by-field.
    """

    # Chief complaint
    if updates.chief_complaint is not None:
        state.chief_complaint = updates.chief_complaint

    # HPI (SOCRATES)
    if updates.hpi is not None:
        h = updates.hpi
        if h.site is not None:
            state.hpi.site = h.site
        if h.onset is not None:
            state.hpi.onset = h.onset
        if h.character is not None:
            state.hpi.character = h.character
        if h.radiation is not None:
            state.hpi.radiation = h.radiation
        if h.severity is not None:
            state.hpi.severity = h.severity
        if h.timing is not None:
            state.hpi.timing = h.timing
        if h.associated_symptoms is not None:
            existing = set(state.hpi.associated_symptoms)
            state.hpi.associated_symptoms += [s for s in h.associated_symptoms if s not in existing]
        if h.exacerbating_factors is not None:
            existing = set(state.hpi.exacerbating_factors)
            state.hpi.exacerbating_factors += [f for f in h.exacerbating_factors if f not in existing]
        if h.relieving_factors is not None:
            existing = set(state.hpi.relieving_factors)
            state.hpi.relieving_factors += [f for f in h.relieving_factors if f not in existing]

    # Past Medical History
    if updates.conditions is not None:
        existing = set(c.lower() for c in state.conditions)
        state.conditions += [c for c in updates.conditions if c.lower() not in existing]
    if updates.conditions_asked:
        state.conditions_asked = True

    # Past Surgical History
    if updates.surgeries is not None:
        existing = set(s.lower() for s in state.surgeries)
        state.surgeries += [s for s in updates.surgeries if s.lower() not in existing]
    if updates.surgeries_asked:
        state.surgeries_asked = True

    # Drug History
    if updates.medications is not None:
        existing = set(m.lower() for m in state.medications)
        state.medications += [m for m in updates.medications if m.lower() not in existing]
    if updates.medications_asked:
        state.medications_asked = True

    # Allergy History
    if updates.allergies is not None:
        existing = set(a.lower() for a in state.allergies)
        state.allergies += [a for a in updates.allergies if a.lower() not in existing]
    if updates.allergies_asked:
        state.allergies_asked = True

    # Family History
    if updates.family_history is not None:
        existing_pairs = {(e.relation.lower(), e.condition.lower()) for e in state.family_history}
        for entry in updates.family_history:
            if (entry.relation.lower(), entry.condition.lower()) not in existing_pairs:
                state.family_history.append(entry)
    if updates.family_history_asked:
        state.family_history_asked = True

    # Social History
    if updates.social_history is not None:
        sh = updates.social_history
        if sh.diet is not None:
            state.social_history.diet = sh.diet
        if sh.smoking is not None:
            state.social_history.smoking = sh.smoking
        if sh.alcohol is not None:
            state.social_history.alcohol = sh.alcohol
        if sh.occupation is not None:
            state.social_history.occupation = sh.occupation
        if sh.living_situation is not None:
            state.social_history.living_situation = sh.living_situation
    if updates.social_history_asked:
        state.social_history_asked = True

    # Review of Systems
    if updates.review_of_systems is not None:
        ros = updates.review_of_systems
        if ros.cardiovascular is not None:
            state.review_of_systems.cardiovascular = ros.cardiovascular
        if ros.respiratory is not None:
            state.review_of_systems.respiratory = ros.respiratory
        if ros.gastrointestinal is not None:
            state.review_of_systems.gastrointestinal = ros.gastrointestinal
        if ros.neurological is not None:
            state.review_of_systems.neurological = ros.neurological
        if ros.musculoskeletal is not None:
            state.review_of_systems.musculoskeletal = ros.musculoskeletal
    if updates.review_of_systems_asked:
        state.review_of_systems_asked = True

    return state


# ---------------------------------------------------------------------------
# Pipeline 1 public interface
# ---------------------------------------------------------------------------

async def process_turn(session_id: str, message: str) -> IntakeResponse:
    """
    Process one patient turn through Pipeline 1.

    Args:
        session_id: Unique identifier for the patient session.
        message:    The patient's raw text message.

    Returns:
        IntakeResponse with status "in_progress" (includes next_question)
        or "completed" (includes full final PatientHistoryState).

    No database is read or written. State is held in the module-level
    in-memory session store.

    Rate limiting:
        Three LLM calls are made per normal turn. A configurable sleep
        (_CALL_DELAY seconds, default 2 s) is inserted between each call
        to stay within the Mistral free-tier rate limit.
    """

    # 1. Retrieve or create session state
    state = session_store.get_or_create(session_id)
    state.turn_count += 1

    # 2. Extraction (LLM call 1 — gated by global rate limiter)
    updates: StateUpdate = await extraction_agent.run(state, message)

    # 3. Apply extracted updates to state
    state = _apply_updates(state, updates)

    # 4. Red-flag check (LLM call 2 — gated by global rate limiter)
    red_flag: RedFlagResult = await redflag_agent.run(state)

    # 5. Completion check (deterministic — no LLM)
    if completion_check.is_complete(state):
        state.status = "completed"
        session_store.save(session_id, state)
        return IntakeResponse(
            status="completed",
            state=state,
            red_flag=red_flag,
        )

    # 6. Precedence queue — find next field (deterministic — no LLM)
    target = precedence_queue.get_next_field(state)

    # 7. Question Phrasing Agent (LLM call 3 — gated by global rate limiter)
    next_question: str = await question_agent.run(target, state)

    # 8. Persist updated state
    session_store.save(session_id, state)

    return IntakeResponse(
        status="in_progress",
        state=state,
        next_question=next_question,
        red_flag=red_flag,
        target_field=target.field,
    )
