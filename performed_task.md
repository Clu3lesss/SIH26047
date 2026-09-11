# 📋 MediKiosk — Project Diary (What We Built & Changed)


---

## 🏥 What is MediKiosk?

Imagine you go to a government hospital. There are 200 patients waiting. The doctor has only 5–10 minutes per patient. Most of that time is wasted just asking basic questions like:

- "What's your problem?"
- "Do you have diabetes?"
- "Any heart attacks in the family?"
- "Any allergies?"

**MediKiosk solves this.** Before you even meet the doctor, you sit at a tablet/kiosk in the waiting area. MediKiosk chats with you (like WhatsApp), asks you all the basic medical questions, and prepares a full medical history summary. By the time you sit in front of the doctor, the doctor already has your complete history on screen — ready to read.

**Result:** Doctor uses their time for examination and diagnosis, not for asking "how long have you had this pain?"

---

## 🧩 How the System is Split (Microservice Architecture)

> **What is a microservice?** Instead of one giant program doing everything, we split work into small independent services. Each service does one job and does it well. They talk to each other over the internet (HTTP requests).

MediKiosk has **two main services:**

### Service 1 — Frontend (The Visual App)
- Built with **Next.js** (a JavaScript/React framework)
- This is what the **patient sees** on the kiosk tablet
- This is also what the **doctor sees** on their dashboard
- It lives in the `frontend/` folder

### Service 2 — AI Microservice (The Brain)
- Built with **Python + FastAPI**
- This handles all the **AI / smart stuff**
- It calls the **Mistral AI language model** (like ChatGPT but from Mistral)
- It lives in the `microservice/` folder
- The frontend sends messages to this service and gets back AI responses

### Service 3 — Database (The Memory)
- **Supabase** (a cloud PostgreSQL database)
- Stores patient records, session data, summaries, red flags, uploaded documents
- Both the frontend and microservice save/read from here

---

## 🤖 How the AI Microservice Works (The Brain — Explained Simply)

The `microservice/` folder contains two "pipelines" (think of pipelines as assembly lines):

### Pipeline 1 — The Interview Pipeline
**Job:** Chat with the patient, ask medical history questions, detect danger signs

**Step-by-step what happens:**
1. Patient types/speaks a message (e.g., "I have chest pain since 2 days")
2. **Extraction Agent** reads the message and pulls out medical facts ("chief_complaint = chest pain, duration = 2 days")
3. **Red Flag Agent** checks if anything is dangerous (e.g., chest pain = possible heart attack!) and marks it
4. **Question Agent** decides what to ask next based on what information is still missing
5. This repeats for up to **6 questions** (we set a limit so the interview does not go on forever)
6. After 6 questions OR when enough information is gathered — interview ends

**Files involved:**
- `microservice/piplines/pipeline1/orchestrator.py` — the main coordinator
- `microservice/piplines/pipeline1/agents/extraction_agent.py` — reads patient answers
- `microservice/piplines/pipeline1/agents/redflag_agent.py` — detects danger signs
- `microservice/piplines/pipeline1/agents/question_agent.py` — decides next question
- `microservice/piplines/pipeline1/logic/precedence_queue.py` — decides which topic to ask about next (in priority order)
- `microservice/piplines/models/state.py` — the "memory box" holding all patient data for the session

### Pipeline 2 — The Summary Pipeline
**Job:** After the interview is done, write a clean doctor-ready summary

**Step-by-step:**
1. Takes all the information collected during the interview
2. Passes it to the **Summary Agent** (AI)
3. AI writes a professional medical summary (like what a medical student would write)
4. Summary is saved to the database and shown to the doctor

**Files involved:**
- `microservice/piplines/pipeline2/orchestrator.py`
- `microservice/piplines/pipeline2/agents/summary_agent.py`

---

## 🖥️ How the Frontend Works (What People See)

### Patient Side (Kiosk)
The patient goes through these steps:

  Welcome → Check-In → Chat Interview → Upload Documents → Done ✅

1. **Welcome Screen** — patient sees the MediKiosk intro
2. **Check-In** — patient enters their name, age, gender (like registering)
3. **Chat Interview** — the AI asks questions, patient types answers (max 6 questions)
4. **Upload Documents** — patient can scan/upload old prescriptions, lab reports
5. **Done** — "Your information has been sent to the doctor"

