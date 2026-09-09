/**
 * intake.ts — TypeScript interfaces that precisely mirror the Python Pydantic
 * schemas defined in microservice/piplines/models/state.py.
 *
 * These are the data contracts between the FastAPI backend and the Next.js frontend.
 * Keep in sync with state.py when the backend schema changes.
 */

// ---------------------------------------------------------------------------
// Sub-schemas (mirrors HPI, FamilyHistoryEntry, SocialHistory, ReviewOfSystems)
// ---------------------------------------------------------------------------

export interface HPI {
  site: string | null;
  onset: string | null;
  character: string | null;
  radiation: string | null;
  associated_symptoms: string[];
  timing: string | null;
  exacerbating_factors: string[];
  relieving_factors: string[];
  severity: string | null;
}

export interface FamilyHistoryEntry {
  relation: string;
  condition: string;
}

export interface SocialHistory {
  diet: string | null;
  smoking: string | null;
  alcohol: string | null;
  occupation: string | null;
  living_situation: string | null;
}

export interface ReviewOfSystems {
  cardiovascular: string | null;
  respiratory: string | null;
  gastrointestinal: string | null;
  neurological: string | null;
  musculoskeletal: string | null;
}

// ---------------------------------------------------------------------------
// Central patient history state (mirrors PatientHistoryState)
// ---------------------------------------------------------------------------

export interface PatientHistoryState {
  // Session metadata
  session_id: string;
  turn_count: number;
  status: 'in_progress' | 'completed';

  // Chief complaint
  chief_complaint: string | null;

  // History of Present Illness (SOCRATES)
  hpi: HPI;

  // Past Medical History
  conditions: string[];
  conditions_asked: boolean;

  // Past Surgical History
  surgeries: string[];
  surgeries_asked: boolean;

  // Drug History
  medications: string[];
  medications_asked: boolean;

  // Allergy History
  allergies: string[];
  allergies_asked: boolean;

  // Family History
  family_history: FamilyHistoryEntry[];
  family_history_asked: boolean;

  // Personal / Social History
  social_history: SocialHistory;
  social_history_asked: boolean;

  // Review of Systems
  review_of_systems: ReviewOfSystems;
  review_of_systems_asked: boolean;
}

// ---------------------------------------------------------------------------
// Red-flag schema (mirrors RedFlagResult)
// ---------------------------------------------------------------------------

export interface RedFlagResult {
  is_flagged: boolean;
  reason: string | null;
  urgency_tier: 'low' | 'medium' | 'high' | null;
}

// ---------------------------------------------------------------------------
// Pipeline 1 — API request / response (mirrors IntakeRequest / IntakeResponse)
// ---------------------------------------------------------------------------

export interface IntakeRequest {
  session_id: string;
  message: string;
}

export interface IntakeResponse {
  status: 'in_progress' | 'completed';
  state: PatientHistoryState;
  next_question: string | null;
  red_flag: RedFlagResult;
  target_field?: string | null;
}

// ---------------------------------------------------------------------------
// Pipeline 2 — Summary schemas (mirrors PhysicianSummary / SummaryResponse)
// ---------------------------------------------------------------------------

export interface PhysicianSummary {
  chief_complaint: string;
  history_of_present_illness: string;
  past_medical_history: string;
  past_surgical_history: string;
  medications: string;
  allergies: string;
  family_history: string;
  social_history: string;
  review_of_systems: string;
}

export interface SummaryRequest {
  state: PatientHistoryState;
}

export interface SummaryResponse {
  summary: PhysicianSummary;
}

// ---------------------------------------------------------------------------
// Default / empty factory functions
// ---------------------------------------------------------------------------

export function createEmptyHPI(): HPI {
  return {
    site: null, onset: null, character: null, radiation: null,
    associated_symptoms: [], timing: null,
    exacerbating_factors: [], relieving_factors: [], severity: null,
  };
}

export function createEmptyPatientState(session_id: string): PatientHistoryState {
  return {
    session_id,
    turn_count: 0,
    status: 'in_progress',
    chief_complaint: null,
    hpi: createEmptyHPI(),
    conditions: [], conditions_asked: false,
    surgeries: [], surgeries_asked: false,
    medications: [], medications_asked: false,
    allergies: [], allergies_asked: false,
    family_history: [], family_history_asked: false,
    social_history: { diet: null, smoking: null, alcohol: null, occupation: null, living_situation: null },
    social_history_asked: false,
    review_of_systems: { cardiovascular: null, respiratory: null, gastrointestinal: null, neurological: null, musculoskeletal: null },
    review_of_systems_asked: false,
  };
}
