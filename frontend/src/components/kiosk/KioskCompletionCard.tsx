'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Printer, Home, Clock, FileText, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
import { useKioskStore } from '@/store/kioskStore';
import { playSuccess } from '@/lib/sound';

export function KioskCompletionCard() {
  const { patient, tokenNumber, sessionId, resetSession, generatedSummary, setStep } = useKioskStore();
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    playSuccess();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      {/* Success icon */}
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
        <CheckCircle className="w-9 h-9 text-emerald-600" />
      </div>

      <h1 className="text-kiosk-xl text-slate-900 text-center mb-1 font-black">
        Intake Completed!
      </h1>
      <p className="text-kiosk-md text-slate-500 text-center mb-6 max-w-md">
        Thank you, <strong className="text-slate-800">{patient?.name}</strong>! Your 6-point clinical assessment is complete and forwarded to the doctor.
      </p>

      {/* Token card */}
      <div className="w-full max-w-sm bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold px-3 py-1 rounded-full mb-3">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          Official Confirmed OPD Token
        </div>
        <div className="text-6xl font-black text-teal-600 mb-1">
          #{tokenNumber ?? '-'}
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Your responses have been submitted. Your OPD queue position was <strong>locked at registration</strong> and your complete clinical assessment is ready for the physician.
        </p>
        <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs mb-4">
          <Clock className="w-3.5 h-3.5" />
          <span>Estimated wait: ~8 minutes</span>
        </div>

        {/* Summary status */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 text-left">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              {generatedSummary ? 'Physician Summary Ready' : 'Generating Physician Summary...'}
            </span>
            {generatedSummary ? (
              <button
                onClick={() => setShowSummary(!showSummary)}
                className="text-xs text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-0.5"
              >
                {showSummary ? 'Hide' : 'View'}
                {showSummary ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <Loader2 className="w-3.5 h-3.5 text-teal-600 animate-spin" />
            )}
          </div>

          {showSummary && generatedSummary && (
            <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-700 space-y-2 max-h-52 overflow-y-auto clinical-scroll">
              <div>
                <strong className="text-slate-900 block font-semibold">Chief Complaint:</strong>
                <p className="text-slate-600">{generatedSummary.chief_complaint}</p>
              </div>
              <div>
                <strong className="text-slate-900 block font-semibold">History of Illness:</strong>
                <p className="text-slate-600">{generatedSummary.history_of_present_illness}</p>
              </div>
              <div>
                <strong className="text-slate-900 block font-semibold">Past Medical & Meds:</strong>
                <p className="text-slate-600">
                  {generatedSummary.past_medical_history || 'None reported'} - Meds: {generatedSummary.medications || 'None'}
                </p>
              </div>
            </div>
          )}
        </div>

        <p className="text-[11px] text-slate-400 font-mono">
          Session ID: {sessionId}
        </p>

        <button
          onClick={() => setStep('scan')}
          className="w-full mt-3 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-700 hover:text-teal-800 font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5 text-xs transition-colors"
        >
          <FileText className="w-3.5 h-3.5 text-teal-600" />
          <span>Upload Old Prescriptions / Reports</span>
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-5 w-full max-w-sm">
        <button
          onClick={() => window.print()}
          className="flex-1 bg-white border border-slate-200 text-slate-700 font-semibold py-3.5 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print Token
        </button>
        <button
          onClick={resetSession}
          className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <Home className="w-4 h-4" />
          New Patient
        </button>
      </div>
    </div>
  );
}
