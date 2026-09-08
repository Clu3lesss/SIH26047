"""
api/routes.py — FastAPI route definitions.

Exposes two endpoints:

  POST /intake
    Pipeline 1 — Conversational Intake.
    Accepts { session_id, message } and returns either an in-progress or
    completed intake response.

  POST /summary
    Pipeline 2 — Summary Generation.
    Accepts a completed PatientHistoryState and returns a structured summary.
    Can be called independently without running Pipeline 1.

Both endpoints are JSON-in / JSON-out.
No authentication, no database reads or writes.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from microservice.piplines.models.state import IntakeRequest, IntakeResponse, SummaryRequest, SummaryResponse
from microservice.piplines.pipeline1 import orchestrator as p1
from microservice.piplines.pipeline2 import orchestrator as p2

router = APIRouter()


@router.post(
    "/intake",
    response_model=IntakeResponse,
    summary="Pipeline 1 — Conversational Intake Turn",
    description=(
        "Process one patient turn through Pipeline 1. "
        "Returns an in-progress response (with next_question) while the interview "
        "is ongoing, or a completed response (with the final PatientHistoryState) "
        "when all required fields have been collected."
    ),
)
async def intake(request: IntakeRequest) -> IntakeResponse:
    """
    Process a single patient message in an ongoing intake interview.

    - Creates a new session if session_id is not seen before.
    - Runs: Extraction → State update → Red-flag → Completion check → Question.
    - Returns in_progress or completed status.
    """
    try:
        return await p1.process_turn(
            session_id=request.session_id,
            message=request.message,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pipeline 1 error: {exc}",
        ) from exc


@router.post(
    "/summary",
    response_model=SummaryResponse,
    summary="Pipeline 2 — Generate Physician Summary",
    description=(
        "Generate a structured physician-readable summary from a completed "
        "PatientHistoryState. Can be called independently — does not require "
        "Pipeline 1 to have been run."
    ),
)
async def summary(request: SummaryRequest) -> SummaryResponse:
    """
    Generate a physician-readable summary from a completed patient history.

    Accepts a PatientHistoryState directly. Does not read from or write to
    any database. Does not access the session store.
    """
    try:
        return await p2.generate_summary(state=request.state)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pipeline 2 error: {exc}",
        ) from exc
