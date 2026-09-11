'use client';

import { Check, Circle, Loader, Stethoscope, ClipboardList, ShieldCheck, Pill, Users2, Coffee, Heart } from 'lucide-react';
import type { PatientHistoryState } from '@/types/intake';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface ClinicalProgressStepperProps {
  state: PatientHistoryState;
}

interface Section {
  id: string;
  label: string;
  icon: LucideIcon;
  isComplete: (s: PatientHistoryState) => boolean;
}

const SECTIONS: Section[] = [
  {
    id: 'chief_complaint',
    label: 'Chief Complaint',
    icon: Stethoscope,
    isComplete: (s) => !!s.chief_complaint,
  },
  {
    id: 'hpi',
    label: 'Illness Details',
    icon: ClipboardList,
    isComplete: (s) => {
      const h = s.hpi;
      return !!(h.site && h.onset && h.character && h.severity);
    },
  },
  {
    id: 'conditions',
    label: 'Past Medical History',
    icon: ShieldCheck,
    isComplete: (s) => s.conditions_asked,
  },
  {
    id: 'medications',
    label: 'Medications & Allergies',
    icon: Pill,
    isComplete: (s) => s.medications_asked && s.allergies_asked,
  },
  {
    id: 'family_history',
    label: 'Family History',
    icon: Users2,
    isComplete: (s) => s.family_history_asked,
  },
  {
    id: 'social_history',
    label: 'Personal & Social',
    icon: Coffee,
    isComplete: (s) => s.social_history_asked,
  },
  {
    id: 'review_of_systems',
    label: 'Review of Systems',
    icon: Heart,
    isComplete: (s) => s.review_of_systems_asked,
  },
];

export function ClinicalProgressStepper({ state }: ClinicalProgressStepperProps) {
  const maxQuestions = 6;
  const isCompleted = state.status === 'completed';
  const currentQuestionNum = isCompleted ? maxQuestions : Math.min(state.turn_count, maxQuestions);
  const progressPct = isCompleted ? 100 : Math.round((currentQuestionNum / maxQuestions) * 100);
  const firstIncompleteIdx = isCompleted ? -1 : SECTIONS.findIndex((s) => !s.isComplete(state));

  return (
    <div className="p-4 space-y-3">
      {/* Overall progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span className="font-medium text-slate-700">
            {isCompleted ? 'Intake Completed' : `Question ${currentQuestionNum} of ${maxQuestions}`}
          </span>
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
        const isComplete = isCompleted || section.isComplete(state);
        const isActive = !isCompleted && idx === firstIncompleteIdx;
        const SectionIcon = section.icon;

        return (
          <div
            key={section.id}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
              isActive && 'bg-teal-50 border border-teal-200',
              isComplete && 'opacity-70'
            )}
          >
            {/* Status icon */}
            <div
              className={cn(
                'w-6 h-6 rounded-md flex items-center justify-center shrink-0',
                isComplete
                  ? 'bg-emerald-500 text-white'
                  : isActive
                  ? 'bg-teal-500 text-white'
                  : 'bg-slate-100 text-slate-400'
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
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <SectionIcon className={cn('w-3.5 h-3.5 shrink-0', isComplete ? 'text-emerald-600' : isActive ? 'text-teal-600' : 'text-slate-400')} />
              <div
                className={cn(
                  'text-xs font-medium',
                  isComplete
                    ? 'text-slate-800'
                    : isActive
                    ? 'text-teal-700 font-bold'
                    : 'text-slate-500'
                )}
              >
                {section.label}
              </div>
            </div>
            {isActive && (
              <div className="text-xs text-teal-500">Active</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
