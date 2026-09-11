'use client';

/**
 * hooks/useIntakeSession.ts — TanStack Query mutation hook for Pipeline 1.
 *
 * Wraps postIntakeTurn() and wires the response directly into kioskStore,
 * doctorStore, and persists red flags and completed state into Supabase.
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { postIntakeTurn, postSummary } from '@/lib/api';
import { useKioskStore } from '@/store/kioskStore';
import { useDoctorStore } from '@/store/doctorStore';
import { saveRedFlagAlert, saveCompletedHistory, recordTurnStarted } from '@/lib/actions/db';
import type { QueueEntry } from '@/types/kiosk';

export function useIntakeSession() {
  const {
    sessionId,
    patient,
    tokenNumber,
    queuePosition,
    addPatientMessage,
    addAIMessage,
    setIntakeResponse,
    setGeneratedSummary,
    setLoading,
  } = useKioskStore();

  const { enqueuePatient, setSummary } = useDoctorStore();
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

      // Disarm no-show expiry permanently on turn activity without touching queue slot
      if (sessionId && response.state?.turn_count !== undefined) {
        recordTurnStarted(sessionId, response.state.turn_count);
      }

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

      // 2. FINAL DB WRITE & SUMMARY GENERATION: When intake completes → save full state, enqueue & auto-generate summary
      if (response.state.status === 'completed' && patient && sessionId) {
        const entry: QueueEntry = {
          sessionId,
          tokenNumber: tokenNumber ?? 0,
          queuePosition: queuePosition ?? tokenNumber ?? 0,
          tokenStatus: 'confirmed',
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

        // Save structured history immediately to Supabase
        saveCompletedHistory(sessionId, response.state).then((res) => {
          if (!res.success) {
            console.warn('[Supabase Notice]:', res.error);
          }
        });

        // Automatically generate physician summary via Pipeline 2 (/summary)
        postSummary({ state: response.state })
          .then((summaryRes) => {
            if (summaryRes?.summary) {
              setSummary(sessionId, summaryRes.summary);
              setGeneratedSummary(summaryRes.summary);
              // Persist again with proseSummary populated
              saveCompletedHistory(sessionId, response.state, summaryRes.summary);
            }
          })
          .catch((summaryErr) => {
            console.error('[Summary Auto-Generation Error]:', summaryErr);
          });
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
