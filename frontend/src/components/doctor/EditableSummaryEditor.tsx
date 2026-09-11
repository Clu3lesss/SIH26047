'use client';

import { useState } from 'react';
import type { PhysicianSummary } from '@/types/intake';
import { useDoctorStore } from '@/store/doctorStore';
import { useSummaryGeneration } from '@/hooks/useSummaryGeneration';
import { CheckCircle, Copy, Edit3, Eye, FileText, Loader2, Printer, Sparkles, AlertTriangle } from 'lucide-react';
import { playSuccess } from '@/lib/sound';
import { savePhysicianApproval } from '@/lib/actions/db';
import { cn } from '@/lib/utils';

interface EditableSummaryEditorProps {
  sessionId: string;
}

export function EditableSummaryEditor({ sessionId }: EditableSummaryEditorProps) {
  const { getSelectedRecord, updateEditedSummary, approveRecord } = useDoctorStore();
  const { generateSummary, isLoading: isGenerating } = useSummaryGeneration();
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const record = getSelectedRecord();

  if (!record) return null;

  const { summary, summaryLoading, editedSummary, historyState, physicianApproved } = record;

  const currentSummary = editedSummary || summary;

  const handleGenerate = () => {
    generateSummary(sessionId, historyState);
  };

  const handleCopy = () => {
    if (!currentSummary) return;
    const text = `
=== MEDIKIOSK CLINICAL HISTORY SUMMARY ===
Patient: ${record.entry.patientName} (${record.entry.age}y, ${record.entry.sex})
Token: #${record.entry.tokenNumber} | Session: ${sessionId}

1. CHIEF COMPLAINT:
${currentSummary.chief_complaint}

2. HISTORY OF PRESENT ILLNESS:
${currentSummary.history_of_present_illness}

3. PAST MEDICAL HISTORY:
${currentSummary.past_medical_history}

4. PAST SURGICAL HISTORY:
${currentSummary.past_surgical_history}

5. MEDICATIONS:
${currentSummary.medications}

6. ALLERGIES:
${currentSummary.allergies}

7. FAMILY HISTORY:
${currentSummary.family_history}

8. SOCIAL HISTORY:
${currentSummary.social_history}

9. REVIEW OF SYSTEMS:
${currentSummary.review_of_systems}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApprove = () => {
    approveRecord(sessionId);
    playSuccess();
    if (currentSummary) {
      savePhysicianApproval(sessionId, currentSummary).then((res) => {
        if (!res.success) {
          console.warn('[Supabase Approval Notice]:', res.error);
        }
      });
    }
  };

  if (summaryLoading || isGenerating) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-3" />
        <h4 className="font-bold text-slate-800 text-sm">Generating Clinical Summary...</h4>
        <p className="text-xs text-slate-500 mt-1">Pipeline 2 is synthesizing structured data into physician notes.</p>
      </div>
    );
  }

  if (!currentSummary) {
    return (
      <div className="bg-white rounded-lg border border-dashed border-slate-300 p-8 text-center">
        <Sparkles className="w-8 h-8 text-teal-600 mx-auto mb-2" />
        <h4 className="font-bold text-slate-800 text-sm">AI Summary Not Generated</h4>
        <p className="text-xs text-slate-500 mb-4">
          Click below to generate a formatted physician note draft using Pipeline 2.
        </p>
        <button
          onClick={handleGenerate}
          className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-2 rounded-md text-xs flex items-center gap-1.5 mx-auto transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Generate Physician Summary
        </button>
      </div>
    );
  }

  const sections: Array<{ key: keyof PhysicianSummary; title: string }> = [
    { key: 'chief_complaint', title: 'Chief Complaint' },
    { key: 'history_of_present_illness', title: 'History of Present Illness' },
    { key: 'past_medical_history', title: 'Past Medical History' },
    { key: 'past_surgical_history', title: 'Past Surgical History' },
    { key: 'medications', title: 'Medications' },
    { key: 'allergies', title: 'Allergies' },
    { key: 'family_history', title: 'Family History' },
    { key: 'social_history', title: 'Personal & Social History' },
    { key: 'review_of_systems', title: 'Review of Systems' },
  ];

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
      {/* Header & Utility Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-teal-600" />
            AI Clinical Note {isEditing ? '(Editing Draft)' : '(Physician Draft)'}
          </h4>
          <p className="text-xs text-slate-400">Pipeline 2 synthesized clinical prose</p>
        </div>

        {/* Utility actions — left of toolbar */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
          >
            {isEditing ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
            <span>{isEditing ? 'View' : 'Edit'}</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Sections rendering / editing */}
      <div className="space-y-3.5 text-xs">
        {sections.map(({ key, title }) => {
          const isAllergiesSection = key === 'allergies';
          const hasAllergyContent = isAllergiesSection && currentSummary[key] && currentSummary[key] !== 'None reported' && currentSummary[key] !== 'No known allergies';
          return (
            <div
              key={key}
              className={cn(
                'space-y-1 rounded',
                hasAllergyContent && 'bg-red-50/50 border border-red-200 p-2.5 -mx-1'
              )}
            >
              <span className={cn(
                'font-bold block tracking-wide uppercase text-[10px]',
                hasAllergyContent ? 'text-red-700 flex items-center gap-1' : 'text-slate-700'
              )}>
                {hasAllergyContent && <AlertTriangle className="w-3 h-3 text-red-600" />}
                {title}
              </span>
              {isEditing ? (
                <textarea
                  value={currentSummary[key] || ''}
                  onChange={(e) => updateEditedSummary(sessionId, key, e.target.value)}
                  rows={2}
                  className="w-full p-2.5 border border-slate-300 rounded bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-sans text-xs text-slate-900 transition-all"
                />
              ) : (
                <p className="text-slate-800 leading-relaxed bg-slate-50/50 p-2.5 rounded border border-slate-100">
                  {currentSummary[key] || <span className="italic text-slate-400">None reported</span>}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Primary CTA — Approve & Sign — full width at bottom */}
      <div className="pt-3 border-t border-slate-100">
        <button
          onClick={handleApprove}
          disabled={physicianApproved}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-bold transition-colors',
            physicianApproved
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-default'
              : 'bg-teal-600 hover:bg-teal-700 text-white'
          )}
        >
          <CheckCircle className="w-4 h-4" />
          {physicianApproved ? 'Note Approved & Signed' : 'Approve & Sign Clinical Note'}
        </button>
      </div>
    </div>
  );
}


