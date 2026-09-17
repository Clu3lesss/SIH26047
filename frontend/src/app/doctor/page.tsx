'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDoctorStore } from '@/store/doctorStore';
import { getDoctorQueueFromDb } from '@/lib/actions/db';
import { Header } from '@/components/common/Header';
import { RedFlagAlertBanner } from '@/components/doctor/RedFlagAlertBanner';
import { PatientQueueList } from '@/components/doctor/PatientQueueList';
import { SocratesMatrix } from '@/components/doctor/SocratesMatrix';
import { DashavidhaMatrix } from '@/components/doctor/DashavidhaMatrix';
import { HistorySectionCard } from '@/components/doctor/HistorySectionCard';
import { EditableSummaryEditor } from '@/components/doctor/EditableSummaryEditor';
import { ClinicalActionToolbar } from '@/components/doctor/ClinicalActionToolbar';
import { PatientDocumentViewer } from '@/components/doctor/PatientDocumentViewer';
import { Stethoscope, UserCheck, AlertCircle, RefreshCw, FileText, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DoctorPage() {
  const { queue, selectedSessionId, getSelectedRecord, syncFromDb, isSyncing, setSyncing, lastSyncedAt } =
    useDoctorStore();
  const selectedRecord = getSelectedRecord();
  const [syncError, setSyncError] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await getDoctorQueueFromDb();
      if (res.success && res.data) {
        syncFromDb(res.data.records, res.data.redFlagAlerts);
        // Sync local token counter with highest token in DB
        const maxToken = Math.max(0, ...res.data.records.map((r) => r.entry.tokenNumber || 0));
        if (maxToken > 0 && typeof window !== 'undefined') {
          const stored = parseInt(window.localStorage.getItem('medikiosk_token_counter') || '1', 10);
          if (maxToken >= stored) {
            window.localStorage.setItem('medikiosk_token_counter', String(maxToken + 1));
          }
        }
        setSyncError(null);
      } else if (res.error) {
        setSyncError(res.error);
      }
    } catch (err) {
      console.error('[Doctor Queue Sync Error]:', err);
      setSyncError('Could not sync with Supabase');
    } finally {
      setSyncing(false);
    }
  }, [syncFromDb, setSyncing]);

  // Initial load and live background polling (every 4 seconds)
  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 6000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header title="Physician Station" />
      <RedFlagAlertBanner />

      {/* Sync error banner */}
      {syncError && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            {syncError}
          </span>
          <button onClick={fetchQueue} className="font-semibold text-amber-900 underline hover:no-underline">
            Retry Sync
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Patient Queue */}
        <aside className="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-teal-600" />
              <h2 className="font-bold text-xs text-slate-700 uppercase tracking-wide">
                OPD Queue ({queue.length})
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchQueue}
                disabled={isSyncing}
                title="Sync queue from Supabase"
                className="p-1 text-slate-400 hover:text-teal-600 rounded transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-teal-600' : ''}`} />
              </button>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                Live
              </span>
            </div>
          </div>

          <PatientQueueList />
        </aside>

        {/* Right Main Content: Patient Record & Clinical Summary */}
        <main className="flex-1 overflow-y-auto clinical-scroll p-6">
          {selectedRecord ? (
            <div className="max-w-5xl mx-auto space-y-5">
              {/* Clinical EHR Patient Record Banner */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-black flex items-center justify-center text-lg tracking-tight shadow-xs">
                        #{selectedRecord.entry.tokenNumber}
                      </div>
                      <span
                        className={cn(
                          'text-[9px] font-bold mt-1.5 px-2 py-0.5 rounded-full uppercase tracking-wider border',
                          selectedRecord.entry.isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-sky-50 text-sky-700 border-sky-200'
                        )}
                      >
                        {selectedRecord.entry.isCompleted
                          ? 'Ready for Doctor'
                          : `In Interview (Turn ${selectedRecord.historyState?.turn_count ?? selectedRecord.entry.turnCount ?? 1})`}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-xl font-bold text-slate-900 truncate">
                          {selectedRecord.entry.patientName}
                        </h3>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {selectedRecord.entry.age}y · {selectedRecord.entry.sex.toUpperCase()}
                        </span>
                        {selectedRecord.historyState.department === 'ayush' && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wide">
                            AYUSH OPD
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 font-mono mt-1 flex-wrap">
                        <span>Session: {selectedRecord.entry.sessionId}</span>
                        <span>·</span>
                        <span>{new Date(selectedRecord.entry.arrivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedRecord.documents && selectedRecord.documents.length > 0 ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
                        <FileText className="w-3.5 h-3.5 text-teal-600" />
                        <span>{selectedRecord.documents.length} {selectedRecord.documents.length === 1 ? 'Report' : 'Reports'} Uploaded</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-xs">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>No Documents</span>
                      </div>
                    )}

                    {selectedRecord.entry.isRedFlag && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-bold animate-pulse">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>TRIAGE: {selectedRecord.entry.urgencyTier?.toUpperCase()} PRIORITY</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Primary Chief Complaint Strip */}
                {selectedRecord.historyState.chief_complaint && (
                  <div className="bg-teal-50/70 border-t border-teal-100 px-5 py-3 flex items-start gap-2.5 text-xs">
                    <span className="font-bold uppercase tracking-wider text-teal-800 shrink-0 mt-0.5">
                      Chief Complaint:
                    </span>
                    <p className="font-semibold text-teal-950 text-sm leading-snug">
                      &ldquo;{selectedRecord.historyState.chief_complaint}&rdquo;
                    </p>
                  </div>
                )}
              </div>

              {/* Action Toolbar — immediately accessible beneath patient banner */}
              <ClinicalActionToolbar sessionId={selectedRecord.entry.sessionId} />

              {/* 2-Column Clinical Workbench: Left = Intake History & Records, Right = AI Synthesis & EMR Note */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                {/* Left Column: Structured Clinical History & Documents */}
                <div className="xl:col-span-7 space-y-5">
                  {/* Clinical Matrix: Dashavidha Pariksha (AYUSH) or SOCRATES (General) */}
                  {selectedRecord.historyState.department === 'ayush' || selectedRecord.historyState.dashavidha ? (
                    selectedRecord.historyState.dashavidha && (
                      <DashavidhaMatrix dashavidha={selectedRecord.historyState.dashavidha} />
                    )
                  ) : (
                    <SocratesMatrix hpi={selectedRecord.historyState.hpi} />
                  )}

                  {/* Clinical Sections (Meds, Allergies, PMH, PSH, ROS) */}
                  <HistorySectionCard state={selectedRecord.historyState} />

                  {/* Uploaded Documents & Prescriptions */}
                  <PatientDocumentViewer
                    sessionId={selectedRecord.entry.sessionId}
                    documents={selectedRecord.documents}
                  />
                </div>

                {/* Right Column: AI Clinical Note & Sign-off (Sticky on wide screens) */}
                <div className="xl:col-span-5 space-y-5 xl:sticky xl:top-0">
                  <EditableSummaryEditor sessionId={selectedRecord.entry.sessionId} />
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center mb-4 text-teal-600">
                <Stethoscope className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1.5">No Patient Selected</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-5">
                Select a patient token from the OPD queue on the left to review their verified 7-section clinical history, uploaded records, and AI draft notes.
              </p>
              <div className="p-3 bg-white border border-slate-200 rounded-lg text-left text-xs text-slate-600 w-full space-y-1.5 shadow-2xs">
                <p className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider mb-1">Queue Guide:</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span>Red-Flag: Critical conditions sorted to the top automatically</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Confirmed: Patient completed the kiosk intake session</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
