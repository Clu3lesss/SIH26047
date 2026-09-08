"""
pipeline1/logic/precedence_queue.py — Deterministic field ordering.

This module contains NO LLM calls.
It inspects a PatientHistoryState and returns the first field that still
requires information, following the canonical medical-history field order.

The model (LLM) is never asked to decide interview order.
The Question Phrasing Agent receives the target field from here.

Can be run and tested independently:
    python -m piplines.pipeline1.logic.precedence_queue
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from microservice.piplines.models.state import PatientHistoryState


@dataclass(frozen=True)
class TargetField:
    """
    Describes the next field the interview should collect.

    Attributes:
        section:   Top-level section name (e.g. "hpi", "medications").
        field:     Specific field within the section (e.g. "character").
                   Equals section when the entire section is the target.
        label:     Human-readable label passed to the Question Phrasing Agent.
        hint:      Optional template question used as a fallback.
    """

    section: str
    field: str
    label: str
    hint: str


# ---------------------------------------------------------------------------
# Canonical field order — mirrors ARCHITECTURE.md Precedence Queue section.
# ---------------------------------------------------------------------------

_FIELD_ORDER: list[TargetField] = [
    # 1 — Chief complaint
    TargetField("chief_complaint", "chief_complaint", "chief complaint (main reason for visit)", "What brings you in today? What is your main concern?"),

    # 2 — HPI / SOCRATES
    TargetField("hpi", "site", "location / site of the problem", "Where exactly do you feel it? Can you point to the area?"),
    TargetField("hpi", "onset", "when the problem started and how it came on", "When did this start, and did it come on suddenly or gradually?"),
    TargetField("hpi", "character", "nature or character of the symptom", "What does it feel like — sharp, dull, burning, pressure, or something else?"),
    TargetField("hpi", "radiation", "whether the symptom spreads anywhere", "Does it spread or radiate anywhere else?"),
    TargetField("hpi", "severity", "severity on a scale of 1 to 10", "On a scale of 1 to 10, how severe is it?"),
    TargetField("hpi", "timing", "timing and pattern (constant, intermittent, etc.)", "Is it constant or does it come and go? How long does each episode last?"),
    TargetField("hpi", "exacerbating_factors", "things that make it worse", "Is there anything that makes it worse?"),
    TargetField("hpi", "relieving_factors", "things that make it better", "Is there anything that makes it better or gives you relief?"),
    TargetField("hpi", "associated_symptoms", "other symptoms occurring alongside the main complaint", "Are there any other symptoms that come along with it?"),

    # 3 — Past Medical History
    TargetField("conditions", "conditions", "past medical conditions and diagnoses", "Do you have any known medical conditions, such as diabetes, high blood pressure, or heart disease?"),

    # 4 — Past Surgical History
    TargetField("surgeries", "surgeries", "previous surgeries or operations", "Have you had any surgeries or operations in the past?"),

    # 5 — Drug History
    TargetField("medications", "medications", "current medications", "Are you currently taking any medications, including over-the-counter medicines or supplements?"),

    # 6 — Allergy History
    TargetField("allergies", "allergies", "known drug or food allergies", "Do you have any known allergies, particularly to medications or foods?"),

    # 7 — Family History
    TargetField("family_history", "family_history", "significant family medical history", "Are there any medical conditions that run in your family?"),

    # 8 — Personal / Social History
    TargetField("social_history", "smoking", "smoking history", "Do you smoke, or have you smoked in the past?"),
    TargetField("social_history", "alcohol", "alcohol use", "Do you drink alcohol? If so, how much and how often?"),
    TargetField("social_history", "occupation", "occupation", "What do you do for work?"),
    TargetField("social_history", "diet", "diet", "How would you describe your diet?"),
    TargetField("social_history", "living_situation", "living situation", "Who do you live with at home?"),

    # 9 — Review of Systems
    TargetField("review_of_systems", "cardiovascular", "cardiovascular symptoms (chest pain, palpitations, swelling)", "Have you noticed any chest pain, palpitations, or swelling in your legs?"),
    TargetField("review_of_systems", "respiratory", "respiratory symptoms (shortness of breath, cough, wheeze)", "Any shortness of breath, cough, or wheezing?"),
    TargetField("review_of_systems", "gastrointestinal", "gastrointestinal symptoms (nausea, vomiting, bowel changes)", "Any nausea, vomiting, or changes in bowel habits?"),
    TargetField("review_of_systems", "neurological", "neurological symptoms (headache, dizziness, vision changes)", "Any headaches, dizziness, or changes in vision?"),
    TargetField("review_of_systems", "musculoskeletal", "musculoskeletal symptoms (joint pain, muscle weakness)", "Any joint pains or muscle weakness?"),
]


def _is_hpi_field_filled(state: PatientHistoryState, field: str) -> bool:
    """Return True if the given HPI field has been collected."""
    hpi = state.hpi
    value = getattr(hpi, field, None)
    if value is None:
        return False
    if isinstance(value, list):
        return len(value) > 0
    return bool(value)


def _is_social_field_filled(state: PatientHistoryState, field: str) -> bool:
    """Return True if the given social history field has been collected."""
    value = getattr(state.social_history, field, None)
    return value is not None and bool(value)


def _is_ros_field_filled(state: PatientHistoryState, field: str) -> bool:
    """Return True if the given review-of-systems field has been collected."""
    value = getattr(state.review_of_systems, field, None)
    return value is not None and bool(value)


def _is_filled(state: PatientHistoryState, target: TargetField) -> bool:
    """
    Return True if the given target field has been sufficiently addressed.

    For list-backed sections (medications, allergies, conditions, surgeries,
    family_history), the _asked flag is the primary signal — an empty list with
    _asked=True means the patient was asked and confirmed none.
    """
    section = target.section

    if section == "chief_complaint":
        return bool(state.chief_complaint)

    if section == "hpi":
        return _is_hpi_field_filled(state, target.field)

    if section == "conditions":
        return state.conditions_asked

    if section == "surgeries":
        return state.surgeries_asked

    if section == "medications":
        return state.medications_asked

    if section == "allergies":
        return state.allergies_asked

    if section == "family_history":
        return state.family_history_asked

    if section == "social_history":
        return _is_social_field_filled(state, target.field)

    if section == "review_of_systems":
        return _is_ros_field_filled(state, target.field)

    return False


def get_next_field(state: PatientHistoryState) -> Optional[TargetField]:
    """
    Return the first TargetField that still requires information.

    Returns None when all fields have been addressed (interview complete).
    This is the single source of truth for interview field ordering.
    """
    for target in _FIELD_ORDER:
        if not _is_filled(state, target):
            return target
    return None


# ---------------------------------------------------------------------------
# Quick manual test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    from microservice.piplines.models.state import PatientHistoryState

    state = PatientHistoryState(session_id="test-001")
    field = get_next_field(state)
    print(f"First field: {field}")

    state.chief_complaint = "chest pain"
    field = get_next_field(state)
    print(f"After chief_complaint: {field}")
