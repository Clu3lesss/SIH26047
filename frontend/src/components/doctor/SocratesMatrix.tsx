'use client';

import type { HPI } from '@/types/intake';
import { cn } from '@/lib/utils';
import { Activity, Clock, Compass, HelpCircle, ShieldAlert, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';

interface SocratesMatrixProps {
  hpi: HPI;
}

export function SocratesMatrix({ hpi }: SocratesMatrixProps) {
  // Parse severity number if possible for visual indicator
  const severityMatch = hpi.severity?.match(/\d+/);
  const severityVal = severityMatch ? parseInt(severityMatch[0], 10) : null;

  const items = [
    {
      label: 'Site / Location',
      value: hpi.site,
      icon: Compass,
      desc: 'Anatomical location of symptom',
    },
    {
      label: 'Onset & Origin',
      value: hpi.onset,
      icon: Clock,
      desc: 'When and how symptom began',
    },
    {
      label: 'Character / Nature',
      value: hpi.character,
      icon: Activity,
      desc: 'Quality (sharp, dull, crushing)',
    },
    {
      label: 'Radiation',
      value: hpi.radiation,
      icon: Sparkles,
      desc: 'Spread to other regions',
    },
    {
      label: 'Timing & Pattern',
      value: hpi.timing,
      icon: Clock,
      desc: 'Constant, intermittent, episodic',
    },
    {
      label: 'Exacerbating Factors',
      value: hpi.exacerbating_factors?.length ? hpi.exacerbating_factors.join(', ') : null,
      icon: TrendingUp,
      desc: 'Triggers or aggravators',
    },
    {
      label: 'Relieving Factors',
      value: hpi.relieving_factors?.length ? hpi.relieving_factors.join(', ') : null,
      icon: TrendingDown,
      desc: 'What eases the symptom',
    },
    {
      label: 'Associated Symptoms',
      value: hpi.associated_symptoms?.length ? hpi.associated_symptoms.join(', ') : null,
      icon: HelpCircle,
      desc: 'Concurrent signs or symptoms',
    },
  ];

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h4 className="font-bold text-slate-800 text-sm tracking-wide flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-600" />
            HPI — SOCRATES Clinical Matrix
          </h4>
          <p className="text-xs text-slate-400">Systematic symptom characterization</p>
        </div>

        {/* Severity Bar */}
        {hpi.severity && (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md">
            <span className="text-xs text-slate-500 font-medium">Severity:</span>
            <span
              className={cn(
                'text-xs font-extrabold px-2 py-0.5 rounded',
                severityVal && severityVal >= 7
                  ? 'bg-red-100 text-red-700'
                  : severityVal && severityVal >= 4
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              )}
            >
              {hpi.severity}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((item, idx) => {
          const Icon = item.icon;
          const isFilled = Boolean(item.value);

          return (
            <div
              key={idx}
              className={cn(
                'p-3 rounded-md border transition-all text-xs',
                isFilled
                  ? 'bg-slate-50/70 border-slate-200 text-slate-800'
                  : 'bg-slate-50/20 border-dashed border-slate-200 text-slate-400'
              )}
            >
              <div className="flex items-center gap-1.5 font-semibold text-slate-600 mb-1">
                <Icon className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>{item.label}</span>
              </div>
              <p className={cn('text-xs font-medium', isFilled ? 'text-slate-900' : 'italic text-slate-400')}>
                {item.value || 'Not reported / Unobtained'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
