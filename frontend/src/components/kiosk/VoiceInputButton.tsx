'use client';

import { useState, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { AudioWaveform } from '@/components/common/AudioWaveform';
import { cn } from '@/lib/utils';
import type { VoiceState } from '@/types/kiosk';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  lang?: string;
}

export function VoiceInputButton({
  onTranscript,
  disabled = false,
  lang = 'en-IN',
}: VoiceInputButtonProps) {
  const { voiceState, transcript, isSupported, startListening, stopListening, resetTranscript } =
    useSpeechRecognition();
  const [submitted, setSubmitted] = useState(false);

  // When transcript arrives (after 'listening' → 'processing'), submit it
  useEffect(() => {
    if (voiceState === 'processing' && transcript && !submitted) {
      setSubmitted(true);
      onTranscript(transcript);
      resetTranscript();
      setSubmitted(false);
    }
  }, [voiceState, transcript, submitted, onTranscript, resetTranscript]);

  if (!isSupported) return null;

  const handleClick = () => {
    if (disabled) return;
    if (voiceState === 'idle') {
      startListening(lang);
    } else {
      stopListening();
    }
  };

  const stateConfig: Record<VoiceState, { bg: string; label: string; ring: boolean }> = {
    idle: {
      bg: 'bg-slate-100 hover:bg-slate-200 text-slate-600',
      label: 'Tap to speak',
      ring: false,
    },
    listening: {
      bg: 'bg-red-500 text-white',
      label: 'Listening…',
      ring: true,
    },
    processing: {
      bg: 'bg-teal-500 text-white',
      label: 'Processing…',
      ring: false,
    },
  };

  const config = stateConfig[voiceState];

  return (
    <div className="relative flex items-center justify-center">
      {/* Pulsing ring when listening */}
      {config.ring && (
        <span className="absolute w-12 h-12 rounded-full bg-red-400 animate-pulse-ring" />
      )}

      <button
        onClick={handleClick}
        disabled={disabled || voiceState === 'processing'}
        title={config.label}
        aria-label={config.label}
        className={cn(
          'relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 shrink-0',
          config.bg,
          disabled && 'opacity-40 cursor-not-allowed'
        )}
      >
        {voiceState === 'listening' ? (
          <AudioWaveform isActive barCount={4} className="gap-0.5" />
        ) : voiceState === 'processing' ? (
          <Mic className="w-5 h-5 animate-pulse" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}
