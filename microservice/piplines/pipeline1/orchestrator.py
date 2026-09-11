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

MAX_TURNS = 6


def _handle_negative_fallback(state: PatientHistoryState, message: str) -> None:
    """If patient gave a negative/normal response, ensure the targeted section is recorded."""
    msg_lower = message.strip().lower()
    negative_words = ("no", "none", "nothing", "normal", "fine", "no symptoms", "completely normal", "nil", "na", "n/a", "no pain")
    is_negative = any(w in msg_lower for w in negative_words)

    if not is_negative or not state.last_target_field:
        return

    field = state.last_target_field
    # Check review of systems
    if hasattr(state.review_of_systems, field):
        if getattr(state.review_of_systems, field) is None:
            setattr(state.review_of_systems, field, "normal / none reported")
        state.review_of_systems_asked = True

    # Check HPI
    if hasattr(state.hpi, field):
        current_val = getattr(state.hpi, field)
        if current_val is None or (isinstance(current_val, list) and not current_val):
            if isinstance(current_val, list):
                setattr(state.hpi, field, ["none reported"])
            else:
                setattr(state.hpi, field, "none / denied")

    # Check section flags
    if field in ("conditions", "past_medical_history"):
        state.conditions_asked = True
    elif field in ("surgeries", "surgical_history"):
        state.surgeries_asked = True
    elif field in ("medications", "drugs"):
        state.medications_asked = True
    elif field == "allergies":
        state.allergies_asked = True
    elif field == "family_history":
        state.family_history_asked = True
    elif field in ("social_history", "smoking", "alcohol", "diet", "occupation", "living_situation"):
        state.social_history_asked = True
        if hasattr(state.social_history, field) and getattr(state.social_history, field) is None:
            setattr(state.social_history, field, "none reported")


async def process_turn(session_id: str, message: str) -> IntakeResponse:
    """
    Process one patient turn through Pipeline 1.

    Args:
        session_id: Unique identifier for the patient session.
        message:    The patient's raw text message.

    Returns:
        IntakeResponse with status "in_progress" (includes next_question)
        or "completed" (includes full final PatientHistoryState).

    Hard Question Limit:
        The intake terminates and marks state completed after MAX_TURNS (6)
        turns or when all required medical history fields are complete.
    """

    # 1. Retrieve or create session state
    state = session_store.get_or_create(session_id)
    state.turn_count += 1

    # 2. Extraction (LLM call 1 — gated by global rate limiter)
    updates: StateUpdate = await extraction_agent.run(state, message)

    # 3. Apply extracted updates to state
    state = _apply_updates(state, updates)
    _handle_negative_fallback(state, message)

    # 4. Red-flag check (LLM call 2 — gated by global rate limiter)
    red_flag: RedFlagResult = await redflag_agent.run(state)

    # 5. Completion check (deterministic — no LLM)
    # Complete if all required fields are addressed OR hard question limit (6 turns) reached
    if completion_check.is_complete(state) or state.turn_count >= MAX_TURNS:
        state.status = "completed"
        state.last_target_field = None
        session_store.save(session_id, state)
        return IntakeResponse(
            status="completed",
            state=state,
            red_flag=red_flag,
            target_field=None,
        )

    # 6. Precedence queue — find next field (deterministic — no LLM)
    target = precedence_queue.get_next_field(state)

    if target is None:
        state.status = "completed"
        state.last_target_field = None
        session_store.save(session_id, state)
        return IntakeResponse(
            status="completed",
            state=state,
            red_flag=red_flag,
            target_field=None,
        )

    # Record target in asked_fields to guarantee it is NEVER asked again
    if target.field not in state.asked_fields:
        state.asked_fields.append(target.field)
    field_key = f"{target.section}.{target.field}"
    if field_key not in state.asked_fields:
        state.asked_fields.append(field_key)
    state.last_target_field = target.field

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
