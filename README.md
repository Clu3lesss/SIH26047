# MediKiosk

**AI-powered clinical history intake platform for high-volume Indian OPDs**

MediKiosk is a patient-facing software platform that captures a complete, structured clinical history — through natural conversation and document upload — *before* the patient enters the consultation room, so physicians spend their limited consultation time on examination and reasoning instead of re-eliciting history from scratch.

---

## The Problem

Indian public hospital OPDs see extremely high patient volumes, with reported consultation times as low as 2–12 minutes per patient across tertiary and government hospitals. A properly conducted clinical history — covering chief complaint, history of present illness (HPI), past medical/surgical history, drug and allergy history, family history, personal/social history, and a review of systems — typically needs 15–20 minutes on its own. Classical teaching holds that history alone yields the correct diagnosis in 70–80% of cases, even before examination.

At India's actual OPD scale, this isn't an occasional inefficiency — it's a structural bottleneck. Rushed histories lead to missed comorbidities, repeated questioning across visits, safety risks (e.g. missed drug allergies), and diagnostic error, disproportionately affecting patients seen later in a shift or those with vague/mild-presenting but serious conditions.

Existing solutions fall short:
- **Hospital registration systems** capture only demographic/appointment data, no clinical history.
- **Mobile health apps / chatbots** require smartphone literacy and pre-visit enrolment, excluding much of the government OPD population.
- **Manual nurse-led triage desks** don't scale to thousands of daily patients and reintroduce the same time bottleneck.
- **Generic document scanners** digitize images but don't structure or link content to a patient record.

## The Solution

MediKiosk lets any patient — regardless of literacy or tech comfort — independently record a complete medical history via voice or touch, and digitize their existing physical medical documents, producing a structured, physician-ready summary before the consultation begins.

### End-to-end patient journey

1. **Identify** — Patient enters/scans ID, selects language, grants consent.
2. **Converse** — AI conducts an adaptive voice + touch history interview.
3. **Scan** — Patient uploads prior prescriptions, lab reports, discharge summaries; AI digitizes and structures them.
4. **Summarize & route** — AI generates a structured summary and pushes it to the physician's screen.
5. **Consult** — Physician reviews the complete history in seconds and devotes the full consultation to examination and reasoning.

---

## Architecture Overview

MediKiosk is built as a set of focused pipelines rather than a single monolithic agent — most of the "intelligence" lives in narrow, structured LLM calls, with plain backend code handling control flow, state management, and persistence.

### Module A — Conversational History Engine

Conducts the structured interview turn by turn:

- **State-driven, not free-form.** The interview is modeled as a Pydantic state object mirroring the seven-section clinical history, broken down to individual fields (all nine SOCRATES elements for HPI, lists for medications/allergies/family conditions, etc.).
- **Deterministic next-field selection.** Rather than asking the LLM to infer what's missing from the whole state each turn (redundant token cost, inconsistent ordering), a fixed, pre-defined priority-ordered field list is walked in plain code to deterministically find the next empty field. The LLM's job is narrowed to phrasing a natural question about that specific field — not deciding what to ask.
- **One question at a time.** Enforced by prompt instruction, since a kiosk patient can't process a multi-part question at once.
- **Multi-field extraction per answer.** A single LLM call both extracts any relevant info from the patient's last message into the state *and* generates the next question, keeping extraction and questioning in sync.
- **In-memory state during the interview.** State lives in a server-side store keyed by session ID while the interview is in progress; nothing is written to the database until the interview completes, avoiding a DB round-trip on every turn.
- **List fields track a separate "asked" flag**, not just presence of data — an empty allergy list needs to be distinguishable between "not asked yet" and "patient confirmed none."

### Module B — Document Digitization

- Patient uploads a photo of a prior prescription, lab report, or discharge summary.
- A single multimodal (vision-capable) LLM call performs OCR and structured extraction in one step — diagnoses, medications with dosage, lab values with reference ranges — rather than a separate OCR engine plus separate extraction call.
- **Abnormal-value flagging** and **chronological ordering** of multiple documents are handled with plain deterministic code once values are extracted, not further LLM calls — these are comparison/sorting operations, not judgment calls.
- Documents are processed independently and in parallel if a patient uploads several at once.

### Red-Flag Check

