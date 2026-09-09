'use client';

import { useDoctorStore } from '@/store/doctorStore';
import { AlertTriangle, Clock, User, CheckCircle2 } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { playBeep } from '@/lib/sound';

export function PatientQueueList() {
  const { queue, selectedSessionId, selectPatient } = useDoctorStore();

  const handleSelect = (sessionId: string) => {
    playBeep();
    selectPatient(sessionId);
  };

  if (queue.length === 0) {
    return (
      <div className="p-6 text-center text-slate-400">
        <User className="w-12 h-12 mx-auto mb-2 opacity-40" />
        <p className="font-medium text-sm">No patients in queue</p>
        <p className="text-xs mt-1 text-slate-400">Patients completing kiosk intake will appear here automatically.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 overflow-y-auto clinical-scroll">
      {queue.map((record) => {
        const { entry, physicianApproved } = record;
        const isSelected = selectedSessionId === entry.sessionId;

        return (
          <button
            key={entry.sessionId}
            onClick={() => handleSelect(entry.sessionId)}
            className={cn(
              'w-full text-left p-4 transition-all relative flex flex-col gap-2 hover:bg-slate-50',
              isSelected ? 'bg-teal-50/80 border-l-4 border-teal-600' : 'border-l-4 border-transparent',
              entry.isRedFlag && !isSelected && 'bg-red-50/40'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-800">
                  Token #{entry.tokenNumber}
                </span>
                {physicianApproved && (
                  <span className="flex items-center text-emerald-600 text-xs font-semibold gap-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatRelativeTime(entry.arrivedAt)}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="font-semibold text-slate-900 truncate">
                {entry.patientName}
              </span>
              <span className="text-xs text-slate-500 shrink-0">
                {entry.age}y · {entry.sex.toUpperCase()}
              </span>
            </div>

            {/* Red Flag Badge */}
            {entry.isRedFlag && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-100 text-red-700 text-xs font-semibold animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                <span className="truncate">
                  {entry.urgencyTier?.toUpperCase()} URGENCY
                  {entry.redFlagReason ? `: ${entry.redFlagReason}` : ''}
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
