'use client';

import { useDoctorStore } from '@/store/doctorStore';
import { Header } from '@/components/common/Header';
import { RedFlagAlertBanner } from '@/components/doctor/RedFlagAlertBanner';
import { PatientQueueList } from '@/components/doctor/PatientQueueList';
import { SocratesMatrix } from '@/components/doctor/SocratesMatrix';
import { HistorySectionCard } from '@/components/doctor/HistorySectionCard';
import { EditableSummaryEditor } from '@/components/doctor/EditableSummaryEditor';
import { ClinicalActionToolbar } from '@/components/doctor/ClinicalActionToolbar';
import { Stethoscope, UserCheck, AlertCircle, FileText, Activity } from 'lucide-react';

export default function DoctorPage() {
  const { queue, selectedSessionId, getSelectedRecord } = useDoctorStore();
  const selectedRecord = getSelectedRecord();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header title="Physician Station" />
      <RedFlagAlertBanner />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Patient Queue */}
        <aside className="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-teal-600" />
              <h2 className="font-bold text-sm text-slate-800">OPD Waiting Queue</h2>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {queue.length}
            </span>
          </div>

          <PatientQueueList />
        </aside>

        {/* Right Main Content: Patient Record & Clinical Summary */}
        <main className="flex-1 overflow-y-auto clinical-scroll p-6">
          {selectedRecord ? (
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Patient Banner */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white font-bold flex items-center justify-center text-lg">
                    #{selectedRecord.entry.tokenNumber}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      {selectedRecord.entry.patientName}
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {selectedRecord.entry.age} Years · {selectedRecord.entry.sex.toUpperCase()}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Session ID: {selectedRecord.entry.sessionId}
                    </p>
                  </div>
                </div>

                {selectedRecord.entry.isRedFlag && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-100 border border-red-200 text-red-800 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>TRIAGE ALERT: {selectedRecord.entry.urgencyTier?.toUpperCase()} URGENCY</span>
                  </div>
                )}
              </div>

              {/* Chief Complaint Highlight */}
              {selectedRecord.historyState.chief_complaint && (
                <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 block mb-1">
                    Primary Chief Complaint
                  </span>
                  <p className="text-sm font-semibold text-teal-950">
                    "{selectedRecord.historyState.chief_complaint}"
                  </p>
                </div>
              )}

              {/* SOCRATES Matrix */}
              <SocratesMatrix hpi={selectedRecord.historyState.hpi} />

              {/* Clinical Sections (Meds, Allergies, PMH, PSH, ROS) */}
              <HistorySectionCard state={selectedRecord.historyState} />

              {/* AI Summary Editor (Pipeline 2) */}
              <EditableSummaryEditor sessionId={selectedRecord.entry.sessionId} />

              {/* Action Toolbar */}
              <ClinicalActionToolbar sessionId={selectedRecord.entry.sessionId} />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-3xl bg-teal-50 border border-teal-100 flex items-center justify-center mb-4 text-teal-600">
                <UserCheck className="w-8 h-8 opacity-80" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-1">Select a Patient</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Choose an intake record from the left queue to view structured clinical history, SOCRATES breakdown, and the AI summary draft.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
