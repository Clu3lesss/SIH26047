# MediKiosk Frontend Architecture & Design Specification (`design.md`)

> **Project:** MediKiosk — AI-Powered Clinical History Intake Platform for High-Volume Indian OPDs  
> **Target Problem Statement:** SIH Problem Statement 47  
> **Backend Integration:** FastAPI Microservice (`POST /intake`, `POST /summary`)  
> **Scope:** Patient Kiosk Interface, Physician Clinical Dashboard, and Dual-Screen Jury Demo Mode  

---

## 1. Executive Summary & Vision

In Indian public hospital Outpatient Departments (OPDs), physicians typically have **only 2 to 12 minutes per patient** while a standard 7-section clinical history requires 15–20 minutes. MediKiosk bridges this bottleneck by collecting, structuring, and red-flagging patient clinical history **before** the patient steps into the consultation room.

The frontend serves two distinct personas and operating environments:
1. **The Patient Kiosk (`/kiosk`):** Located in high-traffic hospital waiting areas. Must cater to diverse digital literacy, elderly patients, low vision, and noisy environments using high-contrast large touch targets, voice input (Speech-to-Text), voice playback (Text-to-Speech), and quick-tap categorical chips.
2. **The Physician Dashboard (`/doctor`):** Located at the doctor's desk. High information density, triage urgency badges, instant red-flag alerts, SOCRATES pain matrix, and an editable draft clinical summary that doctors can approve in under 30 seconds.
3. **The SIH Jury / Showcase Mode (`/demo`):** A side-by-side split screen showing the Kiosk on the left and the Doctor's live view on the right to demonstrate real-time data flow and instant red-flag escalation during hackathon evaluations.

---

## 2. System Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Next.js 14+ (App Router)                      │
│                                                                        │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌───────────────┐ │
│  │     Patient Kiosk    │  │  Physician Dashboard │  │   Jury Demo   │ │
│  │       (/kiosk)       │  │       (/doctor)      │  │    (/demo)    │ │
│  └──────────┬───────────┘  └──────────┬───────────┘  └───────┬───────┘ │
│             │                         │                      │         │
│             ▼                         ▼                      ▼         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                    Zustand Session & Queue Stores                 │ │
│  │          - activeSessionId, turnCount, historyState               │ │
│  │          - audioRecordState, redFlagAlerts, queueList             │ │
│  └──────────────────────────────────┬────────────────────────────────┘ │
│                                     │                                  │
│                                     ▼                                  │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │              API Client Layer (TanStack Query / Axios)            │ │
│  └──────────────────────────────────┬────────────────────────────────┘ │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      │ HTTP / JSON
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   MediKiosk AI Microservice (FastAPI :8000)            │
│                                                                        │
│   • POST /intake   → Pipeline 1: Extraction → Red-Flag → Next Question │
│   • POST /summary  → Pipeline 2: Physician Prose Summary Generation    │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Recommended Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Framework** | **Next.js 14+ (App Router) + TypeScript** | Server Components for speed, Client Components for interactive kiosk touch & voice, zero-config API proxies. |
| **Styling** | **Tailwind CSS + Tailwind Animate** | Rapid design token consistency, kiosk-specific responsive scaling (`text-2xl`, `p-6`). |
| **Component Library** | **shadcn/ui + Radix UI Primitives** | Accessible, headless, customizable UI blocks (Dialogs, Sliders, Progress bars, Badges). |
| **Icons** | **Lucide React** | Clean medical and UI icons (`Stethoscope`, `Mic`, `AlertTriangle`, `HeartPulse`, `FileText`). |
| **State Management** | **Zustand** | Lightweight, minimal boilerplate for session state, turn counts, audio states, and offline resilience. |
| **Data Fetching** | **TanStack Query (React Query v5)** | Manages API cache, loading states, retry logic, and mutation handling for `/intake` and `/summary`. |
| **Voice / Speech** | **Web Speech API (`SpeechRecognition` & `SpeechSynthesis`)** | Zero-latency on modern Chromium/Edge browsers, no external paid API costs for hackathon demo. Includes audio recording fallback. |
| **Sound / Cues** | **Web Audio API / Howler.js** | Gentle auditory feedback for button taps, voice start/stop, and completion chimes for kiosk accessibility. |

---

## 3. Backend Data Contracts Integration

The frontend interfaces directly with the existing FastAPI microservice models:

### 3.1 Pipeline 1: Conversational Turn (`POST /intake`)

- **Endpoint:** `http://localhost:8000/intake`
- **Request Body:**
  ```typescript
  interface IntakeRequest {
    session_id: string; // e.g. "PAT-20260908-042"
    message: string;    // Raw patient response (text or transcribed speech)
  }
  ```
