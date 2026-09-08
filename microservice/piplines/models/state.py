"""
models/state.py — Pydantic schemas that define the data contracts for the system.

PatientHistoryState is the central contract between Pipeline 1 and Pipeline 2.
All LLM-produced outputs are validated against typed schemas defined here.

Nothing in this module makes LLM calls or imports from other piplines packages.
It can be imported and tested entirely independently.
"""

from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Sub-schemas
# ---------------------------------------------------------------------------

class HPI(BaseModel):
    """History of Present Illness — SOCRATES mnemonic fields."""

    site: Optional[str] = None
    onset: Optional[str] = None
    character: Optional[str] = None
    radiation: Optional[str] = None
    associated_symptoms: List[str] = Field(default_factory=list)
    timing: Optional[str] = None
    exacerbating_factors: List[str] = Field(default_factory=list)
    relieving_factors: List[str] = Field(default_factory=list)
    severity: Optional[str] = None


class FamilyHistoryEntry(BaseModel):
    """A single family history entry."""

    relation: str
    condition: str


class SocialHistory(BaseModel):
    """Personal / social history."""

    diet: Optional[str] = None
    smoking: Optional[str] = None
    alcohol: Optional[str] = None
    occupation: Optional[str] = None
    living_situation: Optional[str] = None


class ReviewOfSystems(BaseModel):
    """Review of systems — one field per required body system."""

    cardiovascular: Optional[str] = None
    respiratory: Optional[str] = None
    gastrointestinal: Optional[str] = None
    neurological: Optional[str] = None
    musculoskeletal: Optional[str] = None


# ---------------------------------------------------------------------------
# Central patient state
# ---------------------------------------------------------------------------

class PatientHistoryState(BaseModel):
    """
    The structured patient history built by Pipeline 1 and consumed by Pipeline 2.

    _asked flags distinguish:
      - Not yet asked (flag False, list empty)
      - Asked, patient confirms none (flag True, list empty)
      - Asked, patient reports one or more (flag True, list non-empty)
    """

    # Session metadata
    session_id: str
    turn_count: int = 0
    status: Literal["in_progress", "completed"] = "in_progress"

    # Chief complaint
    chief_complaint: Optional[str] = None

    # History of Present Illness (SOCRATES)
    hpi: HPI = Field(default_factory=HPI)

    # Past Medical History
    conditions: List[str] = Field(default_factory=list)
    conditions_asked: bool = False

    # Past Surgical History
    surgeries: List[str] = Field(default_factory=list)
    surgeries_asked: bool = False

    # Drug / Allergy History
    medications: List[str] = Field(default_factory=list)
    medications_asked: bool = False
    allergies: List[str] = Field(default_factory=list)
    allergies_asked: bool = False

    # Family History
    family_history: List[FamilyHistoryEntry] = Field(default_factory=list)
    family_history_asked: bool = False

    # Personal / Social History
    social_history: SocialHistory = Field(default_factory=SocialHistory)
    social_history_asked: bool = False

    # Review of Systems
    review_of_systems: ReviewOfSystems = Field(default_factory=ReviewOfSystems)
    review_of_systems_asked: bool = False


# ---------------------------------------------------------------------------
# Extraction agent output schema
# ---------------------------------------------------------------------------

class HPIUpdate(BaseModel):
    """Partial HPI update from the extraction agent — all fields optional."""

    site: Optional[str] = None
    onset: Optional[str] = None
    character: Optional[str] = None
    radiation: Optional[str] = None
    associated_symptoms: Optional[List[str]] = None
    timing: Optional[str] = None
    exacerbating_factors: Optional[List[str]] = None
    relieving_factors: Optional[List[str]] = None
    severity: Optional[str] = None


class SocialHistoryUpdate(BaseModel):
    """Partial social history update from the extraction agent — all fields optional."""

    diet: Optional[str] = None
    smoking: Optional[str] = None
    alcohol: Optional[str] = None
    occupation: Optional[str] = None
    living_situation: Optional[str] = None


class ReviewOfSystemsUpdate(BaseModel):
    """Partial review-of-systems update — all fields optional."""

    cardiovascular: Optional[str] = None
    respiratory: Optional[str] = None
    gastrointestinal: Optional[str] = None
    neurological: Optional[str] = None
    musculoskeletal: Optional[str] = None


class StateUpdate(BaseModel):
    """
    Structured output produced by the Extraction Agent.

    Every field is optional. Only fields explicitly mentioned by the patient
    should be populated. The orchestrator merges this into the current state.
    """

    chief_complaint: Optional[str] = None
    hpi: Optional[HPIUpdate] = None

    # For lists: contains only newly mentioned items to add.
    conditions: Optional[List[str]] = None
    conditions_asked: Optional[bool] = None

    surgeries: Optional[List[str]] = None
    surgeries_asked: Optional[bool] = None

    medications: Optional[List[str]] = None
    medications_asked: Optional[bool] = None

    allergies: Optional[List[str]] = None
    allergies_asked: Optional[bool] = None

    family_history: Optional[List[FamilyHistoryEntry]] = None
    family_history_asked: Optional[bool] = None

    social_history: Optional[SocialHistoryUpdate] = None
    social_history_asked: Optional[bool] = None

    review_of_systems: Optional[ReviewOfSystemsUpdate] = None
    review_of_systems_asked: Optional[bool] = None


# ---------------------------------------------------------------------------
# Red-flag agent output schema
# ---------------------------------------------------------------------------

class RedFlagResult(BaseModel):
    """Structured output from the Red-flag Agent."""

    is_flagged: bool
    reason: Optional[str] = None
    urgency_tier: Optional[Literal["low", "medium", "high"]] = None


# ---------------------------------------------------------------------------
# Pipeline 2 — Summary schemas
# ---------------------------------------------------------------------------

class PhysicianSummary(BaseModel):
    """Structured physician-readable summary produced by Pipeline 2."""

    chief_complaint: str
    history_of_present_illness: str
    past_medical_history: str
    past_surgical_history: str
    medications: str
    allergies: str
    family_history: str
    social_history: str
    review_of_systems: str


# ---------------------------------------------------------------------------
# API request / response schemas
# ---------------------------------------------------------------------------

class IntakeRequest(BaseModel):
    """Request body for POST /intake (Pipeline 1)."""

    session_id: str
    message: str


class IntakeResponse(BaseModel):
    """Response from POST /intake."""

    status: Literal["in_progress", "completed"]
    state: PatientHistoryState
    next_question: Optional[str] = None  # present when status == "in_progress"
    red_flag: RedFlagResult


class SummaryRequest(BaseModel):
    """Request body for POST /summary (Pipeline 2)."""

    state: PatientHistoryState


class SummaryResponse(BaseModel):
    """Response from POST /summary."""

    summary: PhysicianSummary
