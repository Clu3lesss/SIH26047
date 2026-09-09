'use server';

/**
 * lib/actions/db.ts — Database Server Actions powered by Prisma & Supabase.
 *
 * Implements the 3-stage persistence architecture:
 * 1. Immediate Patient & Session creation at Check-in.
 * 2. Immediate Red-Flag triage row creation on detection.
 * 3. Full 7-section structured history save on interview completion.
 * 4. Physician approval save on consultation sign-off.
 *
 * Every action has comprehensive try/catch blocks that explain exactly
 * why an error happened without crashing the patient interview.
 */

import { prisma } from '@/lib/prisma';
import type { PatientRegistration, BiologicalSex } from '@/types/kiosk';
import type { PatientHistoryState, RedFlagResult, PhysicianSummary } from '@/types/intake';

export interface DbResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Formats Prisma / Postgres errors into simple human-readable explanations. */
function formatDbError(err: unknown, operation: string): string {
  if (err instanceof Error) {
    const msg = err.message;
    if (msg.includes('P1001') || msg.includes("Can't reach database server")) {
      return `Database offline / unreachable during ${operation}. Please verify Supabase network connection or IP pooler settings.`;
    }
    if (msg.includes('P2002')) {
      return `A record with this identifier already exists in Supabase during ${operation}.`;
    }
    if (msg.includes('P2003')) {
      return `Foreign key violation during ${operation}. Associated patient or session record was not found.`;
    }
    return `Database error during ${operation}: ${msg}`;
  }
  return `Unknown database error during ${operation}.`;
}

/**
 * 1. Check-in: Create Patient and OPD Session in Supabase.
 * Called immediately when the patient enters their details at the kiosk.
 */
export async function createPatientAndSession(
  registration: PatientRegistration,
  sessionId: string,
  tokenNumber: number
): Promise<DbResult<{ patientId: string; sessionId: string }>> {
  try {
    // 1. Create Patient record
    const patient = await prisma.patient.create({
      data: {
        name: registration.name.trim(),
        age: parseInt(registration.age, 10) || 0,
        sex: registration.sex,
        mobile: registration.mobile?.trim() || null,
        abhaId: registration.abhaId?.trim() || null,
        language: registration.language || 'en',
      },
    });

    // 2. Create Session linked to Patient
    const session = await prisma.session.create({
      data: {
        id: sessionId,
        patientId: patient.id,
        tokenNumber,
        status: 'in_progress',
        turnCount: 0,
      },
    });

    return {
      success: true,
      data: { patientId: patient.id, sessionId: session.id },
    };
  } catch (err) {
    const errorMsg = formatDbError(err, 'patient check-in');
    console.error('[Prisma Error]:', errorMsg, err);
    return { success: false, error: errorMsg };
  }
}

/**
 * 2. Emergency Alert: Save Red-Flag triage event IMMEDIATELY.
 * Called as soon as a red flag is detected on ANY turn (even turn 1 or 2).
 */
export async function saveRedFlagAlert(
  sessionId: string,
  redFlag: RedFlagResult
): Promise<DbResult> {
  if (!redFlag.is_flagged) return { success: true };

  try {
    await prisma.redFlag.create({
      data: {
        sessionId,
        isFlagged: true,
        urgencyTier: redFlag.urgency_tier,
        reason: redFlag.reason,
      },
    });
    return { success: true };
  } catch (err) {
    const errorMsg = formatDbError(err, 'saving red flag alert');
    console.error('[Prisma Error]:', errorMsg, err);
    return { success: false, error: errorMsg };
  }
}

/**
 * 3. Intake Finish: Save complete 7-section structured history and mark session completed.
 * Called when status === 'completed'.
 */
export async function saveCompletedHistory(
  sessionId: string,
  state: PatientHistoryState,
  summary?: PhysicianSummary | null
): Promise<DbResult> {
  try {
    // Upsert the HistorySummary
    await prisma.historySummary.upsert({
      where: { sessionId },
      create: {
        sessionId,
        structuredState: state as unknown as object,
        chiefComplaint: state.chief_complaint,
        allergies: state.allergies,
        medications: state.medications,
        conditions: state.conditions,
        proseSummary: summary ? (summary as unknown as object) : undefined,
      },
      update: {
        structuredState: state as unknown as object,
        chiefComplaint: state.chief_complaint,
        allergies: state.allergies,
        medications: state.medications,
        conditions: state.conditions,
        proseSummary: summary ? (summary as unknown as object) : undefined,
      },
    });

    // Update Session status
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        turnCount: state.turn_count,
        completedAt: new Date(),
      },
    });

    return { success: true };
  } catch (err) {
    const errorMsg = formatDbError(err, 'saving completed clinical history');
    console.error('[Prisma Error]:', errorMsg, err);
    return { success: false, error: errorMsg };
  }
}

/**
 * 4. Doctor Review: Save physician edits and approval sign-off.
 * Called when the doctor clicks "Approve & Sign" or edits notes.
 */
export async function savePhysicianApproval(
  sessionId: string,
  editedSummary: PhysicianSummary
): Promise<DbResult> {
  try {
    await prisma.historySummary.update({
      where: { sessionId },
      data: {
        physicianEdited: true,
        editedSummary: editedSummary as unknown as object,
        physicianApproved: true,
        approvedAt: new Date(),
      },
    });

    // Update session status to consulted
    await prisma.session.update({
      where: { id: sessionId },
      data: { status: 'consulted' },
    });

    return { success: true };
  } catch (err) {
    const errorMsg = formatDbError(err, 'saving physician consultation approval');
    console.error('[Prisma Error]:', errorMsg, err);
    return { success: false, error: errorMsg };
  }
}
