'use client';

import { useEffect, useCallback } from 'react';
import { Header } from '@/components/common/Header';
import { ScenarioSelector } from '@/components/demo/ScenarioSelector';
import { KioskChatStream } from '@/components/kiosk/KioskChatStream';
import { KioskWelcome } from '@/components/kiosk/KioskWelcome';
import { DocumentUpload } from '@/components/kiosk/DocumentUpload';
import { KioskCompletionCard } from '@/components/kiosk/KioskCompletionCard';
import { useKioskStore } from '@/store/kioskStore';
import { useDoctorStore } from '@/store/doctorStore';
import { getDoctorQueueFromDb } from '@/lib/actions/db';
import { PatientQueueList } from '@/components/doctor/PatientQueueList';
import { SocratesMatrix } from '@/components/doctor/SocratesMatrix';
import { DashavidhaMatrix } from '@/components/doctor/DashavidhaMatrix';
import { HistorySectionCard } from '@/components/doctor/HistorySectionCard';
import { EditableSummaryEditor } from '@/components/doctor/EditableSummaryEditor';
import { ClinicalActionToolbar } from '@/components/doctor/ClinicalActionToolbar';
import { PatientDocumentViewer } from '@/components/doctor/PatientDocumentViewer';
import { RedFlagAlertBanner } from '@/components/doctor/RedFlagAlertBanner';
import { cn } from '@/lib/utils';
import {
  Monitor,
  Stethoscope,
  UserCheck,
  AlertCircle,
  ArrowRight,
  Play,
  Eye,
  ClipboardList,
} from 'lucide-react';

// -- Demo walkthrough steps ---------------------------------------------------
const DEMO_STEPS = [
  { num: '1', icon: Play, label: 'Pick a scenario', detail: 'Select Case A or B above and click Inject' },
  { num: '2', icon: Monitor, label: 'Patient kiosk', detail: 'See completed intake on the left panel' },
  { num: '3', icon: Eye, label: 'Doctor dashboard', detail: 'Right panel updates in real time' },
  { num: '4', icon: AlertCircle, label: 'Red-flag alert', detail: 'Case A shows HIGH priority immediately' },
  { num: '5', icon: ClipboardList, label: 'AI summary', detail: 'Full physician-ready summary ready' },
];

