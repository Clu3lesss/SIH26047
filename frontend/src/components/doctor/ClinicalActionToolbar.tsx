'use client';

import { useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, Stethoscope, Syringe } from 'lucide-react';
import { playBeep, playSuccess } from '@/lib/sound';
import { useDoctorStore } from '@/store/doctorStore';
import { markSessionAttended } from '@/lib/actions/db';

interface ClinicalActionToolbarProps {
  sessionId: string;
}

export function ClinicalActionToolbar({ sessionId }: ClinicalActionToolbarProps) {
  const { queue, markAttended } = useDoctorStore();
  const currentRecord = queue.find((r) => r.entry.sessionId === sessionId);
  const isAttended = currentRecord?.physicianApproved || currentRecord?.entry.isConsulted || false;

  const [orderedActions, setOrderedActions] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleOrder = (actionName: string) => {
    playBeep();
    setOrderedActions((prev) =>
      prev.includes(actionName) ? prev.filter((a) => a !== actionName) : [...prev, actionName]
    );
  };

  const handleToggleAttended = async () => {
    playSuccess();
    markAttended(sessionId);

    setIsUpdating(true);
    try {
      await markSessionAttended(sessionId);
    } catch (e) {
      console.warn('[Notice]: Failed to persist attended state:', e);
    } finally {
      setIsUpdating(false);
    }
  };

  const actions = [
    { id: 'ecg', label: 'Stat ECG', icon: Activity, urgent: true },
    { id: 'vitals', label: 'Check Vitals & SpO2', icon: Stethoscope },
    { id: 'labs', label: 'Routine Bloods (CBC, RBS)', icon: Syringe },
    { id: 'er_triage', label: 'Direct ER Triage', icon: AlertCircle, urgent: true },
  ];

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mr-1">Quick Orders:</span>
        {actions.map((act) => {
          const Icon = act.icon;
          const isSelected = orderedActions.includes(act.id);

          return (
            <button
              key={act.id}
              onClick={() => handleOrder(act.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                isSelected
                  ? act.urgent
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-teal-600 text-white border-teal-600'
                  : act.urgent
                  ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{act.label}</span>
              {isSelected && <CheckCircle2 className="w-3 h-3 ml-0.5" />}
            </button>
          );
        })}
      </div>

      <button
        onClick={handleToggleAttended}
        disabled={isUpdating}
        className="font-bold px-4 py-2 rounded-md text-xs flex items-center gap-2 transition-all border bg-emerald-600 hover:bg-emerald-700 text-white border-transparent disabled:opacity-50"
      >
        <CheckCircle2 className="w-4 h-4" />
        {isUpdating ? 'Completing...' : 'Mark as Attended (Complete)'}
      </button>
    </div>
  );
}
