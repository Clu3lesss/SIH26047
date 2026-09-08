"""
pipeline1/agents/extraction_agent.py — Extraction Agent.

LLM call: YES (one call per turn).
Output schema: StateUpdate (Pydantic, validated).

TOKEN OPTIMISATION: Sends only a compact summary of already-collected fields
(not the full state JSON) so the LLM knows what not to duplicate.
"""

from __future__ import annotations

from langchain_core.prompts import ChatPromptTemplate

from microservice.piplines.config import get_llm, llm_call, make_retriable
from microservice.piplines.models.state import PatientHistoryState, StateUpdate

# ---------------------------------------------------------------------------
# Prompt — kept as short as possible to minimise token usage
# ---------------------------------------------------------------------------

_SYSTEM = """\
Extract structured medical info from the patient's message. Return JSON matching the schema.

Rules:
- Only extract what the patient explicitly states.
- Do not invent or infer information.
- If the patient mentions a symptom or problem, set chief_complaint to a concise
    description of the main symptom or problem, even when also extracting HPI details.
- Do not leave chief_complaint null when the message explicitly names the reason
    for the visit (for example, "chest pain", "headache", or "fever").
- For lists: return only NEW items.
- Set _asked flags true when the patient addresses a topic (even if "none").
- Return null for anything not mentioned.
"""

_HUMAN = """\
Already collected: {context}

Patient says: "{message}"
"""

_PROMPT = ChatPromptTemplate.from_messages([
    ("system", _SYSTEM),
    ("human", _HUMAN),
])


def _build_chain():
    """Build the extraction chain with structured output and retry."""
    llm = get_llm()
    structured_llm = llm.with_structured_output(StateUpdate)
    return make_retriable(_PROMPT | structured_llm)


def _compact_context(state: PatientHistoryState) -> str:
    """
    Build a minimal context string listing only already-filled fields.

    This replaces sending the entire state JSON (~2000 tokens) with a
    compact summary (~100-200 tokens) — the LLM only needs to know what
    NOT to extract again.
    """
    parts: list[str] = []

    if state.chief_complaint:
        parts.append(f"CC: {state.chief_complaint}")

    hpi = state.hpi
    hpi_parts = []
    if hpi.site:
        hpi_parts.append(f"site={hpi.site}")
    if hpi.onset:
        hpi_parts.append(f"onset={hpi.onset}")
    if hpi.character:
        hpi_parts.append(f"character={hpi.character}")
    if hpi.radiation:
        hpi_parts.append(f"radiation={hpi.radiation}")
    if hpi.severity:
        hpi_parts.append(f"severity={hpi.severity}")
    if hpi.timing:
        hpi_parts.append(f"timing={hpi.timing}")
    if hpi.associated_symptoms:
        hpi_parts.append(f"assoc={','.join(hpi.associated_symptoms)}")
    if hpi.exacerbating_factors:
        hpi_parts.append(f"worse={','.join(hpi.exacerbating_factors)}")
    if hpi.relieving_factors:
        hpi_parts.append(f"better={','.join(hpi.relieving_factors)}")
    if hpi_parts:
        parts.append(f"HPI: {'; '.join(hpi_parts)}")

    if state.conditions_asked:
        parts.append(f"PMH: {', '.join(state.conditions) if state.conditions else 'none'}")
    if state.surgeries_asked:
        parts.append(f"PSH: {', '.join(state.surgeries) if state.surgeries else 'none'}")
    if state.medications_asked:
        parts.append(f"Meds: {', '.join(state.medications) if state.medications else 'none'}")
    if state.allergies_asked:
        parts.append(f"Allergies: {', '.join(state.allergies) if state.allergies else 'none'}")
    if state.family_history_asked:
        fh = [f"{e.relation}:{e.condition}" for e in state.family_history]
        parts.append(f"FH: {', '.join(fh) if fh else 'none'}")

    sh = state.social_history
    sh_parts = []
    if sh.smoking:
        sh_parts.append(f"smoking={sh.smoking}")
    if sh.alcohol:
        sh_parts.append(f"alcohol={sh.alcohol}")
    if sh.occupation:
        sh_parts.append(f"occupation={sh.occupation}")
    if sh.diet:
        sh_parts.append(f"diet={sh.diet}")
    if sh.living_situation:
        sh_parts.append(f"lives={sh.living_situation}")
    if sh_parts:
        parts.append(f"Social: {'; '.join(sh_parts)}")

    if not parts:
        return "Nothing collected yet."
    return " | ".join(parts)


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

async def run(state: PatientHistoryState, message: str) -> StateUpdate:
    """
    Extract structured state updates from the patient's message.

    Only sends a compact context (~100-200 tokens) instead of the full state
    (~2000 tokens) to stay within Mistral free-tier token limits.
    """
    chain = _build_chain()
    context = _compact_context(state)
    result = await llm_call(chain, {"context": context, "message": message})
    return result


# ---------------------------------------------------------------------------
# Quick manual test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import asyncio
    import json

    from dotenv import load_dotenv

    load_dotenv()

    async def _test():
        state = PatientHistoryState(session_id="test-extract")
        message = "I have had chest pain since yesterday morning. It's about a 7 out of 10."
        updates = await run(state, message)
        print(json.dumps(updates.model_dump(), indent=2))

    asyncio.run(_test())