export default function DemoPage() {
  const { step } = useKioskStore();
  const { queue, selectedSessionId, getSelectedRecord, syncFromDb, setSyncing } = useDoctorStore();
  const selectedRecord = getSelectedRecord();

  const syncQueue = useCallback(async () => {
    try {
      const res = await getDoctorQueueFromDb();
      if (res.success && res.data) {
        syncFromDb(res.data.records, res.data.redFlagAlerts);
        const maxToken = Math.max(0, ...res.data.records.map((r) => r.entry.tokenNumber || 0));
        if (maxToken > 0 && typeof window !== 'undefined') {
          const stored = parseInt(window.localStorage.getItem('medikiosk_token_counter') || '1', 10);
          if (maxToken >= stored) {
            window.localStorage.setItem('medikiosk_token_counter', String(maxToken + 1));
          }
        }
      }
    } catch (e) {
      console.warn('[Demo sync notice]:', e);
    }
  }, [syncFromDb]);

  useEffect(() => {
    syncQueue();
    const interval = setInterval(syncQueue, 4000);
    return () => clearInterval(interval);
  }, [syncQueue]);

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-slate-100 overflow-y-auto lg:overflow-hidden">
      <Header title="MediKiosk - Live Demo" />

      {/* -- Demo Walkthrough Bar ------------------------------------------- */}
      <div className="bg-slate-900 text-white border-b border-slate-800 px-4 py-2 shrink-0 overflow-x-auto clinical-scroll">
        <div className="flex items-center gap-2.5 min-w-max">
          

          <div className="flex items-center gap-1.5">
            {DEMO_STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.num} className="flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/60 rounded-md px-2.5 py-1 shrink-0">
                    <span className="w-4 h-4 bg-teal-600 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 text-white">
                      {s.num}
                    </span>
                    <Icon className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span className="text-[11px] font-semibold text-slate-200 whitespace-nowrap">{s.label}</span>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">· {s.detail}</span>
                  </div>
                  {i < DEMO_STEPS.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-slate-600 shrink-0 mx-0.5" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* -- Scenario Selector --------------------------------------------- */}
      <ScenarioSelector />

      {/* -- Split-screen -------------------------------------------------- */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 min-h-0">

        {/* LEFT PANE: Patient Kiosk */}
        <div className="flex flex-col h-[700px] lg:h-full bg-white min-h-0">
          {/* Panel header */}
          <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between text-xs font-bold shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-teal-600 flex items-center justify-center text-white">
                <Monitor className="w-3.5 h-3.5" />
              </div>
              <span className="tracking-tight text-white font-bold">PATIENT KIOSK</span>
              <span className="text-slate-400 font-normal text-[11px] hidden sm:inline">· Waiting Area Tablet</span>
            </div>
            <span className="bg-teal-950 text-teal-300 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border border-teal-800/60">
              Stage: {step}
            </span>
          </div>

          {/* Step hint strip */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-1.5 text-[11px] text-slate-600 font-medium shrink-0 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
            {step === 'checkin' && 'Patient enters registration details and selects clinical department'}
            {step === 'intake' && 'AI conducts structured clinical interview (maximum 6 turns)'}
            {step === 'scan' && 'Patient photographs old prescriptions and lab reports'}
            {step === 'complete' && 'Intake submitted — permanent token assigned and synced to doctor'}
          </div>

          <div
            className={`flex-1 min-h-0 relative ${
              step === 'intake' ? 'overflow-hidden' : 'overflow-y-auto clinical-scroll'
            }`}
          >
            {step === 'checkin' && <KioskWelcome />}
            {step === 'intake' && <KioskChatStream />}
            {step === 'scan' && <DocumentUpload />}
            {step === 'complete' && <KioskCompletionCard />}
          </div>
        </div>

        {/* RIGHT PANE: Physician Dashboard */}
        <div className="flex flex-col h-[700px] lg:h-full bg-slate-50 min-h-0">
          {/* Panel header */}
          <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between text-xs font-bold shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-teal-600 flex items-center justify-center text-white">
                <Stethoscope className="w-3.5 h-3.5" />
              </div>
              <span className="tracking-tight text-white font-bold">PHYSICIAN STATION</span>
              <span className="text-slate-400 font-normal text-[11px] hidden sm:inline">· Consultation Room Screen</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Live Sync (4s)
              </span>
              <span className="bg-slate-800 border border-slate-700 text-slate-200 px-2 py-0.5 rounded text-[10px] font-mono">
                Queue: {queue.length}
              </span>
            </div>
          </div>

          {/* Panel hint strip */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-1.5 text-[11px] text-slate-600 font-medium shrink-0 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
            {queue.length === 0
              ? 'Queue empty — click "Inject Live Scenario" above to test'
              : `${queue.length} patient(s) waiting · Red-flags automatically prioritized to top`}
          </div>

          <RedFlagAlertBanner />

          <div className="flex-1 flex flex-col sm:flex-row min-h-0 overflow-hidden">
            {/* Mini Queue */}
            <div className="w-full sm:w-60 border-b sm:border-b-0 sm:border-r border-slate-200 bg-white overflow-y-auto clinical-scroll shrink-0 max-h-48 sm:max-h-none min-h-0">
              <div className="px-3 py-2.5 border-b border-slate-100 text-xs font-bold text-slate-600 uppercase tracking-wide">
                Patient Queue ({queue.length})
              </div>
              <PatientQueueList />
            </div>

            {/* Clinical Details */}
            <div className="flex-1 overflow-y-auto clinical-scroll p-4 space-y-4 min-h-0">
              {selectedRecord ? (
                <>
                  {/* Patient identity card */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-900 text-white font-black flex items-center justify-center text-sm">
                          #{selectedRecord.entry.tokenNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-base text-slate-900 leading-tight">
                              {selectedRecord.entry.patientName}
                            </h4>
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {selectedRecord.entry.age}y · {selectedRecord.entry.sex.toUpperCase()}
                            </span>
                            {selectedRecord.historyState.department === 'ayush' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
                                AYUSH
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                            <span
                              className={cn(
                                'font-bold px-1.5 py-0.2 rounded border text-[9px] uppercase',
                                selectedRecord.entry.isCompleted
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-sky-50 text-sky-700 border-sky-200'
                              )}
                            >
                              {selectedRecord.entry.isCompleted
                                ? 'Ready for Doctor'
                                : `In Interview (Turn ${selectedRecord.historyState?.turn_count ?? selectedRecord.entry.turnCount ?? 1})`}
                            </span>
                            <span>·</span>
                            <span>Session: {selectedRecord.entry.sessionId}</span>
                          </div>
                        </div>
                      </div>

                      {selectedRecord.entry.isRedFlag && (
                        <span className="text-xs bg-red-50 text-red-700 border border-red-200 font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 shrink-0 animate-pulse">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          TRIAGE: {selectedRecord.entry.urgencyTier?.toUpperCase()} PRIORITY
                        </span>
                      )}
                    </div>

                    {/* Chief complaint highlight */}
                    {selectedRecord.historyState.chief_complaint && (
                      <div className="bg-teal-50/70 border-t border-teal-100 pt-2.5 flex items-start gap-2 text-xs">
                        <span className="font-bold uppercase tracking-wide text-teal-800 shrink-0 mt-0.5">
                          Complaint:
                        </span>
                        <p className="font-semibold text-teal-950 text-xs leading-snug">
                          &ldquo;{selectedRecord.historyState.chief_complaint}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Immediate Clinical Action Bar */}
                  <ClinicalActionToolbar sessionId={selectedRecord.entry.sessionId} />

                  {/* Clinical Matrix: Dashavidha Pariksha (AYUSH) or SOCRATES (General) */}
                  {selectedRecord.historyState.department === 'ayush' || selectedRecord.historyState.dashavidha ? (
                    selectedRecord.historyState.dashavidha && (
                      <DashavidhaMatrix dashavidha={selectedRecord.historyState.dashavidha} />
                    )
                  ) : (
                    <SocratesMatrix hpi={selectedRecord.historyState.hpi} />
                  )}
                  <HistorySectionCard state={selectedRecord.historyState} />
                  <PatientDocumentViewer
                    sessionId={selectedRecord.entry.sessionId}
                    documents={selectedRecord.documents}
                  />
                  <EditableSummaryEditor sessionId={selectedRecord.entry.sessionId} />
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <UserCheck className="w-10 h-10 mb-3 opacity-30 text-teal-600" />
                  <p className="text-sm font-semibold text-slate-700">No patient selected</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                    Click &ldquo;Inject Live Scenario&rdquo; above to load a demo patient and see the full
                    physician view with history, red flags, and AI summary.
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