### Doctor Side (Dashboard)
The doctor opens their dashboard and sees:

- **Left panel:** Queue of patients waiting (sorted: danger cases first!)
- **Right panel:** When they click a patient, they see full medical history, AI summary, red flag warnings, and all uploaded documents

The dashboard **auto-refreshes every 4 seconds** from the database — so as soon as a patient finishes, they appear on the doctor's screen.

### Demo Page
A special testing page where you can simulate two real patient scenarios (Case A: Heart attack symptoms, Case B: Diabetes symptoms) without an actual patient being present. Used for demonstrations/hackathon.

---

## 🛠️ All Changes Made — Session by Session

---

### 🔴 Bug Fix: AI Was Asking the Same Question Over and Over Again

**What was the problem?**
When a patient said "I have no family history of anything, everything is normal" — the AI would extract nothing (because the patient said nothing specific), so it would ask the same family history question again. And again. Infinite loop.

**What we fixed:**
- Added a list called `asked_fields` — every question the AI asks gets recorded here
- Before asking any question, the AI checks: "Have I already asked this?" If yes, skip it
- Added `_handle_negative_fallback()` — if the patient says "no", "none", "normal", "fine", we mark that topic as "already answered: nothing to report"
- Made the extraction AI smarter so it understands "no family history" as a valid answer (not empty)

**Files changed:**
- `microservice/piplines/models/state.py`
- `microservice/piplines/pipeline1/logic/precedence_queue.py`
- `microservice/piplines/pipeline1/agents/extraction_agent.py`
- `microservice/piplines/pipeline1/orchestrator.py`

---

### ⏱️ Feature: 6-Question Limit

**What was the problem?**
The interview could theoretically go on for 20+ questions (covering every medical topic). That is too long for a busy OPD kiosk.

**What we built:**
- Added `MAX_TURNS = 6` at the top of the orchestrator
- After 6 questions, interview automatically ends and summary generation starts
- Progress bar in the app now shows "Question 3 of 6" instead of a confusing percentage

**Files changed:**
- `microservice/piplines/pipeline1/orchestrator.py`
- `frontend/src/components/kiosk/ClinicalProgressStepper.tsx`

---

### 🩺 Feature: Doctor Dashboard — Actually Works Now

**What was the problem?**
The doctor's dashboard was showing dummy/fake data hardcoded in the app. Real patients completing the interview were NOT appearing on the doctor's screen. The doctor had no idea who was waiting.

**What we built:**
- Added a function `getDoctorQueueFromDb()` that reads all patient sessions from the real Supabase database
- Doctor dashboard now **auto-refreshes every 4 seconds** — it polls the database silently in the background
- Added a green "Live" indicator so doctor knows data is fresh
- Added a manual "Refresh" button as a backup
- If database sync fails, shows a red error banner with a "Retry Sync" button
- **Red flag patients appear at the TOP of the queue** (heart attack risk = highest priority)

**Files changed:**
- `frontend/src/app/doctor/page.tsx` (complete rewrite)
- `frontend/src/store/doctorStore.ts` (major upgrade)
- `frontend/src/lib/actions/db.ts` (added database query function)

---

### 📄 Feature: Document Upload — Documents Reach the Doctor

**What was the problem?**
When a patient uploaded a prescription or lab report at the kiosk, it was only saved locally in the browser. The doctor could never see it. It disappeared on page refresh.

**What we built:**
- When patient uploads a document, it is **immediately saved to Supabase database**
- The document upload component shows "Saved to Doctor Dashboard" when done
- Doctor's dashboard now has a **Document Viewer panel** showing all uploaded files
- Doctor can click any document to see it full-screen, and download it
- If no documents were uploaded, shows "No Patient Documents Uploaded" clearly

**Files changed:**
- `frontend/src/components/kiosk/DocumentUpload.tsx`
- `frontend/src/lib/actions/db.ts` (added `saveUploadedDocument()`)
- `frontend/src/components/doctor/PatientDocumentViewer.tsx` (NEW FILE created)
- `frontend/src/app/doctor/page.tsx`

---

### 🔄 Feature: Auto-Generate Physician Summary

**What was the problem?**
After the patient finished the interview, a summary was not being auto-generated. The doctor would see patient data but no formatted summary.

