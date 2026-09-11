/**
 * store/kioskStore.ts — Zustand store for the patient-facing kiosk.
 *
 * Holds all state for the active patient session:
 * - Patient registration data
 * - Chat message transcript
 * - Current intake state from backend
 * - Red-flag results
 * - Step navigation
 *
 * State is mirrored to sessionStorage for basic refresh recovery.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PatientHistoryState, RedFlagResult, PhysicianSummary } from '@/types/intake';
import type { ChatMessage, KioskStep, PatientRegistration } from '@/types/kiosk';
import { generateMessageId, generateSessionId } from '@/lib/utils';
import { createEmptyPatientState } from '@/types/intake';

interface KioskState {
  // Step
  step: KioskStep;
  setStep: (step: KioskStep) => void;

  // Patient registration
  patient: PatientRegistration | null;
  sessionId: string | null;
  tokenNumber: number | null;
  queuePosition: number | null;
  tokenStatus: 'provisional' | 'confirmed' | null;

  // Chat transcript
  messages: ChatMessage[];

  // Intake state from backend
  historyState: PatientHistoryState | null;
  currentQuestion: string | null;
  targetField: string | null;
  redFlag: RedFlagResult | null;
  generatedSummary: PhysicianSummary | null;
  isLoading: boolean;
  ttsEnabled: boolean;

  // Actions
  initSession: (registration: PatientRegistration) => string;
  addAIMessage: (text: string) => void;
  addPatientMessage: (text: string) => void;
  setIntakeResponse: (response: {
    state: PatientHistoryState;
    next_question: string | null;
    red_flag: RedFlagResult;
    target_field?: string | null;
  }) => void;
  setTokenNumber: (token: number) => void;
  setQueuePosition: (pos: number) => void;
  setTokenStatus: (status: 'provisional' | 'confirmed') => void;
  setGeneratedSummary: (summary: PhysicianSummary) => void;
  setLoading: (loading: boolean) => void;
  toggleTTS: () => void;
  resetSession: () => void;
}


// Token counter — persisted in localStorage so it survives page refresh.
// Falls back to 1 if localStorage is unavailable (SSR / first visit).
function getStoredTokenCounter(): number {
  if (typeof window === 'undefined') return 1;
  const stored = window.localStorage.getItem('medikiosk_token_counter');
  return stored ? parseInt(stored, 10) : 1;
}

function incrementTokenCounter(): number {
  const current = getStoredTokenCounter();
  const next = current + 1;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('medikiosk_token_counter', String(next));
  }
  return current;
}

export function syncTokenCounterWithDb(dbMaxToken: number) {
  if (typeof window === 'undefined') return;
  const current = getStoredTokenCounter();
  if (dbMaxToken >= current) {
    window.localStorage.setItem('medikiosk_token_counter', String(dbMaxToken + 1));
  }
}

// Initialise the counter once on module load
if (typeof window !== 'undefined') {
  const stored = window.localStorage.getItem('medikiosk_token_counter');
  if (!stored) window.localStorage.setItem('medikiosk_token_counter', '1');
}

export const useKioskStore = create<KioskState>()(
  persist(
    (set, get) => ({
      step: 'checkin',
      patient: null,
      sessionId: null,
      tokenNumber: null,
      queuePosition: null,
      tokenStatus: null,
      messages: [],
      historyState: null,
      currentQuestion: null,
      targetField: null,
      redFlag: null,
      generatedSummary: null,
      isLoading: false,
      ttsEnabled: true,

      setStep: (step) => set({ step }),

      initSession: (registration) => {
        const sessionId = generateSessionId();
        const token = incrementTokenCounter();
        const emptyState = createEmptyPatientState(sessionId);
        if (registration.department) {
          emptyState.department = registration.department;
        }
        set({
          patient: registration,
          sessionId,
          tokenNumber: token,
          queuePosition: token,
          tokenStatus: 'confirmed',
          messages: [],
          historyState: emptyState,
          currentQuestion: null,
          targetField: null,
          redFlag: null,
          generatedSummary: null,
          step: 'intake',
        });
        return sessionId;
      },

      setTokenNumber: (tokenNumber) => set({ tokenNumber }),
      setQueuePosition: (queuePosition) => set({ queuePosition }),
      setTokenStatus: (tokenStatus) => set({ tokenStatus }),

      addAIMessage: (text) => {
        set((s) => ({
          messages: [
            ...s.messages,
            { id: generateMessageId(), role: 'ai', text, timestamp: Date.now() },
          ],
        }));
      },

      addPatientMessage: (text) => {
        set((s) => ({
          messages: [
            ...s.messages,
            { id: generateMessageId(), role: 'patient', text, timestamp: Date.now() },
          ],
        }));
      },

      setIntakeResponse: ({ state, next_question, red_flag, target_field }) => {
        set({
          historyState: state,
          currentQuestion: next_question,
          targetField: target_field ?? null,
          redFlag: red_flag,
          isLoading: false,
        });
        if (state.status === 'completed') {
          // Intake finished -> Token is now confirmed, and proceed to doc upload
          set({ step: 'scan', tokenStatus: 'confirmed' });
        }
      },

      setGeneratedSummary: (summary) => set({ generatedSummary: summary }),

      setLoading: (loading) => set({ isLoading: loading }),

      toggleTTS: () => set((s) => ({ ttsEnabled: !s.ttsEnabled })),

      resetSession: () => {
        set({
          step: 'checkin',
          patient: null,
          sessionId: null,
          tokenNumber: null,
          queuePosition: null,
          tokenStatus: null,
          messages: [],
          historyState: null,
          currentQuestion: null,
          targetField: null,
          redFlag: null,
          generatedSummary: null,
          isLoading: false,
        });
      },
    }),
    {
      name: 'medikiosk-kiosk-session',
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
        patient: state.patient,
        sessionId: state.sessionId,
        tokenNumber: state.tokenNumber,
        queuePosition: state.queuePosition,
        tokenStatus: state.tokenStatus,
        messages: state.messages,
        historyState: state.historyState,
        currentQuestion: state.currentQuestion,
        redFlag: state.redFlag,
        generatedSummary: state.generatedSummary,
        step: state.step,
        ttsEnabled: state.ttsEnabled,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // If no active patient is registered or past session completed, reset to clean checkin
          if (!state.patient || !state.sessionId || state.historyState?.status === 'completed') {
            state.step = 'checkin';
            state.patient = null;
            state.sessionId = null;
            state.tokenNumber = null;
            state.queuePosition = null;
            state.tokenStatus = null;
            state.historyState = null;
            state.messages = [];
            state.generatedSummary = null;
          }
        }
      },
    }
  )
);
