"""
pipeline1/agents/redflag_agent.py — Red-flag Agent.

LLM call: YES (one call per turn).

TOKEN OPTIMISATION: Already sends only a triage-relevant snapshot (~50 tokens).
System prompt trimmed further.
"""

from __future__ import annotations

from langchain_core.prompts import ChatPromptTemplate

from microservice.piplines.config import get_llm, llm_call, make_retriable
from microservice.piplines.models.state import PatientHistoryState, RedFlagResult

_SYSTEM = """\
Assess for urgent/emergency symptoms. Return structured result.
Flag only clear emergencies (chest pain+SOB, stroke signs, anaphylaxis, suicidal ideation).
Do not diagnose. Do not invent symptoms.
"""

_HUMAN = """\
CC: {chief_complaint}
Site: {site}, Character: {character}, Severity: {severity}
Associated: {associated_symptoms}
Onset: {onset}
"""

_PROMPT = ChatPromptTemplate.from_messages([
    ("system", _SYSTEM),
    ("human", _HUMAN),
])


def _build_chain():
    llm = get_llm()
    structured_llm = llm.with_structured_output(RedFlagResult)
    return make_retriable(_PROMPT | structured_llm)


async def run(state: PatientHistoryState) -> RedFlagResult:
    """Evaluate the current state for urgent symptoms. ~50 tokens input."""
    chain = _build_chain()
    result: RedFlagResult = await llm_call(chain, {
        "chief_complaint": state.chief_complaint or "not yet collected",
        "site": state.hpi.site or "unknown",
        "character": state.hpi.character or "unknown",
        "severity": state.hpi.severity or "unknown",
        "associated_symptoms": (
            ", ".join(state.hpi.associated_symptoms)
            if state.hpi.associated_symptoms
            else "none reported"
        ),
        "onset": state.hpi.onset or "unknown",
    })
    return result


if __name__ == "__main__":
    import asyncio
    import json

    from dotenv import load_dotenv

    load_dotenv()

    from microservice.piplines.models.state import HPI

    async def _test():
        state = PatientHistoryState(
            session_id="test-rf",
            chief_complaint="chest pain",
            hpi=HPI(site="center of chest", character="crushing", severity="9/10",
                     associated_symptoms=["shortness of breath"], onset="sudden"),
        )
        result = await run(state)
        print(json.dumps(result.model_dump(), indent=2))

    asyncio.run(_test())
