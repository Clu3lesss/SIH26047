/**
 * store/doctorStore.ts — Zustand store for the physician dashboard.
 *
 * Holds the OPD patient queue and per-patient summary state.
 * The queue is populated when patients complete their kiosk intake
 * (kioskStore.setIntakeResponse with status === 'completed' triggers
 * an enqueue via the useIntakeSession hook).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PatientHistoryState, PhysicianSummary, RedFlagResult } from '@/types/intake';
import type { QueueEntry } from '@/types/kiosk';

export interface UploadedDocItem {
  id: string;
  fileUrl: string;
  documentType: string;
  fileName: string;
  createdAt: string;
}

export interface PatientRecord {
  entry: QueueEntry;
  historyState: PatientHistoryState;
  summary: PhysicianSummary | null;
  summaryLoading: boolean;
  editedSummary: PhysicianSummary | null; // doctor's edited draft
  physicianApproved: boolean;
  documents?: UploadedDocItem[];
}

interface DoctorState {
  queue: PatientRecord[];
  selectedSessionId: string | null;
  redFlagAlerts: Array<{ sessionId: string; reason: string; tier: 'low' | 'medium' | 'high'; patientName?: string; tokenNumber?: number }>;
  isSyncing: boolean;
  lastSyncedAt: number | null;

  // Actions
  syncFromDb: (records: PatientRecord[], alerts: Array<{ sessionId: string; reason: string; tier: 'low' | 'medium' | 'high'; patientName?: string; tokenNumber?: number }>) => void;
  setSyncing: (syncing: boolean) => void;
  enqueuePatient: (
    entry: QueueEntry,
    state: PatientHistoryState,
    redFlag: RedFlagResult,
    documents?: UploadedDocItem[]
  ) => void;
  selectPatient: (sessionId: string) => void;
  setSummary: (sessionId: string, summary: PhysicianSummary) => void;
  setSummaryLoading: (sessionId: string, loading: boolean) => void;
  updateEditedSummary: (sessionId: string, section: keyof PhysicianSummary, value: string) => void;
  approveRecord: (sessionId: string) => void;
  markAttended: (sessionId: string, attended?: boolean) => void;
  dismissRedFlag: (sessionId: string) => void;
  getSelectedRecord: () => PatientRecord | null;
}

// Sort helper: Red-flag triage first (high > medium > low), then locked registration queue slot
function sortDoctorQueue(a: PatientRecord, b: PatientRecord): number {
  if (a.entry.isRedFlag && !b.entry.isRedFlag) return -1;
  if (!a.entry.isRedFlag && b.entry.isRedFlag) return 1;

  if (a.entry.isRedFlag && b.entry.isRedFlag) {
    const tierWeight = { high: 3, medium: 2, low: 1 };
    const weightA = a.entry.urgencyTier ? tierWeight[a.entry.urgencyTier] || 0 : 0;
    const weightB = b.entry.urgencyTier ? tierWeight[b.entry.urgencyTier] || 0 : 0;
    if (weightA !== weightB) return weightB - weightA;
  }

  const posA = a.entry.queuePosition || a.entry.tokenNumber || 0;
  const posB = b.entry.queuePosition || b.entry.tokenNumber || 0;
  if (posA !== posB) return posA - posB;

  return a.entry.arrivedAt - b.entry.arrivedAt;
}

export const useDoctorStore = create<DoctorState>()(
  persist(
    (set, get) => ({
      queue: [],
      selectedSessionId: null,
      redFlagAlerts: [],
      isSyncing: false,
      lastSyncedAt: null,

      syncFromDb: (records, alerts) => {
        set((s) => {
          // Map existing local records by sessionId so we never discard local summaries or edits
          const localRecordMap = new Map(s.queue.map((r) => [r.entry.sessionId, r]));

          // Merge each incoming DB record with local in-memory data
          const mergedDbRecords = records.map((dbRec) => {
            const localRec = localRecordMap.get(dbRec.entry.sessionId);
            if (!localRec) return dbRec;

            // Preserve local summary if DB doesn't have it yet, or if doctor edited it
            const activeSummary = localRec.summary || dbRec.summary;
            const activeEditedSummary = localRec.editedSummary || dbRec.editedSummary || activeSummary;
            const isApproved = localRec.physicianApproved || dbRec.physicianApproved;

            // Preserve documents if local has more or newly uploaded ones
            const localDocs = localRec.documents || [];
            const dbDocs = dbRec.documents || [];
            const docMap = new Map(dbDocs.map((d) => [d.id, d]));
            localDocs.forEach((d) => {
              if (!docMap.has(d.id)) docMap.set(d.id, d);
            });
            const mergedDocs = Array.from(docMap.values());

            return {
              ...dbRec,
              summary: activeSummary,
              editedSummary: activeEditedSummary,
              summaryLoading: localRec.summaryLoading, // keep loading state if in-flight
              physicianApproved: isApproved,
              documents: mergedDocs,
              entry: {
                ...dbRec.entry,
                isConsulted: dbRec.entry.isConsulted || isApproved,
                summaryLoaded: !!activeSummary,
                documentCount: mergedDocs.length,
              },
            };
          });

          // Identify in-memory / demo records that are not in DB yet
          const dbSessionIds = new Set(records.map((r) => r.entry.sessionId));
          const localOnlyRecords = s.queue.filter((r) => !dbSessionIds.has(r.entry.sessionId));

          // Combined queue: DB records + preserved local/demo records
          // Only show active, non-attended patients in the doctor's waiting queue
          const activeQueue = [...mergedDbRecords, ...localOnlyRecords].filter(
            (r) => !r.physicianApproved && !r.entry.isConsulted && !r.entry.attended
          );

          // Sort: red-flag triage first, then locked registration queue slot
          activeQueue.sort(sortDoctorQueue);

          // Filter out alerts for attended patients
          const activeSessionIds = new Set(activeQueue.map((r) => r.entry.sessionId));
          const dbAlertSessionIds = new Set(alerts.map((a) => a.sessionId));
          const localOnlyAlerts = s.redFlagAlerts.filter((a) => !dbAlertSessionIds.has(a.sessionId));
          const mergedAlerts = [...alerts, ...localOnlyAlerts].filter((a) => activeSessionIds.has(a.sessionId));

          const currentSelected = s.selectedSessionId;
          const stillExists = currentSelected && activeQueue.some((r) => r.entry.sessionId === currentSelected);
          const newSelected = stillExists
            ? currentSelected
            : activeQueue.length > 0
            ? activeQueue[0].entry.sessionId
            : null;

          return {
            queue: activeQueue,
            redFlagAlerts: mergedAlerts,
            selectedSessionId: newSelected,
            isSyncing: false,
            lastSyncedAt: Date.now(),
          };
        });
      },

      setSyncing: (syncing) => set({ isSyncing: syncing }),

  enqueuePatient: (entry, state, redFlag, documents) => {
    set((s) => {
      // Avoid duplicates
      const exists = s.queue.find((r) => r.entry.sessionId === entry.sessionId);
      if (exists) return s;

      const newRecord: PatientRecord = {
        entry: {
          ...entry,
          documentCount: documents ? documents.length : entry.documentCount || 0,
        },
        historyState: state,
        summary: null,
        summaryLoading: false,
        editedSummary: null,
        physicianApproved: false,
        documents: documents || [],
      };

      const newAlerts = redFlag.is_flagged && redFlag.urgency_tier
        ? [
            ...s.redFlagAlerts,
            {
              sessionId: entry.sessionId,
              reason: redFlag.reason ?? 'Possible clinical emergency',
              tier: redFlag.urgency_tier,
            },
          ]
        : s.redFlagAlerts;

      // Sort: red-flag triage first, then locked registration queue slot
      const newQueue = [...s.queue, newRecord].sort(sortDoctorQueue);

      return { queue: newQueue, redFlagAlerts: newAlerts };
    });
  },

  selectPatient: (sessionId) => set({ selectedSessionId: sessionId }),

  setSummary: (sessionId, summary) => {
    set((s) => ({
      queue: s.queue.map((r) =>
        r.entry.sessionId === sessionId
          ? { ...r, summary, summaryLoading: false, editedSummary: { ...summary } }
          : r
      ),
    }));
  },

  setSummaryLoading: (sessionId, loading) => {
    set((s) => ({
      queue: s.queue.map((r) =>
        r.entry.sessionId === sessionId ? { ...r, summaryLoading: loading } : r
      ),
    }));
  },

  updateEditedSummary: (sessionId, section, value) => {
    set((s) => ({
      queue: s.queue.map((r) => {
        if (r.entry.sessionId !== sessionId || !r.editedSummary) return r;
        return { ...r, editedSummary: { ...r.editedSummary, [section]: value } };
      }),
    }));
  },

  approveRecord: (sessionId) => {
    set((s) => {
      const remainingQueue = s.queue.filter((r) => r.entry.sessionId !== sessionId);
      const remainingAlerts = s.redFlagAlerts.filter((a) => a.sessionId !== sessionId);
      const nextSelected = remainingQueue.length > 0 ? remainingQueue[0].entry.sessionId : null;
      return {
        queue: remainingQueue,
        redFlagAlerts: remainingAlerts,
        selectedSessionId: s.selectedSessionId === sessionId ? nextSelected : s.selectedSessionId,
      };
    });
  },

  markAttended: (sessionId) => {
    set((s) => {
      const remainingQueue = s.queue.filter((r) => r.entry.sessionId !== sessionId);
      const remainingAlerts = s.redFlagAlerts.filter((a) => a.sessionId !== sessionId);
      const nextSelected = remainingQueue.length > 0 ? remainingQueue[0].entry.sessionId : null;
      return {
        queue: remainingQueue,
        redFlagAlerts: remainingAlerts,
        selectedSessionId: s.selectedSessionId === sessionId ? nextSelected : s.selectedSessionId,
      };
    });
  },

  dismissRedFlag: (sessionId) => {
    set((s) => ({
      redFlagAlerts: s.redFlagAlerts.filter((a) => a.sessionId !== sessionId),
    }));
  },

  getSelectedRecord: () => {
    const { queue, selectedSessionId } = get();
    return queue.find((r) => r.entry.sessionId === selectedSessionId) ?? null;
  },
    }),
    {
      name: 'medikiosk-doctor-session',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? window.sessionStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
      ),
      partialize: (state) => ({
        queue: state.queue,
        selectedSessionId: state.selectedSessionId,
        redFlagAlerts: state.redFlagAlerts,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);
