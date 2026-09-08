"""
pipeline1/agents/question_agent.py — Question Phrasing Agent.

LLM call: YES (one call per turn, skipped on the final turn).

TOKEN OPTIMISATION: Sends only the target field label and chief complaint
(2-3 lines total). No full state serialisation.
"""

from __future__ import annotations

from pydantic import BaseModel

from langchain_core.prompts import ChatPromptTemplate

from microservice.piplines.config import get_llm, llm_call, make_retriable
from microservice.piplines.models.state import PatientHistoryState
from microservice.piplines.pipeline1.logic.precedence_queue import TargetField


class QuestionOutput(BaseModel):
    """Structured output from the Question Phrasing Agent."""
    question: str


_SYSTEM = """\
Generate ONE short patient-friendly question about the target topic. Use simple language. End with "?"
"""

_HUMAN = """\
Topic: {target_label}
Context: {context}
"""

_PROMPT = ChatPromptTemplate.from_messages([
    ("system", _SYSTEM),
    ("human", _HUMAN),
])


def _build_chain():
    llm = get_llm()
    structured_llm = llm.with_structured_output(QuestionOutput)
    return make_retriable(_PROMPT | structured_llm)


def _build_context(state: PatientHistoryState) -> str:
    """Ultra-compact context — just the chief complaint if available."""
    if state.chief_complaint:
        return f"Patient's complaint: {state.chief_complaint}"
    return "New patient, no info yet."


async def run(target: TargetField, state: PatientHistoryState) -> str:
    """Generate the next patient-facing question. Minimal token usage."""
    chain = _build_chain()
    context = _build_context(state)
    result: QuestionOutput = await llm_call(chain, {
        "target_label": target.label,
        "context": context,
    })
    return result.question


if __name__ == "__main__":
    import asyncio

    from dotenv import load_dotenv

    load_dotenv()

    from microservice.piplines.pipeline1.logic.precedence_queue import get_next_field

    async def _test():
        state = PatientHistoryState(session_id="test-question")
        state.chief_complaint = "chest pain"
        target = get_next_field(state)
        question = await run(target, state)
        print(f"Generated question: {question}")

    asyncio.run(_test())
