'use client';

import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import { useDoctorStore } from '@/store/doctorStore';
import { cn } from '@/lib/utils';
import { playAlert } from '@/lib/sound';
import { useEffect } from 'react';

export function RedFlagAlertBanner() {
  const { redFlagAlerts, dismissRedFlag, selectPatient } = useDoctorStore();

  useEffect(() => {
    if (redFlagAlerts.length > 0) {
      playAlert();
    }
  }, [redFlagAlerts.length]);

  if (redFlagAlerts.length === 0) return null;

  const topAlert = redFlagAlerts[0];

  const tierBg =
    topAlert.tier === 'high'
      ? 'bg-red-600 text-white'
      : topAlert.tier === 'medium'
      ? 'bg-amber-600 text-white'
      : 'bg-yellow-500 text-slate-900';

  return (
    <div className={cn('px-4 py-3 flex items-center justify-between gap-3', tierBg)}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-extrabold uppercase tracking-wide text-xs px-2 py-0.5 rounded bg-black/20">
              {topAlert.tier} Risk Emergency
            </span>
            <span className="text-xs opacity-90 truncate font-mono">
              Session: {topAlert.sessionId}
            </span>
          </div>
          <p className="text-sm font-semibold truncate mt-0.5">
            {topAlert.reason}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => selectPatient(topAlert.sessionId)}
          className="bg-white text-red-700 font-bold px-3 py-1.5 rounded text-xs hover:bg-red-50 flex items-center gap-1 transition-colors"
        >
          View Record <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => dismissRedFlag(topAlert.sessionId)}
          className="p-1.5 hover:bg-black/10 rounded text-white/80 hover:text-white transition-colors"
          title="Dismiss Alert"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

