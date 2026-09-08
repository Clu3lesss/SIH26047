"""
pipeline1/logic/completion_check.py — Deterministic interview completion check.

This module contains NO LLM calls.
It returns True only when every field in the precedence queue has been addressed.

Can be run and tested independently:
    python -m piplines.pipeline1.logic.completion_check
"""

from __future__ import annotations

from microservice.piplines.models.state import PatientHistoryState
from microservice.piplines.pipeline1.logic.precedence_queue import get_next_field


def is_complete(state: PatientHistoryState) -> bool:
    """
    Return True when all required fields in the precedence queue are filled.

    Completion is determined entirely by deterministic code — the LLM does
    not decide whether the interview is complete.
    """
    return get_next_field(state) is None


# ---------------------------------------------------------------------------
# Quick manual test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    from microservice.piplines.models.state import (
        FamilyHistoryEntry,
        HPI,
        PatientHistoryState,
        ReviewOfSystems,
        SocialHistory,
    )

    # Build a fully completed state
    state = PatientHistoryState(
        session_id="test-complete",
        chief_complaint="chest pain",
        hpi=HPI(
            site="center of chest",
            onset="yesterday morning",
            character="sharp",
            radiation="left arm",
            associated_symptoms=["shortness of breath"],
            timing="constant",
            exacerbating_factors=["exertion"],
            relieving_factors=["rest"],
            severity="7/10",
        ),
        conditions=["hypertension"],
        conditions_asked=True,
        surgeries=[],
        surgeries_asked=True,
        medications=["aspirin"],
        medications_asked=True,
        allergies=[],
        allergies_asked=True,
        family_history=[FamilyHistoryEntry(relation="father", condition="heart disease")],
        family_history_asked=True,
        social_history=SocialHistory(
            diet="balanced",
            smoking="non-smoker",
            alcohol="occasional",
            occupation="teacher",
            living_situation="with spouse",
        ),
        social_history_asked=True,
        review_of_systems=ReviewOfSystems(
            cardiovascular="chest pain, no palpitations",
            respiratory="mild shortness of breath",
            gastrointestinal="no nausea",
            neurological="no headaches",
            musculoskeletal="no joint pain",
        ),
        review_of_systems_asked=True,
    )

    print(f"is_complete: {is_complete(state)}")  # Expected: True

    empty_state = PatientHistoryState(session_id="test-empty")
    print(f"empty is_complete: {is_complete(empty_state)}")  # Expected: False
