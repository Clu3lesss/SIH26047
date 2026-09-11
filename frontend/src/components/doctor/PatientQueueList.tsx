'use client';

import { useState } from 'react';
import { useDoctorStore } from '@/store/doctorStore';
import { AlertTriangle, Clock, User, CheckCircle2, FileText, Search, X } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { playBeep } from '@/lib/sound';

export function PatientQueueList() {
  const { queue, selectedSessionId, selectPatient } = useDoctorStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'red_flag'>('all');

  const handleSelect = (sessionId: string) => {
    playBeep();
    selectPatient(sessionId);
  };

  const filteredQueue = queue.filter((record) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      record.entry.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(record.entry.tokenNumber).includes(searchQuery.trim()) ||
      record.entry.sessionId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = filterType === 'all' || (filterType === 'red_flag' && record.entry.isRedFlag);

    return matchesSearch && matchesFilter;
  });

  const redFlagCount = queue.filter((r) => r.entry.isRedFlag).length;

  if (queue.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p className="font-semibold text-sm text-slate-700">No Patients in Waiting Queue</p>
        <p className="text-xs mt-1 text-slate-400 leading-relaxed">
          Patients completing kiosk check-in will appear here in real time.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search & Quick Filter Strip */}
      <div className="p-2.5 border-b border-slate-100 bg-slate-50/70 space-y-2 shrink-0">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, token #..."
            className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 text-[11px]">
          <button
            onClick={() => setFilterType('all')}
            className={cn(
              'px-2 py-0.5 rounded font-medium transition-colors',
              filterType === 'all'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-200'
            )}
          >
            All ({queue.length})
          </button>
          <button
            onClick={() => setFilterType('red_flag')}
            className={cn(
              'px-2 py-0.5 rounded font-medium flex items-center gap-1 transition-colors',
              filterType === 'red_flag'
                ? 'bg-red-600 text-white font-semibold'
                : redFlagCount > 0
                ? 'text-red-700 hover:bg-red-50'
                : 'text-slate-400 hover:bg-slate-200'
            )}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Priority ({redFlagCount})</span>
          </button>
        </div>
      </div>

      {filteredQueue.length === 0 ? (
        <div className="p-6 text-center text-slate-400 text-xs">
          No patients match &quot;{searchQuery}&quot;
        </div>
      ) : (
        <div className="divide-y divide-slate-100 overflow-y-auto clinical-scroll flex-1">
          {filteredQueue.map((record) => {
        const { entry, physicianApproved } = record;
        const isSelected = selectedSessionId === entry.sessionId;
        const isAttended = physicianApproved || entry.isConsulted || false;

        return (
          <button
            key={entry.sessionId}
            onClick={() => handleSelect(entry.sessionId)}
            className={cn(
              'w-full text-left px-4 py-3 transition-all relative flex flex-col gap-1.5 border-b border-slate-100',
              isSelected
                ? 'bg-teal-50 border-l-2 border-l-teal-600'
                : entry.isRedFlag
                ? 'bg-red-50/40 border-l-2 border-l-red-400 hover:bg-red-50/60'
                : 'border-l-2 border-l-transparent hover:bg-slate-50',
              isAttended && 'opacity-50'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={cn('font-bold text-sm', isAttended ? 'text-slate-400 line-through' : isSelected ? 'text-teal-900' : 'text-slate-800')}>
                  #{entry.tokenNumber}
                </span>
                <span
                  className={cn(
                    'text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide border',
                    entry.isCompleted
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-sky-50 text-sky-700 border-sky-200'
                  )}
                >
                  {entry.isCompleted
                    ? 'Ready for Doctor'
                    : `In Interview (Turn ${record.historyState?.turn_count ?? entry.turnCount ?? 1})`}
                </span>
                {isAttended && (
                  <span className="flex items-center text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] font-bold gap-0.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Attended
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatRelativeTime(entry.arrivedAt)}
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <span className={cn('font-semibold text-sm truncate leading-tight', isAttended ? 'text-slate-400' : 'text-slate-900')}>{entry.patientName}</span>
              <span className="text-[11px] text-slate-400 shrink-0 tabular-nums">{entry.age}y · {entry.sex}</span>
            </div>

            {/* Document and intake status indicators */}
            <div className="flex items-center gap-2 text-xs">
              {record.documents && record.documents.length > 0 ? (
                <span className="text-[11px] bg-teal-50 border border-teal-200 text-teal-700 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {record.documents.length} {record.documents.length === 1 ? 'Doc' : 'Docs'}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> No Docs
                </span>
              )}

              {entry.isCompleted ? (
                <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Complete History
                </span>
              ) : (
                <span className="text-[11px] text-sky-700 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3 text-sky-600" /> Kiosk Intake Active
                </span>
              )}
            </div>

            {/* Red Flag Badge */}
            {entry.isRedFlag && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-semibold">
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
      )}
    </div>
  );
}
