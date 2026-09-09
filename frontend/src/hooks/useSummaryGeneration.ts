'use client';

/**
 * hooks/useSummaryGeneration.ts — TanStack Query hook for Pipeline 2.
 *
 * Fetches a physician-readable summary for a given PatientHistoryState.
 * Results are stored in doctorStore.
 */

import { useMutation } from '@tanstack/react-query';
import { postSummary } from '@/lib/api';
import { useDoctorStore } from '@/store/doctorStore';
import type { PatientHistoryState } from '@/types/intake';

export function useSummaryGeneration() {
  const { setSummary, setSummaryLoading } = useDoctorStore();

  const mutation = useMutation({
    mutationFn: ({ state }: { sessionId: string; state: PatientHistoryState }) =>
      postSummary({ state }),

    onMutate: ({ sessionId }) => {
      setSummaryLoading(sessionId, true);
    },

    onSuccess: (response, { sessionId }) => {
      setSummary(sessionId, response.summary);
    },

    onError: (error, { sessionId }) => {
      setSummaryLoading(sessionId, false);
      console.error('Summary API error:', error);
    },
  });

  const generateSummary = (sessionId: string, state: PatientHistoryState) => {
    mutation.mutate({ sessionId, state });
  };

  return {
    generateSummary,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
