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
import type { PatientHistoryState, RedFlagResult } from '@/types/intake';
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

  // Chat transcript
  messages: ChatMessage[];

  // Intake state from backend
  historyState: PatientHistoryState | null;
  currentQuestion: string | null;
  targetField: string | null;
  redFlag: RedFlagResult | null;
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
  setLoading: (loading: boolean) => void;
  toggleTTS: () => void;
  resetSession: () => void;
}

let tokenCounter = 1;

export const useKioskStore = create<KioskState>()(
  persist(
    (set, get) => ({
      step: 'checkin',
      patient: null,
      sessionId: null,
      tokenNumber: null,
      messages: [],
      historyState: null,
      currentQuestion: null,
      targetField: null,
      redFlag: null,
      isLoading: false,
      ttsEnabled: true,

      setStep: (step) => set({ step }),

      initSession: (registration) => {
        const sessionId = generateSessionId();
        const token = tokenCounter++;
        const emptyState = createEmptyPatientState(sessionId);
        set({
          patient: registration,
          sessionId,
          tokenNumber: token,
          messages: [],
          historyState: emptyState,
          currentQuestion: null,
          targetField: null,
          redFlag: null,
          step: 'intake',
        });
        return sessionId;
      },

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
          set({ step: 'complete' });
        }
      },

      setLoading: (loading) => set({ isLoading: loading }),

      toggleTTS: () => set((s) => ({ ttsEnabled: !s.ttsEnabled })),

      resetSession: () => {
        set({
          step: 'checkin',
          patient: null,
          sessionId: null,
          tokenNumber: null,
          messages: [],
          historyState: null,
          currentQuestion: null,
          targetField: null,
          redFlag: null,
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
        messages: state.messages,
        historyState: state.historyState,
        currentQuestion: state.currentQuestion,
        redFlag: state.redFlag,
        step: state.step,
        ttsEnabled: state.ttsEnabled,
      }),
    }
  )
);
