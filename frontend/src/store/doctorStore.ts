/**
 * store/doctorStore.ts — Zustand store for the physician dashboard.
 *
 * Holds the OPD patient queue and per-patient summary state.
 * The queue is populated when patients complete their kiosk intake
 * (kioskStore.setIntakeResponse with status === 'completed' triggers
 * an enqueue via the useIntakeSession hook).
 */

import { create } from 'zustand';
import type { PatientHistoryState, PhysicianSummary, RedFlagResult } from '@/types/intake';
import type { QueueEntry } from '@/types/kiosk';

interface PatientRecord {
  entry: QueueEntry;
  historyState: PatientHistoryState;
  summary: PhysicianSummary | null;
  summaryLoading: boolean;
  editedSummary: PhysicianSummary | null; // doctor's edited draft
  physicianApproved: boolean;
}

interface DoctorState {
  queue: PatientRecord[];
  selectedSessionId: string | null;
  redFlagAlerts: Array<{ sessionId: string; reason: string; tier: 'low' | 'medium' | 'high' }>;

  // Actions
  enqueuePatient: (
    entry: QueueEntry,
    state: PatientHistoryState,
    redFlag: RedFlagResult
  ) => void;
  selectPatient: (sessionId: string) => void;
  setSummary: (sessionId: string, summary: PhysicianSummary) => void;
  setSummaryLoading: (sessionId: string, loading: boolean) => void;
  updateEditedSummary: (sessionId: string, section: keyof PhysicianSummary, value: string) => void;
  approveRecord: (sessionId: string) => void;
  dismissRedFlag: (sessionId: string) => void;
  getSelectedRecord: () => PatientRecord | null;
}

export const useDoctorStore = create<DoctorState>()((set, get) => ({
  queue: [],
  selectedSessionId: null,
  redFlagAlerts: [],

  enqueuePatient: (entry, state, redFlag) => {
    set((s) => {
      // Avoid duplicates
      const exists = s.queue.find((r) => r.entry.sessionId === entry.sessionId);
      if (exists) return s;

      const newRecord: PatientRecord = {
        entry,
        historyState: state,
        summary: null,
        summaryLoading: false,
        editedSummary: null,
        physicianApproved: false,
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

      // Sort: red-flag patients first, then by arrival
      const newQueue = [...s.queue, newRecord].sort((a, b) => {
        if (a.entry.isRedFlag && !b.entry.isRedFlag) return -1;
        if (!a.entry.isRedFlag && b.entry.isRedFlag) return 1;
        return a.entry.arrivedAt - b.entry.arrivedAt;
      });

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
    set((s) => ({
      queue: s.queue.map((r) =>
        r.entry.sessionId === sessionId ? { ...r, physicianApproved: true } : r
      ),
    }));
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
}));
