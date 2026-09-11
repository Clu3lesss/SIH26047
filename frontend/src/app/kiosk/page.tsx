'use client';

import { useEffect } from 'react';
import { useKioskStore } from '@/store/kioskStore';
import { ChevronRight } from 'lucide-react';
import { Header } from '@/components/common/Header';
import { KioskWelcome } from '@/components/kiosk/KioskWelcome';
import { KioskChatStream } from '@/components/kiosk/KioskChatStream';
import { DocumentUpload } from '@/components/kiosk/DocumentUpload';
import { KioskCompletionCard } from '@/components/kiosk/KioskCompletionCard';

// Step indicator shown during intake
const STEP_LABELS = [
  { key: 'checkin', label: '1. Check-in' },
  { key: 'intake', label: '2. Health History' },
  { key: 'scan', label: '3. Documents' },
  { key: 'complete', label: '4. Done' },
];

export default function KioskPage() {
  const { step, patient, sessionId, resetSession } = useKioskStore();

  // If no patient registration exists, always ensure we are on check-in
  useEffect(() => {
    if (!patient || !sessionId) {
      if (step !== 'checkin') {
        resetSession();
      }
    }
  }, [patient, sessionId, step, resetSession]);

  // Prevent accidental browser-back during intake
  useEffect(() => {
    if (step === 'intake') {
      const handler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }
  }, [step]);

  if (!patient || !sessionId || step === 'checkin') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header title="Patient Registration" showLang />
        <KioskWelcome />
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header title="MediKiosk · Complete" />
        <KioskCompletionCard />
      </div>
    );
  }

  if (step === 'scan') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header title="Document Upload" showTtsToggle showLang />
        <DocumentUpload />
      </div>
    );
  }

  // 'intake' step — main conversational flow
  return (
    <div className="h-screen flex flex-col">
      <Header title="Health Interview" showTtsToggle showLang />

      {/* Step breadcrumb */}
      <div className="bg-white border-b border-clinical-muted px-4 py-2">
        <div className="flex gap-1 items-center text-xs text-slate-400">
          {STEP_LABELS.map((s, idx) => (
            <span key={s.key} className="flex items-center gap-1">
              {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-300" />}
              <span
                className={
                  s.key === step
                    ? 'text-teal-600 font-bold'
                    : idx < STEP_LABELS.findIndex((x) => x.key === step)
                    ? 'text-emerald-500 font-medium'
                    : 'text-slate-400'
                }
              >
                {s.label}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Main chat area — fills remaining height */}
      <div className="flex-1 overflow-hidden">
        <KioskChatStream />
      </div>
    </div>
  );
}
