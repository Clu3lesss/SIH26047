'use client';

/**
 * hooks/useIntakeSession.ts — TanStack Query mutation hook for Pipeline 1.
 *
 * Wraps postIntakeTurn() and wires the response directly into kioskStore,
 * doctorStore, and persists red flags and completed state into Supabase.
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { postIntakeTurn } from '@/lib/api';
import { useKioskStore } from '@/store/kioskStore';
import { useDoctorStore } from '@/store/doctorStore';
import { saveRedFlagAlert, saveCompletedHistory } from '@/lib/actions/db';
import type { QueueEntry } from '@/types/kiosk';

export function useIntakeSession() {
  const {
    sessionId,
    patient,
    tokenNumber,
    addPatientMessage,
    addAIMessage,
    setIntakeResponse,
    setLoading,
  } = useKioskStore();

  const { enqueuePatient } = useDoctorStore();
  const [lastMessage, setLastMessage] = useState<string>('');

  const mutation = useMutation({
    mutationFn: (message: string) => {
      if (!sessionId) throw new Error('No active session. Please start from check-in.');
      return postIntakeTurn({ session_id: sessionId, message });
    },

    onMutate: (message) => {
      setLastMessage(message);
      addPatientMessage(message);
      setLoading(true);
    },

    onSuccess: (response) => {
      setIntakeResponse({
        state: response.state,
        next_question: response.next_question,
        red_flag: response.red_flag,
        target_field: response.target_field,
      });

      // 1. IMMEDIATE DB WRITE: Save red-flag row if clinical risk detected
      if (response.red_flag.is_flagged && sessionId) {
        saveRedFlagAlert(sessionId, response.red_flag).then((res) => {
          if (!res.success) {
            console.warn('[Supabase Notice]:', res.error);
          }
        });
      }

      // Add AI question to chat transcript
      if (response.next_question) {
        addAIMessage(response.next_question);
      }

      // 2. FINAL DB WRITE: When intake completes → save full state & enqueue
      if (response.state.status === 'completed' && patient && sessionId) {
        saveCompletedHistory(sessionId, response.state).then((res) => {
          if (!res.success) {
            console.warn('[Supabase Notice]:', res.error);
          }
        });

        const entry: QueueEntry = {
          sessionId,
          tokenNumber: tokenNumber ?? 0,
          patientName: patient.name,
          age: patient.age,
          sex: patient.sex,
          arrivedAt: Date.now(),
          isRedFlag: response.red_flag.is_flagged,
          urgencyTier: response.red_flag.urgency_tier,
          redFlagReason: response.red_flag.reason,
          isCompleted: true,
          summaryLoaded: false,
        };
        enqueuePatient(entry, response.state, response.red_flag);
      }
    },

    onError: (error) => {
      setLoading(false);
      console.error('[Intake Error]:', error);
    },
  });

  /**
   * Submit a patient message to the intake pipeline.
   * Handles loading state and store updates automatically.
   */
  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || mutation.isPending) return;
    mutation.mutate(trimmed);
  };

  /** Retry the last failed message with 1 click */
  const retryLastMessage = () => {
    if (lastMessage && !mutation.isPending) {
      mutation.mutate(lastMessage);
    }
  };

  return {
    sendMessage,
    retryLastMessage,
    lastMessage,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