**What we built:**
- When interview status becomes "completed", the app **automatically fires Pipeline 2** in the background
- The summary is saved to the database AND shown in the kiosk completion screen
- The completion screen shows a "Physician Summary Ready" badge with a spinner while it generates
- Patient can preview the Chief Complaint section right there

**Files changed:**
- `frontend/src/hooks/useIntakeSession.ts`
- `frontend/src/store/kioskStore.ts`
- `frontend/src/components/kiosk/KioskCompletionCard.tsx`

---

### 📋 Feature: Patient Queue — Shows Document and Status Info

**What we built:**
- Each patient in the doctor's queue list now shows a small badge:
  - "3 Docs" — patient uploaded 3 documents
  - "No Docs" — no documents uploaded
  - "Ready" — patient has completed the full interview
  - "Intake" — patient is still in the interview

**Files changed:**
- `frontend/src/components/doctor/PatientQueueList.tsx`

---

### 📱 Fix: Demo Page Was Not Scrollable on Mobile

**What was the problem?**
The demo page (used for presentations) had a fixed height layout. On smaller screens or when scrolling, content got cut off and you could not scroll down.

**What we fixed:**
- Made the page scroll on mobile/tablet screens
- On large desktop screens, keeps the original side-by-side layout
- Both panels (patient side + doctor side) now scroll independently on all screen sizes

**Files changed:**
- `frontend/src/app/demo/page.tsx`

---

### 🔒 TypeScript Types — Keeping Everything in Sync

**What is TypeScript?** It is like a spell-checker for code. It makes sure you do not accidentally pass wrong data between parts of the app.

**What we updated:**
- Added `asked_fields` and `last_target_field` to the patient state type definition so frontend and backend use the same data structure
- Added `documentCount` and `isConsulted` to patient queue entries
- Added `generatedSummary`, `markAttended`, and `syncFromDb` to store types

**Files changed:**
- `frontend/src/types/intake.ts`
- `frontend/src/types/kiosk.ts`
- `frontend/src/store/kioskStore.ts`
- `frontend/src/store/doctorStore.ts`

---

### 🎫 Bug Fix: Token Number Not Increasing After Page Refresh

**What was the problem?**
The token counter was reset to `1` every time the browser reloaded because it lived only as a temporary in-memory JavaScript counter. Also, sessions created in the database sometimes had token `0`.

**What we fixed:**
- **`localStorage` Persistence:** We saved the token counter in `localStorage` under `medikiosk_token_counter`, so refreshing the page never resets your next token back to 1.
- **Database Floor Synchronization:** The database queries the highest existing token number from previous visits (`getNextTokenNumber()`) to ensure new patients always receive an increasing number (`#1, #2, #3, ...`).
- When checking in at the kiosk, the confirmed assigned token from the database is immediately saved to the active session.

**Files changed:**
- `frontend/src/store/kioskStore.ts`
- `frontend/src/components/kiosk/KioskWelcome.tsx`
- `frontend/src/lib/actions/db.ts`
- `frontend/src/app/doctor/page.tsx`
- `frontend/src/app/demo/page.tsx`

---

### 🩺 Feature: Doctor Can Mark Patient as "Attended / Consulted"

**What was the problem?**
Once a patient completed intake and was seen by the doctor, there was no way for the doctor to indicate that the patient had been attended to. Patients remained in the queue looking identical to unexamined patients.

**What we built:**
- **"Mark as Attended / Consulted" Button:** Added a prominent action button in the doctor toolbar.
- **Visual Queue Status:** When attended, the patient's card in the queue list shows a green `✓ Attended` badge, their token number receives a strike-through, and the row dims slightly so the doctor can immediately see who is still waiting.
- **Undo Option:** The doctor can click to undo if marked by mistake.
- **Database Persistence:** Saves `status = 'consulted'` and sets `physicianApproved = true` in Supabase via a new `markSessionAttended()` server action.

**Files changed:**
- `frontend/src/lib/actions/db.ts`
- `frontend/src/types/kiosk.ts`
- `frontend/src/store/doctorStore.ts`
- `frontend/src/components/doctor/ClinicalActionToolbar.tsx`
- `frontend/src/components/doctor/PatientQueueList.tsx`