- **Response Body:**
  ```typescript
  interface IntakeResponse {
    status: "in_progress" | "completed";
    state: PatientHistoryState;
    next_question: string | null; // Null when completed
    red_flag: {
      is_flagged: boolean;
      reason: string | null;
      urgency_tier: "low" | "medium" | "high" | null;
    };
  }
  ```

### 3.2 Pipeline 2: Physician Summary (`POST /summary`)

- **Endpoint:** `http://localhost:8000/summary`
- **Request Body:**
  ```typescript
  interface SummaryRequest {
    state: PatientHistoryState; // The final completed state object
  }
  ```
- **Response Body:**
  ```typescript
  interface SummaryResponse {
    summary: {
      chief_complaint: string;
      history_of_present_illness: string;
      past_medical_history: string;
      past_surgical_history: string;
      medications: string;
      allergies: string;
      family_history: string;
      social_history: string;
      review_of_systems: string;
    };
  }
  ```

---

## 4. UI/UX Specifications & User Journeys

---

### Module 1: Patient-Facing Kiosk Interface (`/kiosk`)

The kiosk interface is optimized for high contrast, large touch targets (minimum 56px height), bold readable typography, and multi-modal voice + touch input.

```
┌────────────────────────────────────────────────────────────────────────┐
│ [🏥 AIIMS OPD MediKiosk]     [Token #42]           [🔊 Sound: ON] [🇮🇳 EN | हिन्दी] │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   Step 1: Check-in ──▶ Step 2: History (78%) ──▶ Step 3: Scan ──▶ Step 4: Token  │
│                                                                        │
├────────────────────────────────────────┬───────────────────────────────┤
│                                        │  CLINICAL PROGRESS SUMMARY    │
│  [🤖 AI MediKiosk Nurse]               │                               │
│  "Does the chest pain spread to your   │  • Chief Complaint: Pain (✓)  │
│   neck, shoulder, or left arm?"        │  • Location: Center chest (✓) │
│                                        │  • Onset: 2 hours ago (✓)     │
│  [🔊 Read Aloud]                       │  • Severity: 7/10 (✓)         │
│                                        │  • Radiation: Inquiring...    │
├────────────────────────────────────────┤  • Past Conditions: (Pending) │
│                                        │  • Allergies: (Pending)       │
│  QUICK RESPONSES:                      │                               │
│  [ Yes, to left arm ] [ To my neck ]   │                               │
│  [ No, stays in chest ] [ Not sure ]   │                               │
│                                        │                               │
├────────────────────────────────────────┴───────────────────────────────┤
│  [🎤 Tap & Speak into Mic]     OR     [ Type your answer here...  ] [➔] │
│  (Press to record in Hindi or English)                                 │
└────────────────────────────────────────────────────────────────────────┘
```

#### Step 1: Patient Identification & Consent
- **Input Fields:**
  - Patient Full Name
  - Age & Biological Sex
  - Contact Number (Optional for SMS receipt)
  - ABHA ID / OPD Registration Number (Mock scanner or numeric keypad input)
  - Preferred Language: **English** | **हिन्दी** (Hindi) | **Regional**
- **Action:** Generates `session_id` (e.g., `OPD-2026-9182`), initializes session in state store, and transitions to the intake conversation.

#### Step 2: Turn-by-Turn Conversational Intake
- **Dual Voice & Touch Engine:**
  - **Text-to-Speech (TTS):** When AI asks `next_question`, the kiosk automatically reads it aloud in a friendly, calming tone. A large speaker toggle enables/disables narration.
  - **Speech-to-Text (STT):** A pulsing, prominent circular microphone button:
    - *State Idle:* "Tap to Speak" (Blue)
    - *State Listening:* "Listening... speak now" (Pulsing Red ring with soundwave animation)
    - *State Processing:* "Thinking & Analyzing..." (Rotating clinical spinner with empathetic message: *"Recording your history for the doctor..."*)
  - **Smart Predictive Chips:** Based on the current target field:
    - *Severity:* Direct interactive slider (1 to 10) or chips `[Mild 1-3]` `[Moderate 4-6]` `[Severe 7-10]`
    - *Onset:* `[Just started today]` `[2-3 days ago]` `[Over a week]` `[Months/Years]`
    - *Allergies / Surgeries:* Big red/green buttons: `[No Known Allergies]` `[Penicillin / Sulfa]` `[Food Allergies]`