- Runs as its own LLM classification call, evaluating a narrow slice of state (chief complaint, HPI, ROS) after every turn — not just at interview completion.
- Returns a structured judgment: `is_flagged`, `reason`, `urgency_tier`.
- If flagged, a `red_flags` row is written to the database **immediately**, independent of the main end-of-interview write, since the value of a red flag is getting it to a physician as early as possible — not after the full interview finishes.

### Summary Generation

- Runs once the interview state is complete.
- Reformats the already-structured state object into physician-readable prose, section by section. This is a formatting task, not an extraction task, since every field is already labeled and filled (or explicitly marked "not obtained") — making it fast, cheap, and far less error-prone than summarizing a raw transcript.
- The same finished state object drives both the prose summary (for the physician to read) and the structured database write (for storage/querying), avoiding two separate sources of truth.
- Physician retains full control — the summary is an editable draft, never an autonomous diagnosis.

---

## Interview Loop (Implementation Flow)

Per patient message, the flow is:

```
Patient message → API endpoint → Get state (in-memory)
    → Interview chain (extract + phrase next question)
    → Update state (in-memory)
    → Red-flag check (LLM) → if flagged: write red_flags row immediately
    → Complete? 
        → No: loop back, ask next question
        → Yes: write full state to DB → hand off to summary generation
```

The only LLM calls in this loop are the **interview chain** (once per turn) and the **red-flag check** (once per turn). Everything else — state get/update, the completion check, the deterministic next-field lookup, database writes — is plain backend code.

---

## Agentic Design Notes

- **Not everything here needs to be a tool-calling agent.** The history interview and red-flag check are structured LLM chains reasoning over context already provided (the state object) — no external action needed, so a plain `Runnable`/structured-output chain is a better fit than a ReAct-style agent.
- **Document processing is the one piece that genuinely needs an external capability** (reading an image), but the step order is fixed (get image → extract → structure), so it's a deterministic pipeline, not a dynamic tool-choosing agent.
- **LangChain vs. LangGraph:** LangGraph's value here is explicit branching/parallel execution and built-in state checkpointing. For a hackathon-scoped build, plain LangChain with manual control flow (a `while` loop for the interview, `asyncio.gather` for parallel document processing) is simpler to build and debug live, at the cost of owning state persistence yourself. LangGraph becomes more valuable at production scale, with genuinely complex branching or a need for automatic resumability.

---

## Database Schema

Normalized across five tables so each clinical section is independently queryable, rather than storing the history as one unstructured text blob:

| Table | Purpose |
|---|---|
| `patients` | Identity data captured once — name, age, ABHA ID, contact |
| `sessions` | One row per OPD visit, linked to a patient |
| `history_summary` | The structured seven-section history, one column per section, plus a `physician_edited` flag to track trust/accuracy over time |
| `documents` | Raw OCR text *and* structured extracted fields (JSON) per uploaded document, kept separately so re-parsing doesn't require re-OCRing |
| `red_flags` | Kept separate from `sessions` since not every session is flagged — keeps the common case lightweight |

---

## Tech Stack

- **Frontend:** React / Next.js — patient-facing kiosk UI (voice + touch dual input) and physician dashboard
- **Backend:** Node.js / Express — session orchestration, API endpoints, database access
- **AI orchestration:** Python / FastAPI + LangChain — interview chain, document extraction chain, red-flag classifier, summary generator
- **Database:** MySQL — patient, session, and structured history storage
- **OCR / document intelligence:** Vision-capable LLM (single-call OCR + extraction) for hackathon scope; dedicated OCR engine (Google Vision / Tesseract) as a future swap-in for more control
- **Consent & identity:** ABHA ID (mocked as a simple patient ID field for demo scope)

---

## Hackathon Scope Decisions

The full platform described in the original problem statement includes real ABDM/ABHA integration, multi-accent Indian-language ASR (Bhashini/AI4Bharat), and a full AYUSH/Dashavidha Pariksha history mode. These are infrastructure-dependent (government sandbox access, specialized language model tuning) rather than open technical problems, and are treated as **planned Phase 2** rather than built for the initial demo.

What's built and demoed:
- End-to-end conversational history intake (Module A) — the core value proposition
- Single-document upload and structured extraction (Module B)
- LLM-driven red-flag detection with immediate escalation
- Structured summary generation
- A minimal physician dashboard reading from the database

What's explicitly mocked or deferred, stated upfront rather than hidden:
- ABHA ID → simple patient ID field
- Multilingual voice input → single-language text/voice for demo
- AYUSH history mode → not included in initial scope
- Full ABDM/FHIR interoperability → future integration work
