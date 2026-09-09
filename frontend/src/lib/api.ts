/**
 * lib/api.ts — Axios API client for the MediKiosk FastAPI microservice.
 *
 * All requests go through the Next.js rewrite proxy (/api/* → http://localhost:8000/*)
 * so there are no CORS issues and no hardcoded backend URLs in the browser.
 */

import axios, { AxiosError } from 'axios';
import type { IntakeRequest, IntakeResponse, SummaryRequest, SummaryResponse } from '@/types/intake';

const client = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60_000, // 60s — LLM calls with rate-limit delays can take time
});

/** Formats any Axios or network error into a clear, understandable clinical explanation. */
export function parseApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<{ detail?: string }>;
    
    // Check if the backend gave a specific detail message
    if (axiosErr.response?.data?.detail) {
      return axiosErr.response.data.detail;
    }

    if (axiosErr.response?.status === 500) {
      return 'The backend microservice encountered an internal error. Please check backend terminal logs.';
    }

    if (axiosErr.response?.status === 404) {
      return 'API route not found. Ensure the microservice is running at http://localhost:8000.';
    }

    if (axiosErr.code === 'ECONNABORTED' || axiosErr.message.includes('timeout')) {
      return 'The AI request timed out. The model is busy, please tap Retry.';
    }

    if (axiosErr.message === 'Network Error' || !axiosErr.response) {
      return 'Cannot connect to the backend microservice at http://localhost:8000. Please start your backend (uvicorn main:app --port 8000).';
    }

    return `Server error (${axiosErr.response?.status || 'Unknown'}): ${axiosErr.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * POST /intake — Process one conversational turn through Pipeline 1.
 * Returns either an in-progress response (with next_question) or a
 * completed response (with the final PatientHistoryState).
 */
export async function postIntakeTurn(payload: IntakeRequest): Promise<IntakeResponse> {
  try {
    const { data } = await client.post<IntakeResponse>('/intake', payload);
    return data;
  } catch (error) {
    throw new Error(parseApiError(error));
  }
}

/**
 * POST /summary — Generate a physician-readable summary from a completed
 * PatientHistoryState via Pipeline 2. Can be called independently.
 */
export async function postSummary(payload: SummaryRequest): Promise<SummaryResponse> {
  try {
    const { data } = await client.post<SummaryResponse>('/summary', payload);
    return data;
  } catch (error) {
    throw new Error(parseApiError(error));
  }
}
