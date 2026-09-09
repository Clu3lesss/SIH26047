'use client';

import { useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, FileSpreadsheet, Stethoscope, Syringe } from 'lucide-react';
import { playBeep, playSuccess } from '@/lib/sound';
import { useDoctorStore } from '@/store/doctorStore';

interface ClinicalActionToolbarProps {
  sessionId: string;
}

export function ClinicalActionToolbar({ sessionId }: ClinicalActionToolbarProps) {
  const { approveRecord } = useDoctorStore();
  const [orderedActions, setOrderedActions] = useState<string[]>([]);

  const handleOrder = (actionName: string) => {
    playBeep();
    setOrderedActions((prev) =>
      prev.includes(actionName) ? prev.filter((a) => a !== actionName) : [...prev, actionName]
    );
  };

  const handleCompleteConsult = () => {
    approveRecord(sessionId);
    playSuccess();
  };

  const actions = [
    { id: 'ecg', label: 'Stat ECG', icon: Activity, urgent: true },
    { id: 'vitals', label: 'Check Vitals & SpO2', icon: Stethoscope },
    { id: 'labs', label: 'Routine Bloods (CBC, RBS)', icon: Syringe },
    { id: 'er_triage', label: 'Direct ER Triage', icon: AlertCircle, urgent: true },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-500 uppercase mr-1">Quick Orders:</span>
        {actions.map((act) => {
          const Icon = act.icon;
          const isSelected = orderedActions.includes(act.id);

          return (
            <button
              key={act.id}
              onClick={() => handleOrder(act.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
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
              {isSelected && <span className="ml-1 text-[10px]">✓</span>}
            </button>
          );
        })}
      </div>

      <button
        onClick={handleCompleteConsult}
        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm"
      >
        <CheckCircle2 className="w-4 h-4" />
        <span>Complete Consultation</span>
      </button>
    </div>
  );
}
