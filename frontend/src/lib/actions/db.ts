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
 * Auto-assigns the next token number from the database if tokenNumber <= 0.
 */
export async function createPatientAndSession(
  registration: PatientRegistration,
  sessionId: string,
  tokenNumber: number
): Promise<DbResult<{ patientId: string; sessionId: string; assignedToken: number; queuePosition?: number }>> {
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

    // Auto-calculate next token number and queue position from database to guarantee continuous registration order
    let finalToken = tokenNumber;
    let finalPosition = 1;

    const maxSession = await (prisma.session as any).findFirst({
      orderBy: { tokenNumber: 'desc' },
      select: { tokenNumber: true, queuePosition: true },
    });

    if (maxSession) {
      finalToken = (maxSession.tokenNumber || 0) + 1;
      finalPosition = (maxSession.queuePosition || maxSession.tokenNumber || 0) + 1;
    } else if (tokenNumber > 0) {
      finalToken = tokenNumber;
      finalPosition = tokenNumber;
    }

    // 15-minute start window for no-show tracking: must start turn 1 within 15 minutes of registration
    const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // 2. Create Session linked to Patient with LOCKED queue position from moment of registration
    const session = await (prisma.session as any).create({
      data: {
        id: sessionId,
        patientId: patient.id,
        tokenNumber: finalToken,
        queuePosition: finalPosition,
        status: 'in_progress',
        turnCount: 0,
        tokenExpiresAt,
      },
    });

    return {
      success: true,
      data: {
        patientId: patient.id,
        sessionId: session.id,
        assignedToken: finalToken,
        queuePosition: finalPosition,
      },
    };
  } catch (err) {
    const errorMsg = formatDbError(err, 'patient check-in');
    console.error('[Prisma Error]:', errorMsg, err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Helper: Query highest token number currently stored in Supabase.
 */
export async function getNextTokenNumber(): Promise<number> {
  try {
    const maxSession = await prisma.session.findFirst({
      orderBy: { tokenNumber: 'desc' },
      select: { tokenNumber: true },
    });
    return (maxSession?.tokenNumber || 0) + 1;
  } catch {
    return 1;
  }
}

/**
 * Record that the patient has actively started the interview (turn 1 sent).
 * Disarms no-show expiry permanently without touching queue position.
 */
export async function recordTurnStarted(sessionId: string, turnCount: number): Promise<DbResult> {
  try {
    const existing = await (prisma.session as any).findUnique({
      where: { id: sessionId },
      select: { startedAt: true },
    });

    await (prisma.session as any).update({
      where: { id: sessionId },
      data: {
        turnCount,
        startedAt: existing?.startedAt ? undefined : new Date(),
      },
    });

    return { success: true };
  } catch (err) {
    // Non-blocking notice
    console.warn('[Turn start tracking notice]:', err);
    return { success: false };
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
    // Ensure parent session exists first so foreign key constraint is never violated
    await prisma.session.upsert({
      where: { id: sessionId },
      update: {},
      create: {
        id: sessionId,
        tokenNumber: 0,
        status: 'in_progress',
      },
    });

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
    // Ensure parent Session exists and update status to completed
    await prisma.session.upsert({
      where: { id: sessionId },
      update: {
        status: 'completed',
        turnCount: state.turn_count,
        completedAt: new Date(),
      },
      create: {
        id: sessionId,
        tokenNumber: 0,
        status: 'completed',
        turnCount: state.turn_count,
        completedAt: new Date(),
      },
    });

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

    // Update session status to consulted and attended to true
    await prisma.session.update({
      where: { id: sessionId },
      data: { status: 'consulted', attended: true },
    });

    return { success: true };
  } catch (err) {
    const errorMsg = formatDbError(err, 'saving physician consultation approval');
    console.error('[Prisma Error]:', errorMsg, err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Mark patient session as attended / consulted directly from doctor dashboard.
 */
export async function markSessionAttended(sessionId: string): Promise<DbResult> {
  try {
    await prisma.session.update({
      where: { id: sessionId },
      data: { status: 'consulted', attended: true },
    });

    await prisma.historySummary.upsert({
      where: { sessionId },
      update: { physicianApproved: true, approvedAt: new Date() },
      create: {
        sessionId,
        structuredState: {},
        physicianApproved: true,
        approvedAt: new Date(),
      },
    });

    return { success: true };
  } catch (err) {
    const errorMsg = formatDbError(err, 'marking patient attended');
    console.error('[Prisma Error]:', errorMsg, err);
    return { success: false, error: errorMsg };
  }
}

/**
 * 5. Document Persistence: Save patient uploaded prescription or lab report to Supabase.
 */
export async function saveUploadedDocument(
  sessionId: string,
  fileUrl: string,
  fileName: string = 'Document',
  documentType: string = 'prescription'
): Promise<DbResult<{ documentId: string }>> {
  try {
    // Ensure parent session exists
    await prisma.session.upsert({
      where: { id: sessionId },
      update: {},
      create: {
        id: sessionId,
        tokenNumber: 0,
        status: 'in_progress',
      },
    });

    const doc = await prisma.document.create({
      data: {
        sessionId,
        fileUrl,
        documentType,
        ocrRawText: fileName,
      },
    });

    return { success: true, data: { documentId: doc.id } };
  } catch (err) {
    const errorMsg = formatDbError(err, 'saving uploaded document');
    console.error('[Prisma Error]:', errorMsg, err);
    return { success: false, error: errorMsg };
  }
}

export interface DbDoctorQueueData {
  records: Array<{
    entry: {
      sessionId: string;
      tokenNumber: number;
      patientName: string;
      age: string;
      sex: BiologicalSex;
      arrivedAt: number;
      isRedFlag: boolean;
      urgencyTier: 'low' | 'medium' | 'high' | null;
      redFlagReason: string | null;
      isCompleted: boolean;
      summaryLoaded: boolean;
      documentCount: number;
    };
    historyState: PatientHistoryState;
    summary: PhysicianSummary | null;
    summaryLoading: boolean;
    editedSummary: PhysicianSummary | null;
    physicianApproved: boolean;
    documents: Array<{
      id: string;
      fileUrl: string;
      documentType: string;
      fileName: string;
      createdAt: string;
    }>;
  }>;
  redFlagAlerts: Array<{
    sessionId: string;
    reason: string;
    tier: 'low' | 'medium' | 'high';
    patientName: string;
    tokenNumber: number;
  }>;
}

/**
 * 6. Doctor Dashboard Sync: Fetch all real patient records, red-flags, and documents from Supabase.
 * Powers the real-time Doctor Station across tabs, refreshes, and devices.
 */
export async function getDoctorQueueFromDb(): Promise<DbResult<DbDoctorQueueData>> {
  try {
    // 1. NO-SHOW HANDLING: Expire sessions where patient registered > 15 mins ago and NEVER started turn 1
    // (Does NOT expire active patients who take long on interview)
    try {
      await (prisma.session as any).updateMany({
        where: {
          status: 'in_progress',
          turnCount: 0,
          startedAt: null,
          tokenExpiresAt: { lt: new Date() },
          attended: false,
        },
        data: {
          status: 'expired',
        },
      });
    } catch (expireErr) {
      console.warn('[No-show check notice]:', expireErr);
    }

    // 2. Query all active, non-attended, non-expired sessions
    const sessions = await prisma.session.findMany({
      where: {
        attended: false,
        status: { not: 'expired' },
      },
      include: {
        patient: true,
        redFlags: {
          orderBy: { flaggedAt: 'desc' },
        },
        history: true,
        documents: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    const redFlagAlerts: DbDoctorQueueData['redFlagAlerts'] = [];

    const records = sessions.map((s) => {
      // Find active (non-dismissed) red flags
      const activeFlag = s.redFlags.find((rf) => rf.isFlagged && !rf.dismissed);
      const isRedFlag = !!activeFlag;
      const urgencyTier = (activeFlag?.urgencyTier as 'low' | 'medium' | 'high') || null;
      const redFlagReason = activeFlag?.reason || null;

      if (activeFlag && urgencyTier) {
        redFlagAlerts.push({
          sessionId: s.id,
          reason: redFlagReason || 'Clinical triage risk',
          tier: urgencyTier,
          patientName: s.patient?.name || 'Walk-in Patient',
          tokenNumber: s.tokenNumber || 0,
        });
      }

      // Parse history state or fallback
      let parsedHistory: PatientHistoryState;
      if (s.history?.structuredState) {
        parsedHistory = s.history.structuredState as unknown as PatientHistoryState;
      } else {
        parsedHistory = {
          session_id: s.id,
          turn_count: s.turnCount,
          status: s.status === 'completed' || s.status === 'consulted' ? 'completed' : 'in_progress',
          chief_complaint: s.history?.chiefComplaint || null,
          hpi: {
            site: null, onset: null, character: null, radiation: null,
            associated_symptoms: [], timing: null,
            exacerbating_factors: [], relieving_factors: [], severity: null,
          },
          conditions: s.history?.conditions || [],
          conditions_asked: (s.history?.conditions?.length ?? 0) > 0,
          surgeries: [],
          surgeries_asked: false,
          medications: s.history?.medications || [],
          medications_asked: (s.history?.medications?.length ?? 0) > 0,
          allergies: s.history?.allergies || [],
          allergies_asked: (s.history?.allergies?.length ?? 0) > 0,
          family_history: [],
          family_history_asked: false,
          social_history: { diet: null, smoking: null, alcohol: null, occupation: null, living_situation: null },
          social_history_asked: false,
          review_of_systems: { cardiovascular: null, respiratory: null, gastrointestinal: null, neurological: null, musculoskeletal: null },
          review_of_systems_asked: false,
          asked_fields: [],
          last_target_field: null,
        };
      }

      const summary = (s.history?.proseSummary as unknown as PhysicianSummary) || null;
      const editedSummary = (s.history?.editedSummary as unknown as PhysicianSummary) || summary;
      const physicianApproved = s.history?.physicianApproved || false;

      const documents = s.documents.map((d) => ({
        id: d.id,
        fileUrl: d.fileUrl,
        documentType: d.documentType,
        fileName: d.ocrRawText || 'Uploaded Document',
        createdAt: d.createdAt.toISOString(),
      }));

      return {
        entry: {
          sessionId: s.id,
          tokenNumber: s.tokenNumber || 0,
          queuePosition: (s as any).queuePosition || s.tokenNumber || 0,
          patientName: s.patient?.name || 'Walk-in Patient',
          age: s.patient?.age ? String(s.patient.age) : '—',
          sex: (s.patient?.sex as BiologicalSex) || 'other',
          arrivedAt: new Date(s.createdAt).getTime(),
          isRedFlag,
          urgencyTier,
          redFlagReason,
          isCompleted: s.status === 'completed' || s.status === 'consulted',
          isConsulted: s.status === 'consulted' || physicianApproved,
          attended: s.attended || s.status === 'consulted' || physicianApproved,
          turnCount: s.turnCount,
          startedAt: (s as any).startedAt ? new Date((s as any).startedAt).getTime() : null,
          tokenExpiresAt: (s as any).tokenExpiresAt ? new Date((s as any).tokenExpiresAt).getTime() : null,
          summaryLoaded: !!summary,
          documentCount: documents.length,
        },
        historyState: parsedHistory,
        summary,
        summaryLoading: false,
        editedSummary,
        physicianApproved,
        documents,
      };
    });

    // Sort: Red-flag triage first (high > medium > low), then locked queuePosition ascending
    const tierWeight = { high: 3, medium: 2, low: 1 };
    records.sort((a, b) => {
      // 1. Red-flagged patients are prioritized to top
      if (a.entry.isRedFlag && !b.entry.isRedFlag) return -1;
      if (!a.entry.isRedFlag && b.entry.isRedFlag) return 1;

      // If both are red-flagged, compare urgency tiers
      if (a.entry.isRedFlag && b.entry.isRedFlag) {
        const weightA = a.entry.urgencyTier ? tierWeight[a.entry.urgencyTier] || 0 : 0;
        const weightB = b.entry.urgencyTier ? tierWeight[b.entry.urgencyTier] || 0 : 0;
        if (weightA !== weightB) return weightB - weightA;
      }

      // 2. Otherwise strictly sorted by registration queue position (NEVER by interview speed)
      const posA = a.entry.queuePosition || a.entry.tokenNumber || 0;
      const posB = b.entry.queuePosition || b.entry.tokenNumber || 0;
      if (posA !== posB) return posA - posB;

      return a.entry.arrivedAt - b.entry.arrivedAt;
    });

    return {
      success: true,
      data: {
        records,
        redFlagAlerts,
      },
    };
  } catch (err) {
    const errorMsg = formatDbError(err, 'fetching doctor patient queue');
    console.error('[Prisma Error]:', errorMsg, err);
    return { success: false, error: errorMsg };
  }
}