---

### 🌟 Feature: Evaluation & Demo Ready Mode for Presentation

**What was the problem?**
The initial prototype lacked presentation context for evaluators. There was no guided walkthrough of the end-to-end flow.

**What we built:**
- Redesigned landing page with problem statement statistics (2–5 min OPD bottleneck, 70–80% diagnosis from history) and a 5-step visual roadmap.
- Added a top demo walkthrough bar in the split-screen `/demo` portal explaining the sequence of steps.
- Created deployment configuration (`vercel.json`, `.env.example`) so the app can be hosted online for evaluation.

**Files changed:**
- `frontend/src/app/page.tsx`
- `frontend/src/app/demo/page.tsx`
- `frontend/src/components/demo/ScenarioSelector.tsx`
- `vercel.json`
- `.env.example`

---

### 🐛 Bug Fix: Injected Demo Scenario Disappearing After 4-5 Seconds

**What was the problem?**
When clicking "Inject Live Scenario" on the Demo page, the patient appeared for 4 seconds and then abruptly vanished.
This happened because the physician workstation polls the database every 4 seconds (`getDoctorQueueFromDb()`). When new DB records arrived, `syncFromDb()` was overwriting the entire queue with only what existed in Supabase, discarding the in-memory injected demo scenario.

**What we fixed:**
- **Smart Queue Merge in `syncFromDb`:** Updated `doctorStore.ts` so that incoming DB records are intelligently merged with any active local or demo-injected records (`s.queue`), ensuring injected patients and alerts never vanish during background polling.
- **Database Persistence for Demo Scenarios:** When an evaluator or judge injects a demo scenario in `ScenarioSelector.tsx`, it is now also saved asynchronously into Supabase (`createPatientAndSession`, `saveCompletedHistory`, `saveRedFlagAlert`).

**Files changed:**
- `frontend/src/store/doctorStore.ts`
- `frontend/src/components/demo/ScenarioSelector.tsx`

---

### 🛡️ Bug Fix: Kiosk Opening Directly to Document Upload Instead of Check-In

**What was the problem?**
If a previous session had finished at the document upload or completion step, reopening `/kiosk` rehydrated the old `step: 'scan'` from browser storage, allowing someone to click "Skip" and generate a token without ever entering their name or registering.

**What we fixed:**
- **Enforced Registration Check:** In `KioskPage` (`kiosk/page.tsx`), if there is no registered patient (`!patient || !sessionId`), the kiosk strictly forces `step = 'checkin'` and renders `KioskWelcome`. It is now physically impossible to see document upload or completion cards without first registering.
- **Auto-Reset on Rehydration:** In `kioskStore.ts`, added `onRehydrateStorage` cleanup so stale or completed sessions automatically reset back to `'checkin'` on page load.

**Files changed:**
- `frontend/src/app/kiosk/page.tsx`
- `frontend/src/store/kioskStore.ts`

---

### 🎫 Feature: Two-Stage Token Lifecycle (Provisional vs Permanent Confirmed)

**What was the problem?**
Tokens were immediately treated as permanent from the moment someone checked in, even if they never completed their clinical intake.

**What we built:**
- **Provisional Token (Stage 1):** When a patient registers at the kiosk, they receive a **Provisional / Temporary Token** (`tokenStatus: 'provisional'`). In the header and doctor queue, it is marked with an amber badge (`⏳ Provisional Token #X`). The doctor can see that intake is still in progress.
- **Permanent Confirmed Token (Stage 2):** Only when the patient finishes all 6 questions and submits their clinical interview does the token become **Permanently Confirmed** (`tokenStatus: 'confirmed'`).
- The doctor queue updates to a green `✓ Confirmed Token #X · Ready for Doctor` badge.
- The Kiosk completion screen confirms: *"Your responses have been submitted. Your temporary token is now permanently confirmed and forwarded to the doctor."*

**Files changed:**
- `frontend/src/types/kiosk.ts`
- `frontend/src/store/kioskStore.ts`
- `frontend/src/components/common/Header.tsx`
- `frontend/src/components/kiosk/KioskWelcome.tsx`
- `frontend/src/components/kiosk/KioskCompletionCard.tsx`
- `frontend/src/components/doctor/PatientQueueList.tsx`
- `frontend/src/app/doctor/page.tsx`
- `frontend/src/app/demo/page.tsx`
- `frontend/src/hooks/useIntakeSession.ts`
- `frontend/src/components/demo/ScenarioSelector.tsx`

