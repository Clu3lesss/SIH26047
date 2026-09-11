'use client';

import type { DashavidhaPariksha } from '@/types/intake';
import { cn } from '@/lib/utils';
import {
  Flame,
  Activity,
  HeartPulse,
  Scale,
  Brain,
  Sparkles,
  Shield,
  Apple,
  Dumbbell,
  Clock,
  Compass,
} from 'lucide-react';

interface DashavidhaMatrixProps {
  dashavidha: DashavidhaPariksha;
}

export function DashavidhaMatrix({ dashavidha }: DashavidhaMatrixProps) {
  const items = [
    {
      num: '1',
      title: 'Prakriti',
      subtitle: 'Body Constitution',
      value: dashavidha.prakriti,
      icon: Compass,
      desc: 'Genetic/inherent doshic balance',
    },
    {
      num: '2',
      title: 'Vikriti',
      subtitle: 'Current Morbidity',
      value: dashavidha.vikriti,
      icon: Flame,
      desc: 'Active dosha exacerbation',
    },
    {
      num: '3',
      title: 'Sara',
      subtitle: 'Tissue Vitality',
      value: dashavidha.sara,
      icon: Sparkles,
      desc: 'Dhatu excellence & vigor',
    },
    {
      num: '4',
      title: 'Samhanana',
      subtitle: 'Compactness',
      value: dashavidha.samhanana,
      icon: Shield,
      desc: 'Skeletal & muscular firmness',
    },
    {
      num: '5',
      title: 'Pramana',
      subtitle: 'Proportions',
      value: dashavidha.pramana,
      icon: Scale,
      desc: 'Body symmetry & dimensions',
    },
    {
      num: '6',
      title: 'Satmya',
      subtitle: 'Adaptability',
      value: dashavidha.satmya,
      icon: HeartPulse,
      desc: 'Dietary & seasonal tolerance',
    },
    {
      num: '7',
      title: 'Sattva',
      subtitle: 'Mental Resilience',
      value: dashavidha.sattva,
      icon: Brain,
      desc: 'Psychological strength & calmness',
    },
    {
      num: '8',
      title: 'Ahara Shakti',
      subtitle: 'Digestive Power (Agni)',
      value: dashavidha.ahara_shakti,
      icon: Apple,
      desc: 'Abhyavaharana & Jarana shakti',
    },
    {
      num: '9',
      title: 'Vyayama Shakti',
      subtitle: 'Endurance',
      value: dashavidha.vyayama_shakti,
      icon: Dumbbell,
      desc: 'Physical stamina & workload tolerance',
    },
    {
      num: '10',
      title: 'Vaya',
      subtitle: 'Biological Age',
      value: dashavidha.vaya,
      icon: Clock,
      desc: 'Developmental lifecycle phase',
    },
  ];

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wide">
              AYUSH · AIIA Protocol
            </span>
            <h4 className="font-bold text-slate-900 text-sm tracking-wide">
              Dashavidha Pariksha (दशविध परीक्षा)
            </h4>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            10-fold Ayurvedic clinical diagnostic matrix for comprehensive holistic profiling
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-teal-50 border border-teal-200 text-teal-800">
            Constitution: {dashavidha.prakriti || 'Assessing'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isFilled = Boolean(item.value);

          return (
            <div
              key={item.num}
              className={cn(
                'p-3 rounded-md border text-xs flex flex-col justify-between transition-colors min-h-[90px]',
                isFilled
                  ? 'bg-slate-50 border-slate-200 text-slate-800'
                  : 'bg-slate-50/40 border-dashed border-slate-200 text-slate-400'
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <Icon className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>{item.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">#{item.num}</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight mb-2">{item.subtitle}</p>
              </div>

              <div className="mt-1 pt-1.5 border-t border-slate-100">
                <p className={cn('text-xs font-semibold', isFilled ? 'text-slate-900' : 'italic text-slate-400')}>
                  {item.value || 'Not reported'}
                </p>
                <p className="text-[9px] text-slate-400 mt-0.5 truncate">{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {dashavidha.ahara_vihara && (
        <div className="bg-emerald-50/50 border border-emerald-200 rounded-md p-3 text-xs">
          <div className="font-bold text-emerald-900 text-xs uppercase tracking-wide mb-1 flex items-center gap-1.5">
            <Apple className="w-3.5 h-3.5 text-emerald-700" />
            Ahara & Vihara Lifestyle Diagnostic
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-slate-700">
            <div>
              <span className="text-[10px] font-bold text-emerald-800 block">Dietary Routine:</span>
              <p className="text-xs">{dashavidha.ahara_vihara.dietary_habits || 'Regular'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-800 block">Daily Regimen (Dinacharya):</span>
              <p className="text-xs">{dashavidha.ahara_vihara.lifestyle_routine || 'Standard'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-800 block">Koshtha (Bowel Pattern):</span>
              <p className="text-xs font-semibold">{dashavidha.ahara_vihara.koshtha || 'Madhyama'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}