"""
pipeline2/orchestrator.py — Pipeline 2 orchestrator.

Thin wrapper that calls the Summary Agent and returns a SummaryResponse.

Pipeline 2 is completely independent of Pipeline 1.
It can be tested in isolation by supplying any PatientHistoryState directly.

Flow:
    Completed PatientHistoryState
              ↓
         Summary Agent  (LLM)
              ↓
          Summary JSON

LLM calls: 1 (Summary Agent only).

Can be run independently:
    python -m piplines.pipeline2.orchestrator
"""

from __future__ import annotations

from microservice.piplines.models.state import PatientHistoryState, SummaryResponse
from microservice.piplines.pipeline2.agents import summary_agent


async def generate_summary(state: PatientHistoryState) -> SummaryResponse:
    """
    Generate a physician-readable summary from a completed patient history.

    Args:
        state: A completed PatientHistoryState. The caller is responsible for
               ensuring the state is complete before invoking Pipeline 2.

    Returns:
        SummaryResponse containing the structured PhysicianSummary.
    """
    summary = await summary_agent.run(state)
    return SummaryResponse(summary=summary)


# ---------------------------------------------------------------------------
# Quick manual test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import asyncio
    import json

    from dotenv import load_dotenv

    load_dotenv()

    from microservice.piplines.models.state import (
        FamilyHistoryEntry,
        HPI,
        PatientHistoryState,
        ReviewOfSystems,
        SocialHistory,
    )

    async def _test():
        state = PatientHistoryState(
            session_id="p2-test",
            status="completed",
            chief_complaint="severe headache",
            hpi=HPI(
                site="bilateral, frontal",
                onset="3 days ago",
                character="throbbing",
                severity="6/10",
                associated_symptoms=["nausea", "photophobia"],
            ),
            conditions=["migraines"],
            conditions_asked=True,
            surgeries=[],
            surgeries_asked=True,
            medications=["sumatriptan"],
            medications_asked=True,
            allergies=[],
            allergies_asked=True,
            family_history=[FamilyHistoryEntry(relation="mother", condition="migraines")],
            family_history_asked=True,
            social_history=SocialHistory(
                smoking="non-smoker",
                alcohol="none",
                occupation="software engineer",
            ),
            social_history_asked=True,
            review_of_systems=ReviewOfSystems(
                neurological="headache, no focal deficits",
                cardiovascular="no chest pain",
                respiratory="no symptoms",
                gastrointestinal="nausea, no vomiting",
                musculoskeletal="no pain",
            ),
            review_of_systems_asked=True,
        )

        response = await generate_summary(state)
        print(json.dumps(response.model_dump(), indent=2))

    asyncio.run(_test())
