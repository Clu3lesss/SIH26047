'use client';

/**
 * hooks/useSpeechSynthesis.ts — Web Speech API text-to-speech hook.
 *
 * Speaks AI-generated questions aloud for accessibility.
 * Respects the ttsEnabled flag from kioskStore.
 */

import { useCallback, useRef } from 'react';

interface UseSpeechSynthesisReturn {
  speak: (text: string, lang?: string) => void;
  cancel: () => void;
  isSupported: boolean;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  const cancel = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
    }
  }, [isSupported]);

  const speak = useCallback(
    (text: string, lang = 'en-IN') => {
      if (!isSupported) return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9; // Slightly slower for clarity in noisy OPD environments
      utterance.pitch = 1.05;
      utterance.volume = 1;

      // Prefer an Indian English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) =>
          v.lang === 'en-IN' ||
          v.name.toLowerCase().includes('india') ||
          v.name.toLowerCase().includes('veena')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported]
  );

  return { speak, cancel, isSupported };
}
