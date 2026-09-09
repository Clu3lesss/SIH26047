'use client';

import type { PatientHistoryState } from '@/types/intake';
import { AlertCircle, Pill, ShieldCheck, Users2, Wine, ActivitySquare, HeartPulse } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HistorySectionCardProps {
  state: PatientHistoryState;
}

export function HistorySectionCard({ state }: HistorySectionCardProps) {
  const hasAllergies = state.allergies.length > 0;

  return (
    <div className="space-y-4">
      {/* Critical Allergies & Current Medications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Allergies */}
        <div
          className={cn(
            'rounded-2xl border p-4 shadow-sm',
            hasAllergies
              ? 'bg-red-50/60 border-red-200 text-red-950'
              : 'bg-white border-slate-200'
          )}
        >
          <div className="flex items-center gap-2 mb-2 font-bold text-sm">
            <AlertCircle
              className={cn('w-4 h-4', hasAllergies ? 'text-red-600' : 'text-slate-400')}
            />
            <span className={hasAllergies ? 'text-red-700' : 'text-slate-700'}>
              Allergies
            </span>
            {hasAllergies && (
              <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-extrabold uppercase">
                Caution
              </span>
            )}
          </div>
          {hasAllergies ? (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {state.allergies.map((allergy, i) => (
                <span
                  key={i}
                  className="bg-red-200/70 border border-red-300 text-red-900 px-2.5 py-1 rounded-lg text-xs font-bold"
                >
                  ⚠️ {allergy}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              {state.allergies_asked ? 'No known drug or food allergies confirmed.' : 'Not asked.'}
            </p>
          )}
        </div>

        {/* Current Medications */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2 font-bold text-sm text-slate-700">
            <Pill className="w-4 h-4 text-teal-600" />
            <span>Current Medications</span>
          </div>
          {state.medications.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {state.medications.map((med, i) => (
                <span
                  key={i}
                  className="bg-teal-50 border border-teal-200 text-teal-900 px-2.5 py-1 rounded-lg text-xs font-semibold"
                >
                  {med}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              {state.medications_asked ? 'No ongoing medications reported.' : 'Not asked.'}
            </p>
          )}
        </div>
      </div>

      {/* Past Medical & Surgical History */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            Past Medical Conditions
          </h4>
          {state.conditions.length > 0 ? (
            <ul className="space-y-1 text-xs text-slate-700">
              {state.conditions.map((cond, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                  <span className="font-medium">{cond}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400 italic">
              {state.conditions_asked ? 'None reported.' : 'Not asked.'}
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
            <ActivitySquare className="w-4 h-4 text-teal-600" />
            Past Surgical History
          </h4>
          {state.surgeries.length > 0 ? (
            <ul className="space-y-1 text-xs text-slate-700">
              {state.surgeries.map((surg, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  <span className="font-medium">{surg}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400 italic">
              {state.surgeries_asked ? 'No previous operations reported.' : 'Not asked.'}
            </p>
          )}
        </div>
      </div>

      {/* Family & Social History */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
            <Users2 className="w-4 h-4 text-teal-600" />
            Family History
          </h4>
          {state.family_history.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-slate-700">
              {state.family_history.map((item, i) => (
                <li key={i} className="flex items-baseline justify-between border-b border-slate-50 pb-1">
                  <span className="font-semibold text-slate-800 capitalize">{item.relation}:</span>
                  <span className="text-slate-600">{item.condition}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400 italic">
              {state.family_history_asked ? 'No significant hereditary conditions.' : 'Not asked.'}
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
            <Wine className="w-4 h-4 text-teal-600" />
            Personal & Social Habits
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 p-2 rounded-lg">
              <span className="text-[10px] text-slate-400 block font-semibold">Smoking</span>
              <span className="font-medium text-slate-800">{state.social_history.smoking || 'N/A'}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg">
              <span className="text-[10px] text-slate-400 block font-semibold">Alcohol</span>
              <span className="font-medium text-slate-800">{state.social_history.alcohol || 'N/A'}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg">
              <span className="text-[10px] text-slate-400 block font-semibold">Diet</span>
              <span className="font-medium text-slate-800">{state.social_history.diet || 'N/A'}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg">
              <span className="text-[10px] text-slate-400 block font-semibold">Occupation</span>
              <span className="font-medium text-slate-800">{state.social_history.occupation || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Review of Systems (ROS) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <HeartPulse className="w-4 h-4 text-teal-600" />
          Review of Systems (ROS) Checklist
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
          {[
            { label: 'Cardiovascular', val: state.review_of_systems.cardiovascular },
            { label: 'Respiratory', val: state.review_of_systems.respiratory },
            { label: 'Gastrointestinal', val: state.review_of_systems.gastrointestinal },
            { label: 'Neurological', val: state.review_of_systems.neurological },
            { label: 'Musculoskeletal', val: state.review_of_systems.musculoskeletal },
          ].map((ros, i) => (
            <div key={i} className="border border-slate-100 rounded-xl p-2.5 bg-slate-50/60">
              <span className="font-bold text-slate-700 block text-[11px] mb-1">{ros.label}</span>
              <span className="text-slate-600 block text-[11px] leading-relaxed">
                {ros.val || 'Unremarkable / None'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
