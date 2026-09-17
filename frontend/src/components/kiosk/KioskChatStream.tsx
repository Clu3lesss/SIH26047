'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, Send, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useKioskStore } from '@/store/kioskStore';
import { useIntakeSession } from '@/hooks/useIntakeSession';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { VoiceInputButton } from './VoiceInputButton';
import { ClinicalProgressStepper } from './ClinicalProgressStepper';
import { cn } from '@/lib/utils';
import { formatTimestamp } from '@/lib/utils';

const LOADING_MESSAGES = [
  'Analyzing your response…',
  'Cross-referencing clinical guidelines…',
  'Preparing your next question…',
  'Recording your history for the doctor…',
  'Processing medical details…',
];

export function KioskChatStream() {
  const { messages, currentQuestion, historyState, isLoading, patient, ttsEnabled, toggleTTS } =
    useKioskStore();
  const { sendMessage, retryLastMessage, error } = useIntakeSession();
  const { speak } = useSpeechSynthesis();
  const [inputText, setInputText] = useState('');
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-speak new AI questions
  useEffect(() => {
    if (currentQuestion && ttsEnabled) {
      speak(currentQuestion);
    }
  }, [currentQuestion, ttsEnabled, speak]);

  // Rotate loading messages
  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || isLoading) return;
    sendMessage(text);
    setInputText('');
  };

  const handleVoiceTranscript = (transcript: string) => {
    if (!transcript.trim()) return;
    sendMessage(transcript);
  };

  return (
    <div className="flex h-full">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto clinical-scroll px-4 py-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex items-start',
                msg.role === 'ai' ? 'justify-start' : 'justify-end'
              )}
            >
              {msg.role === 'ai' && (
                <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white text-sm font-bold shrink-0 mr-3 mt-1">
                  AI
                </div>
              )}
              <div
                className={cn(
                  'max-w-[78%] px-5 py-4 rounded-xl text-kiosk-sm leading-relaxed',
                  msg.role === 'ai'
                    ? 'bg-white border border-clinical-muted text-slate-800 rounded-tl-sm'
                    : 'bg-teal-600 text-white rounded-tr-sm'
                )}
              >
                <p>{msg.text}</p>
                <p
                  className={cn(
                    'text-xs mt-1.5',
                    msg.role === 'ai' ? 'text-slate-400' : 'text-teal-200'
                  )}
                >
                  {formatTimestamp(msg.timestamp)}
                </p>
              </div>
              {msg.role === 'ai' && (
                <button
                  onClick={() => speak(msg.text)}
                  className="ml-2 self-start mt-2 text-slate-400 hover:text-teal-600 transition-colors"
                  aria-label="Read aloud"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start ">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white text-sm font-bold shrink-0 mr-3 mt-1">
                AI
              </div>
              <div className="bg-white border border-clinical-muted px-5 py-4 rounded-xl rounded-tl-sm max-w-[78%]">
                <div className="flex items-center gap-2 text-teal-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">{LOADING_MESSAGES[loadingMsgIdx]}</span>
                </div>
              </div>
            </div>
          )}

          {/* Error notice with clear explanation and 1-click retry */}
          {error && (
            <div className="flex justify-start  my-2">
              <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mr-3 mt-1">
                !
              </div>
              <div className="bg-red-50 border border-red-200 text-red-950 px-4 py-3 rounded-xl rounded-tl-sm max-w-[85%] text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Request Issue</span>
                </div>
                <p className="leading-relaxed text-slate-700">{error.message}</p>
                <button
                  onClick={retryLastMessage}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors active:scale-95 text-xs shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tap to Retry</span>
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="border-t border-clinical-muted bg-white px-4 py-4">
          <div className="flex gap-3 items-center">
            <VoiceInputButton
              onTranscript={handleVoiceTranscript}
              disabled={isLoading}
            />
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Type your answer here..."
              disabled={isLoading}
              className="flex-1 px-5 py-3.5 rounded-lg border border-clinical-muted bg-clinical-offwhite text-kiosk-sm focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isLoading}
              className="w-12 h-12 bg-teal-600 hover:bg-teal-700 text-white rounded-lg flex items-center justify-center disabled:opacity-40 transition-colors shrink-0"
              aria-label="Send"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress sidebar */}
      <div className="hidden lg:block w-72 border-l border-clinical-muted bg-clinical-offwhite">
        <div className="p-4 border-b border-clinical-muted">
          <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">
            Clinical Progress
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {patient?.name || 'Patient'} · {patient?.age}y · {patient?.sex}
          </p>
        </div>
        {historyState && <ClinicalProgressStepper state={historyState} />}
      </div>
    </div>
  );
}