---

### 📝 Bug Fix: Physician Summary Disappearing After a Few Seconds

**What was the problem?**
When the doctor clicked "Generate Physician Summary", the AI summary appeared nicely, but vanished after 4 seconds and reverted to "AI Summary Not Generated".
This happened because the doctor dashboard runs a background database sync every 4 seconds (`getDoctorQueueFromDb()`). The summary generation hook had saved the summary only into local memory, not to Supabase. When the 4-second poll completed, `syncFromDb()` took the database row (where `summary` was still empty) and overwrote the local state, erasing the newly generated summary.

**What we fixed:**
- **Intelligent Summary Preservation in `doctorStore.ts` (`syncFromDb`):** When background DB polling returns records, `syncFromDb()` now checks if a local record already has a summary, edited draft, or is actively generating. It merges the DB record while preserving the in-memory summary and physician edits, preventing them from being overwritten with `null`.
- **Immediate Supabase Database Persistence:** In `useSummaryGeneration.ts`, when a summary is successfully synthesized, it now immediately calls `saveCompletedHistory(sessionId, state, response.summary)` so it is permanently stored in the Supabase database.

**Files changed:**
- `frontend/src/store/doctorStore.ts`
- `frontend/src/hooks/useSummaryGeneration.ts`


---

## ✅ What is Working Right Now

| Feature | Status |
|---|---|
| Patient kiosk chat interview (6 questions max) | Working |
| AI extracting medical history from conversation | Working |
| Red flag detection (heart attack, stroke etc.) | Working |
| Physician summary auto-generation | Working |
| Document upload saving to database | Working |
| Doctor dashboard live sync (every 4 sec) | Working |
| Doctor document viewer | Working |
| Demo page with two scenarios | Working |
| Patient queue with status badges | Working |
| Mobile scrolling on demo page | Working |

---

## 🚀 What is Phase 2 (Future Work)

| Feature | Notes |
|---|---|
| Voice input (patient speaks instead of types) | UI button exists, needs speech-to-text API |
| Hindi/regional language support | Multi-language AI prompts needed |
| OTP-based patient login | Currently just name/age entry |
| Biometric/Aadhaar integration | For patient identity |
| Prescription printing | Doctor can print summary as PDF |
| WebSockets (real-time push) | Currently using 4-second polling — WebSockets would be more efficient but polling works fine for now |

---

## 📁 Project Folder Structure (Simple View)

```
SIH26047/
|
|-- microservice/          <- Python AI Brain
|   |-- main.py            <- Entry point (starts the server)
|   `-- piplines/
|       |-- models/        <- Data structures (what patient data looks like)
|       |-- session/       <- Stores ongoing interview sessions in memory
|       |-- pipeline1/     <- Interview pipeline (ask questions, extract data)
|       `-- pipeline2/     <- Summary pipeline (write doctor-ready summary)
|
|-- frontend/              <- Next.js Web App (what users see)
|   |-- src/app/           <- Pages (kiosk, doctor, demo, landing)
|   |-- src/components/    <- UI building blocks (chat, queue list, etc.)
|   |-- src/hooks/         <- Reusable logic (how to call the AI API)
|   |-- src/store/         <- App memory/state (what data is being tracked)
|   |-- src/lib/           <- Utility functions (database calls, API calls)
|   |-- src/types/         <- TypeScript type definitions
|   `-- prisma/            <- Database schema (what tables exist)
|
`-- performed_task.md      <- This file!
```

---

## 🗃️ Database Tables (What Gets Saved Where)

| Table | What is Stored |
|---|---|
| patients | Name, age, gender, contact |
| sessions | Each interview session (linked to patient) |
| history_summary | The full structured medical history + AI summary text |
| red_flags | All detected danger signs (heart attack risk etc.) |
| documents | Uploaded prescriptions/lab reports (file path + name) |

---

> Note: Update this file every time a new feature is added or a bug is fixed. Keep it in simple language so anyone can understand the project progress.

---

Last updated: September 2026 — Smart India Hackathon 2026 (PS-47)
