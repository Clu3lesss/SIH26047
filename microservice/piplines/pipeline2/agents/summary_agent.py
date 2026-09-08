"""
pipeline2/agents/summary_agent.py — Summary Agent.

LLM call: YES (one call, triggered once per completed interview).

TOKEN OPTIMISATION: Sends a compact text summary (~200-300 tokens) instead
of the full JSON (~2000 tokens). This agent runs only once so it's less
critical, but still optimised.
"""

from __future__ import annotations

from langchain_core.prompts import ChatPromptTemplate

from microservice.piplines.config import get_llm, llm_call, make_retriable
from microservice.piplines.models.state import PatientHistoryState, PhysicianSummary

_SYSTEM = """\
Generate a structured physician summary from the patient history below.
Use only the supplied information. Write "None reported" for empty fields.
Write "Not obtained" for fields not collected. Be concise and clinical.
"""

_HUMAN = """\
{compact_state}
"""

_PROMPT = ChatPromptTemplate.from_messages([
    ("system", _SYSTEM),
    ("human", _HUMAN),
])


def _build_chain():
    llm = get_llm()
    structured_llm = llm.with_structured_output(PhysicianSummary)
    return make_retriable(_PROMPT | structured_llm)


def _compact_state(state: PatientHistoryState) -> str:
    """Build a compact text representation of the completed state."""
    lines: list[str] = []

    lines.append(f"CC: {state.chief_complaint or 'Not obtained'}")

    hpi = state.hpi
    hpi_items = []
    for field in ("site", "onset", "character", "radiation", "severity", "timing"):
        val = getattr(hpi, field, None)
        if val:
            hpi_items.append(f"{field}={val}")
    if hpi.associated_symptoms:
        hpi_items.append(f"associated={','.join(hpi.associated_symptoms)}")
    if hpi.exacerbating_factors:
        hpi_items.append(f"worse={','.join(hpi.exacerbating_factors)}")
    if hpi.relieving_factors:
        hpi_items.append(f"better={','.join(hpi.relieving_factors)}")
    lines.append(f"HPI: {'; '.join(hpi_items) if hpi_items else 'Not obtained'}")

    if state.conditions_asked:
        lines.append(f"PMH: {', '.join(state.conditions) if state.conditions else 'None reported'}")
    else:
        lines.append("PMH: Not obtained")

    if state.surgeries_asked:
        lines.append(f"PSH: {', '.join(state.surgeries) if state.surgeries else 'None reported'}")
    else:
        lines.append("PSH: Not obtained")

    if state.medications_asked:
        lines.append(f"Meds: {', '.join(state.medications) if state.medications else 'None reported'}")
    else:
        lines.append("Meds: Not obtained")

    if state.allergies_asked:
        lines.append(f"Allergies: {', '.join(state.allergies) if state.allergies else 'None reported'}")
    else:
        lines.append("Allergies: Not obtained")

    if state.family_history_asked:
        fh = [f"{e.relation}: {e.condition}" for e in state.family_history]
        lines.append(f"FH: {', '.join(fh) if fh else 'None reported'}")
    else:
        lines.append("FH: Not obtained")

    sh = state.social_history
    sh_parts = []
    for field in ("smoking", "alcohol", "diet", "occupation", "living_situation"):
        val = getattr(sh, field, None)
        if val:
            sh_parts.append(f"{field}={val}")
    lines.append(f"Social: {'; '.join(sh_parts) if sh_parts else 'Not obtained'}")

    ros = state.review_of_systems
    ros_parts = []
    for field in ("cardiovascular", "respiratory", "gastrointestinal", "neurological", "musculoskeletal"):
        val = getattr(ros, field, None)
        if val:
            ros_parts.append(f"{field}={val}")
    lines.append(f"ROS: {'; '.join(ros_parts) if ros_parts else 'Not obtained'}")

    return "\n".join(lines)


async def run(state: PatientHistoryState) -> PhysicianSummary:
    """Generate a physician-readable summary. ~200-300 tokens input."""
    chain = _build_chain()
    compact = _compact_state(state)
    result: PhysicianSummary = await llm_call(chain, {"compact_state": compact})
    return result


if __name__ == "__main__":
    import asyncio
    import json

    from dotenv import load_dotenv

    load_dotenv()

    from microservice.piplines.models.state import FamilyHistoryEntry, HPI, ReviewOfSystems, SocialHistory

    async def _test():
        state = PatientHistoryState(
            session_id="test-summary", status="completed",
            chief_complaint="chest pain",
            hpi=HPI(site="center of chest", onset="yesterday", character="crushing",
                     radiation="left arm", severity="8/10",
                     associated_symptoms=["shortness of breath"]),
            conditions=["hypertension"], conditions_asked=True,
            surgeries=[], surgeries_asked=True,
            medications=["aspirin"], medications_asked=True,
            allergies=[], allergies_asked=True,
            family_history=[FamilyHistoryEntry(relation="father", condition="MI")],
            family_history_asked=True,
            social_history=SocialHistory(smoking="ex-smoker", alcohol="occasional",
                                         occupation="teacher"),
            social_history_asked=True,
            review_of_systems=ReviewOfSystems(cardiovascular="chest pain",
                                               respiratory="mild dyspnoea"),
            review_of_systems_asked=True,
        )
        summary = await run(state)
        print(json.dumps(summary.model_dump(), indent=2))

    asyncio.run(_test())