- **Real-Time Progress Stepper:**
  - Displays patient progress through the 7 clinical sections:
    1. Chief Complaint
    2. Details of Illness (SOCRATES: Site, Onset, Severity, etc.)
    3. Past Medical & Surgical History
    4. Current Medications & Allergies
    5. Family History
    6. Personal & Social Habits
    7. Review of Body Systems
- **Silent Red-Flag Handling:**
  - When `red_flag.is_flagged === true`, the kiosk **does not cause panic** to the patient. It seamlessly continues questions while emitting an urgent background flag to the physician workstation and hospital triage nurse.

#### Step 3: Document Scanner & Upload (Module B)
- Patient can hold physical prior prescriptions, lab reports, or discharge slips up to the camera or upload a photo.
- Live camera preview with alignment guidelines ("Place prescription within the frame").
- Thumbnail preview with options to "Add another page" or "Continue".

#### Step 4: Completion & OPD Ticket
- Displays friendly completion message:
  - *"Thank you, Ramesh Kumar! Your clinical history has been forwarded directly to Dr. Sharma in Room 14."*
  - Generated OPD Token Card (Large printable or downloadable QR code with token number #42).
  - Estimated wait time indicator (e.g., *~8 minutes*).

---

### Module 2: Physician Clinical Consultation Dashboard (`/doctor`)

The physician dashboard is designed for high efficiency and immediate cognitive processing. Doctors should be able to absorb the patient's entire profile within **15 to 30 seconds**.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🏥 MediKiosk Physician Station  |  Dr. Priya Sharma (OPD Room 14)        [Live Queue: 6]│
├───────────────────┬────────────────────────────────────────────────────────────────────┤
│ PATIENT QUEUE     │ 🚨 RED FLAG TRIAGE ALERT: URGENCY TIER: HIGH                       │
│                   │ Reason: Central chest pain radiating to left arm with dyspnea.     │
│ [!] #42 R. Kumar  ├───────────────────────────────────┬────────────────────────────────┤
│     Age 58 | High │ PATIENT: Ramesh Kumar (58 M)      │ AI CLINICAL SUMMARY (Draft)    │
│                   │ Token: #42 | ABHA: 91-8273-1928   │ [✏️ Edit] [📋 Copy EMR] [🖨️ Print]│
│ [#43] S. Verma    ├───────────────────────────────────┤                                │
│     Age 34 | Low  │ 1. CHIEF COMPLAINT                │ Patient is a 58-year-old male  │
│                   │ "Chest tightness & breathlessness"│ presenting with acute central  │
│ [#44] A. Patel    ├───────────────────────────────────┤ retrosternal chest tightness   │
│     Age 62 | Med  │ 2. HPI (SOCRATES BREAKDOWN)       │ onset 2 hours ago radiating to │
│                   │ • Site: Substernal / Center Chest │ left shoulder. Associated with │
│                   │ • Character: Crushing tightness   │ diaphoresis and dyspnea.       │
│                   │ • Radiation: Left arm & jaw       │ Severity rated 8/10.           │
│                   │ • Severity: 8/10                  │                                │
│                   │ • Onset: Sudden, 2 hours ago      │ Past Medical: T2DM (5 yrs),    │
│                   │ • Relieving: None reported        │ Hypertension.                  │
│                   ├───────────────────────────────────┤ Allergies: Penicillin (Rash)   │
│                   │ 3. ALLERGIES & MEDICATIONS        │ Current Meds: Metformin 500mg. │
│                   │ ⚠️ ALLERGIES: PENICILLIN (Rash)    │                                │
│                   │ • Meds: Metformin 500mg OD        ├────────────────────────────────┤
│                   ├───────────────────────────────────┤ PHYSICIAN ACTIONS:             │
│                   │ 4. REVIEW OF SYSTEMS (ROS)        │ [ Request ECG Now ]            │
│                   │ • Cardio: Chest tightness, angor  │ [ Direct Admit to Emergency ]  │
│                   │ • Respiratory: Mild wheeze/SOB    │ [ Approve & Attach to EMR ]    │
└───────────────────┴───────────────────────────────────┴────────────────────────────────┘
```

#### Key Dashboard Components:
1. **Live OPD Queue Sidebar:**
   - Real-time patient queue list with Token Number, Name, Age, Arrival Time, and Priority Badge (`Normal`, `Medium`, `CRITICAL RED-FLAG`).
2. **Immediate Red-Flag Alert Banner:**
   - Prominently styled alert banner in Red/Amber when a patient has active red flags.
   - Highlights the exact clinical reasoning returned by the LLM (e.g. *Suspected Acute Coronary Syndrome*).
   - Instant quick-action button: `[Direct Triage to ER]`.
3. **Structured 7-Section Clinical Matrix:**
   - Visual chips and formatted cards for every section in `PatientHistoryState`:
     - **SOCRATES Table:** Formatted key-value grid for pain/symptom characteristics.
     - **Allergies & Meds:** Marked with high-visibility safety warnings.
     - **Past Medical & Surgical History:** Bulleted chronic illnesses and prior operations.
     - **Review of Systems:** Organ-system checklist (Cardio, Resp, GI, Neuro, Musculo).
4. **Editable AI Prose Summary (Pipeline 2):**
   - Automatically fetched or triggered when opening a patient record.
   - Formatted in classical clinical documentation prose.
   - **Editable Draft Mode:** Doctors can directly edit text, append physical examination notes, and click `Approve & Sign`.
   - Single-click action to copy to clipboard for hospital EMR/EHR or export as a printable PDF report.

---

### Module 3: Split-Screen Jury Showcase (`/demo`)

Essential for Smart India Hackathon demonstrations.
- Left half of the viewport: **Interactive Patient Kiosk**
- Right half of the viewport: **Physician Dashboard updating in real-time**
- **Preset Test Scenarios:** Dropdown selector to pre-populate simulated clinical cases:
  - *Case A (Emergency):* Acute Myocardial Infarction / Unstable Angina (Triggers instant High Red-Flag).
  - *Case B (Chronic Routine):* Diabetic follow-up with peripheral neuropathy.
  - *Case C (Pediatric / Acute GI):* Acute gastroenteritis with dehydration signs.

---

## 5. UI Design System & Styling Tokens

### 5.1 Color Palette
- **Clinical Primary:** Teal / Deep Slate (`#0D9488`, `#0F172A`) — Evokes cleanliness, clinical authority, and calm.
- **Surface & Backgrounds:** Crisp hospital white (`#FFFFFF`) with cool clinical gray undertones (`#F8FAFC`, `#F1F5F9`).
- **Emergency & Red-Flags:** Vibrant Alert Red (`#EF4444`, `#DC2626`) with soft rose backgrounds (`#FEF2F2`).
- **Safety / Confirmed Items:** Medical Emerald (`#10B981`, `#059669`).
- **Interactive Voice States:** Electric Violet / Cobalt Blue (`#6366F1`, `#3B82F6`) for active recording.

### 5.2 Typography
- Primary font: `Inter` or `Plus Jakarta Sans` for ultra-clean readability.
- Bilingual font fallback: `Noto Sans Devanagari` for crisp Hindi rendering.
- Scale:
  - Kiosk Headline: `32px` - `40px` (Bold)
  - Kiosk Question Text: `24px` - `28px` (Medium/SemiBold)
  - Kiosk Button / Chip Text: `18px` - `22px` (Medium)
  - Doctor Dashboard: Standard desktop density (`14px` body, `16px` subheadings, `20px` titles).

### 5.3 Accessibility (a11y) & Resilience
- Meets **WCAG 2.1 AA** contrast ratios.
- Visual touch targets are **at least 56px high** on the kiosk.
- Empathetic feedback indicators during backend latency (handling LLM response wait times of 2–5s gracefully with animated reassuring status messages).

---

## 6. Frontend Folder & File Architecture

```
frontend/
├── public/
│   ├── audio/              # Sound cues (beep.mp3, success.mp3)
│   ├── images/             # Hospital logos, human anatomy illustrations
│   └── locales/            # Translation strings (en.json, hi.json)
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Global root layout with theme & query providers
│   │   ├── page.tsx        # Landing / Portal Selector (Kiosk vs Doctor vs Demo)
│   │   ├── kiosk/
│   │   │   ├── page.tsx    # Patient Kiosk flow (Check-in -> Intake -> Complete)
│   │   │   └── scan/page.tsx # Document upload & OCR preview
│   │   ├── doctor/
│   │   │   └── page.tsx    # Physician Dashboard & Queue
│   │   └── demo/
│   │       └── page.tsx    # Split-screen presentation view
│   ├── components/
│   │   ├── common/
│   │   │   ├── Header.tsx
│   │   │   ├── AudioWaveform.tsx
│   │   │   └── LanguageSelector.tsx
│   │   ├── kiosk/
│   │   │   ├── KioskWelcome.tsx
│   │   │   ├── KioskChatStream.tsx
│   │   │   ├── VoiceInputButton.tsx
│   │   │   ├── SmartResponseChips.tsx
│   │   │   ├── ClinicalProgressStepper.tsx
│   │   │   └── KioskCompletionCard.tsx
│   │   ├── doctor/
│   │   │   ├── PatientQueueList.tsx
│   │   │   ├── RedFlagAlertBanner.tsx
│   │   │   ├── SocratesMatrix.tsx
│   │   │   ├── HistorySectionCard.tsx
│   │   │   ├── EditableSummaryEditor.tsx
│   │   │   └── ClinicalActionToolbar.tsx
│   │   └── ui/             # shadcn/ui components (button, dialog, slider, badge)
│   ├── hooks/
│   │   ├── useSpeechRecognition.ts # Browser STT hook
│   │   ├── useSpeechSynthesis.ts   # Browser TTS hook
│   │   ├── useIntakeSession.ts     # Wrapper for /intake mutations & store
│   │   └── useSummaryGeneration.ts # Wrapper for /summary queries
│   ├── lib/
│   │   ├── api.ts          # Axios / Fetch client connecting to :8000
│   │   ├── sound.ts        # Auditory feedback utilities
│   │   └── utils.ts        # Tailwind class merges & formatting helpers
│   ├── store/
│   │   ├── kioskStore.ts   # Session state, chat messages, current question
│   │   └── doctorStore.ts  # Active selected patient, triage queue, edit buffer
│   └── types/
│       ├── intake.ts       # TypeScript interfaces matching backend models/state.py
│       └── kiosk.ts        # UI specific state types
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 7. API Communication & Latency Mitigation Strategy

Because the backend uses an LLM pipeline with rate-limiting pauses (`_CALL_DELAY` 2.0s, sequential calls), requests to `POST /intake` may take between **2 to 5 seconds** per turn.

The frontend handles this smoothly to maintain a polished user experience:
1. **Optimistic Visual State:**
   - Immediately upon the patient submitting a response (via speech or touch chip), the message is appended to the chat stream with a subtle "recorded" checkmark.
2. **Empathetic AI Loading States:**
   - Rather than a plain spinning wheel, the kiosk displays rotating contextual medical feedback:
     - *"Analyzing your symptom details..."*
     - *"Cross-referencing clinical guidelines..."*
     - *"Preparing your next question..."*
3. **Audio Pre-buffering:**
   - As soon as `next_question` is received in the API response, TTS synthesis starts speaking within 100ms.
4. **Session Recovery:**
   - Active `session_id` and transcript are mirrored in `localStorage` so a screen refresh does not lose the patient's in-progress history.

---

## 8. Step-by-Step Implementation Roadmap

| Step | Milestone | Key Deliverables |
|---|---|---|
| **Phase 1** | **Project Setup & Base Types** | Initialize Next.js 14, Tailwind, shadcn/ui, TypeScript models matching `microservice/piplines/models/state.py`, API client configured to FastAPI (`http://localhost:8000`). |
| **Phase 2** | **Patient Kiosk UI Core** | Build `/kiosk` check-in screen, conversational turn-by-turn chat interface, response chip selector, and section progress stepper. |
| **Phase 3** | **Voice & Accessibility Layer** | Integrate Web Speech API (`useSpeechRecognition` for voice input, `useSpeechSynthesis` for auto question narration), high-contrast touch styling. |
| **Phase 4** | **Physician Dashboard Core** | Build `/doctor` with live patient queue, SOCRATES breakdown viewer, Red-Flag Alert Banner, and Pipeline 2 prose summary integration (`POST /summary`). |
| **Phase 5** | **Draft Note Editor & Actions** | Add editable clinical note drafting, "Approve & Sign", "Copy to EMR", and PDF print view. |
| **Phase 6** | **Jury Demo Mode & Polish** | Create `/demo` dual split-screen view with one-click test case loaders (Chest Pain Red Flag, Routine Diabetes, Pediatric Gastroenteritis) for hackathon presentation. |

---

## 9. Verification & Quality Acceptance Criteria

1. **Intake Continuity:** A user can complete a full 7-section interview from start to finish without getting stuck or losing state.
2. **Red-Flag Reactivity:** Answering with high-urgency symptoms (e.g. *"severe chest pain radiating to left arm with sweating"*) immediately flags `is_flagged: true`, triggers urgency badges in the doctor's view, and elevates the patient in the triage queue.
3. **Summary Accuracy:** Calling `POST /summary` on a completed state returns a coherent, formatted prose report matching all SOCRATES and history fields.
4. **Voice Fluency:** Tap-to-speak captures patient speech accurately in Chrome/Edge, fills the message input, and triggers the next conversational turn seamlessly.
5. **No Screen Lag:** UI remains responsive and provides calming feedback during the 2–4s backend LLM processing interval.
