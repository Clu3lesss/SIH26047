'use client';

import { Header } from '@/components/common/Header';
import { ScenarioSelector } from '@/components/demo/ScenarioSelector';
import { KioskChatStream } from '@/components/kiosk/KioskChatStream';
import { KioskWelcome } from '@/components/kiosk/KioskWelcome';
import { KioskCompletionCard } from '@/components/kiosk/KioskCompletionCard';
import { useKioskStore } from '@/store/kioskStore';
import { useDoctorStore } from '@/store/doctorStore';
import { PatientQueueList } from '@/components/doctor/PatientQueueList';
import { SocratesMatrix } from '@/components/doctor/SocratesMatrix';
import { HistorySectionCard } from '@/components/doctor/HistorySectionCard';
import { EditableSummaryEditor } from '@/components/doctor/EditableSummaryEditor';
import { ClinicalActionToolbar } from '@/components/doctor/ClinicalActionToolbar';
import { RedFlagAlertBanner } from '@/components/doctor/RedFlagAlertBanner';
import { Monitor, Stethoscope, UserCheck, AlertCircle } from 'lucide-react';

export default function DemoPage() {
  const { step } = useKioskStore();
  const { queue, selectedSessionId, getSelectedRecord } = useDoctorStore();
  const selectedRecord = getSelectedRecord();

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden">
      <Header title="MediKiosk · Dual-Screen Demonstration Portal" />
      <ScenarioSelector />

      {/* Split-screen container */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 overflow-hidden">
        {/* LEFT PANE: Patient Kiosk */}
        <div className="flex flex-col h-full bg-white overflow-hidden">
          <div className="bg-teal-700 text-white px-4 py-2 flex items-center justify-between text-xs font-bold shrink-0">
            <span className="flex items-center gap-1.5">
              <Monitor className="w-4 h-4" />
              PATIENT KIOSK SCREEN (Waiting Area)
            </span>
            <span className="bg-teal-800 px-2 py-0.5 rounded text-[11px] font-mono">
              Status: {step.toUpperCase()}
            </span>
          </div>

          <div className="flex-1 overflow-hidden relative">
            {step === 'checkin' && <KioskWelcome />}
            {step === 'intake' && <KioskChatStream />}
            {step === 'complete' && <KioskCompletionCard />}
          </div>
        </div>

        {/* RIGHT PANE: Physician Dashboard */}
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
          <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between text-xs font-bold shrink-0">
            <span className="flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4" />
              PHYSICIAN WORKSTATION (Consultation Room)
            </span>
            <span className="bg-slate-700 px-2 py-0.5 rounded text-[11px]">
              Active Queue: {queue.length}
            </span>
          </div>

          <RedFlagAlertBanner />

          <div className="flex-1 flex overflow-hidden">
            {/* Mini Queue */}
            <div className="w-64 border-r border-slate-200 bg-white overflow-y-auto clinical-scroll shrink-0">
              <div className="p-3 border-b border-slate-100 text-xs font-bold text-slate-600 uppercase">
                Patient Queue ({queue.length})
              </div>
              <PatientQueueList />
            </div>

            {/* Clinical Details */}
            <div className="flex-1 overflow-y-auto clinical-scroll p-4 space-y-4">
              {selectedRecord ? (
                <>
                  <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        {selectedRecord.entry.patientName} ({selectedRecord.entry.age}y,{' '}
                        {selectedRecord.entry.sex})
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Token #{selectedRecord.entry.tokenNumber} · {selectedRecord.entry.sessionId}
                      </p>
                    </div>
                    {selectedRecord.entry.isRedFlag && (
                      <span className="text-xs bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                        {selectedRecord.entry.urgencyTier?.toUpperCase()} PRIORITY
                      </span>
                    )}
                  </div>

                  {selectedRecord.historyState.chief_complaint && (
                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-xs">
                      <span className="font-bold text-teal-800 block text-[10px] uppercase mb-0.5">
                        Chief Complaint
                      </span>
                      <p className="font-semibold text-teal-950">
                        "{selectedRecord.historyState.chief_complaint}"
                      </p>
                    </div>
                  )}

                  <SocratesMatrix hpi={selectedRecord.historyState.hpi} />
                  <HistorySectionCard state={selectedRecord.historyState} />
                  <EditableSummaryEditor sessionId={selectedRecord.entry.sessionId} />
                  <ClinicalActionToolbar sessionId={selectedRecord.entry.sessionId} />
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <UserCheck className="w-10 h-10 mb-2 opacity-50 text-teal-600" />
                  <p className="text-sm font-semibold text-slate-700">No Patient Selected</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Select a patient from the queue or click "Inject Live Scenario" above to test the jury demonstration.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
