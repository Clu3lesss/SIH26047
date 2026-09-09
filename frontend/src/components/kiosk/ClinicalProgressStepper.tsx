'use client';

import { Check, Circle, Loader } from 'lucide-react';
import type { PatientHistoryState } from '@/types/intake';
import { cn } from '@/lib/utils';

interface ClinicalProgressStepperProps {
  state: PatientHistoryState;
}

interface Section {
  id: string;
  label: string;
  emoji: string;
  isComplete: (s: PatientHistoryState) => boolean;
}

const SECTIONS: Section[] = [
  {
    id: 'chief_complaint',
    label: 'Chief Complaint',
    emoji: '🩺',
    isComplete: (s) => !!s.chief_complaint,
  },
  {
    id: 'hpi',
    label: 'Illness Details',
    emoji: '📋',
    isComplete: (s) => {
      const h = s.hpi;
      return !!(h.site && h.onset && h.character && h.severity);
    },
  },
  {
    id: 'conditions',
    label: 'Past Medical History',
    emoji: '🏥',
    isComplete: (s) => s.conditions_asked,
  },
  {
    id: 'medications',
    label: 'Medications & Allergies',
    emoji: '💊',
    isComplete: (s) => s.medications_asked && s.allergies_asked,
  },
  {
    id: 'family_history',
    label: 'Family History',
    emoji: '👨‍👩‍👧',
    isComplete: (s) => s.family_history_asked,
  },
  {
    id: 'social_history',
    label: 'Personal & Social',
    emoji: '🌿',
    isComplete: (s) => s.social_history_asked,
  },
  {
    id: 'review_of_systems',
    label: 'Review of Systems',
    emoji: '🫀',
    isComplete: (s) => s.review_of_systems_asked,
  },
];

export function ClinicalProgressStepper({ state }: ClinicalProgressStepperProps) {
  // Find the first incomplete section
  const firstIncompleteIdx = SECTIONS.findIndex((s) => !s.isComplete(state));
  const completedCount = SECTIONS.filter((s) => s.isComplete(state)).length;
  const progressPct = Math.round((completedCount / SECTIONS.length) * 100);

  return (
    <div className="p-4 space-y-3">
      {/* Overall progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>Interview Progress</span>
          <span className="font-semibold text-teal-700">{progressPct}%</span>
        </div>
        <div className="w-full bg-clinical-muted rounded-full h-2">
          <div
            className="bg-teal-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Section list */}
      {SECTIONS.map((section, idx) => {
        const isComplete = section.isComplete(state);
        const isActive = idx === firstIncompleteIdx;

        return (
          <div
            key={section.id}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
              isActive && 'bg-teal-50 border border-teal-200',
              isComplete && 'opacity-70'
            )}
          >
            {/* Status icon */}
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                isComplete
                  ? 'bg-emerald-500 text-white'
                  : isActive
                  ? 'bg-teal-500 text-white'
                  : 'bg-clinical-muted text-slate-400'
              )}
            >
              {isComplete ? (
                <Check className="w-3.5 h-3.5" />
              ) : isActive ? (
                <Loader className="w-3.5 h-3.5 animate-spin-slow" />
              ) : (
                <Circle className="w-3 h-3" />
              )}
            </div>

            {/* Label */}
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  'text-xs font-semibold',
                  isComplete
                    ? 'text-emerald-700 line-through'
                    : isActive
                    ? 'text-teal-700'
                    : 'text-slate-500'
                )}
              >
                {section.emoji} {section.label}
              </div>
              {isActive && (
                <div className="text-xs text-teal-500 mt-0.5">Currently asking…</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
