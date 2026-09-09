'use client';

import { CheckCircle, Printer, Home, Clock } from 'lucide-react';
import { useKioskStore } from '@/store/kioskStore';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import { playSuccess } from '@/lib/sound';

export function KioskCompletionCard() {
  const { patient, tokenNumber, sessionId, resetSession } = useKioskStore();

  useEffect(() => {
    playSuccess();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 flex flex-col items-center justify-center p-6">
      {/* Success animation */}
      <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 animate-fade-in">
        <CheckCircle className="w-14 h-14 text-emerald-500" />
      </div>

      <h1 className="text-kiosk-xl text-slate-900 text-center mb-2 animate-slide-up">
        All Done!
      </h1>
      <p className="text-kiosk-md text-slate-600 text-center mb-8 max-w-md animate-slide-up">
        Thank you, <strong>{patient?.name}</strong>! Your clinical history has been
        forwarded to the doctor.
      </p>

      {/* Token card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-clinical-muted p-8 text-center animate-slide-up">
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-2">
          Your OPD Token
        </p>
        <div className="text-6xl font-black text-teal-600 mb-2">
          #{tokenNumber ?? '—'}
        </div>
        <div className="flex items-center justify-center gap-1.5 text-slate-500 text-sm mb-4">
          <Clock className="w-4 h-4" />
          <span>Estimated wait: ~8 minutes</span>
        </div>

        {/* QR code placeholder */}
        <div className="w-32 h-32 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-300 mb-4">
          <div className="text-xs text-slate-400 text-center px-2">
            QR<br />Token #{tokenNumber}
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Session ID: {sessionId}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-4 mt-8 w-full max-w-sm animate-slide-up">
        <button
          onClick={() => window.print()}
          className="flex-1 bg-white border border-clinical-muted text-slate-700 font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-clinical-light transition-colors touch-target"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
        <button
          onClick={resetSession}
          className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors touch-target"
        >
          <Home className="w-4 h-4" />
          New Patient
        </button>
      </div>
    </div>
  );
}
