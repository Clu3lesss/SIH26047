/**
 * kiosk.ts — UI-only types used by the patient kiosk interface.
 * These are not related to backend API contracts.
 */

// ---------------------------------------------------------------------------
// Kiosk multi-step flow
// ---------------------------------------------------------------------------

export type KioskStep = 'checkin' | 'intake' | 'scan' | 'complete';

// ---------------------------------------------------------------------------
// Chat transcript
// ---------------------------------------------------------------------------

export type MessageRole = 'ai' | 'patient';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Voice input state machine
// ---------------------------------------------------------------------------

export type VoiceState = 'idle' | 'listening' | 'processing';

// ---------------------------------------------------------------------------
// Smart response chips
// ---------------------------------------------------------------------------

export interface SmartChip {
  label: string;
  value: string;
}

// ---------------------------------------------------------------------------
// Clinical section progress (for the 7-section stepper)
// ---------------------------------------------------------------------------

export interface ClinicalSection {
  id: string;
  label: string;
  icon: string;
  isComplete: boolean;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Patient registration (Step 1 form data)
// ---------------------------------------------------------------------------

export type BiologicalSex = 'male' | 'female' | 'other';
export type Language = 'en' | 'hi';

export interface PatientRegistration {
  name: string;
  age: string;
  sex: BiologicalSex;
  mobile: string;
  abhaId: string;
  language: Language;
}

// ---------------------------------------------------------------------------
// Doctor queue entry (enriched patient record for /doctor view)
// ---------------------------------------------------------------------------

export interface QueueEntry {
  sessionId: string;
  tokenNumber: number;
  patientName: string;
  age: string;
  sex: BiologicalSex;
  arrivedAt: number; // timestamp
  isRedFlag: boolean;
  urgencyTier: 'low' | 'medium' | 'high' | null;
  redFlagReason: string | null;
  isCompleted: boolean;
  summaryLoaded: boolean;
}

// ---------------------------------------------------------------------------
// Demo scenarios
// ---------------------------------------------------------------------------

export interface DemoScenario {
  id: string;
  label: string;
  description: string;
  urgencyTier: 'low' | 'medium' | 'high';
  initialMessages: string[]; // Pre-canned patient responses to replay
}
