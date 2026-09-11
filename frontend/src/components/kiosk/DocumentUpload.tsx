'use client';

import { useState, useRef } from 'react';
import { Camera, FileText, Plus, ArrowRight, Info, CheckCircle2, Loader2, X } from 'lucide-react';
import { useKioskStore } from '@/store/kioskStore';
import { saveUploadedDocument } from '@/lib/actions/db';
import { cn } from '@/lib/utils';

interface UploadedDoc {
  id: string;
  name: string;
  dataUrl: string;
  isSaved?: boolean;
}

export function DocumentUpload() {
  const { sessionId, setStep } = useKioskStore();
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setIsUploading(true);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        // 1. Add to local UI state
        setDocs((prev) => [
          ...prev,
          {
            id: docId,
            name: file.name,
            dataUrl,
            isSaved: false,
          },
        ]);

        // 2. Persist to Supabase so doctor can immediately view it
        if (sessionId) {
          try {
            const res = await saveUploadedDocument(sessionId, dataUrl, file.name, 'prescription');
            if (res.success) {
              setDocs((prev) =>
                prev.map((d) => (d.id === docId ? { ...d, isSaved: true } : d))
              );
            }
          } catch (err) {
            console.error('[Document Upload Error]:', err);
          }
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    });
    // Reset input so same file can be added again
    e.target.value = '';
  };

  const removeDoc = (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-clinical-offwhite p-6">
      <div className="w-full max-w-xl">
        <h2 className="text-kiosk-xl text-slate-900 mb-2 text-center">Upload Documents</h2>
        <p className="text-kiosk-sm text-slate-600 text-center mb-6">
          Do you have any old prescriptions, lab reports, or discharge summaries?
          Please upload a photo — the AI will extract all the relevant details automatically.
        </p>

        {/* Info banner */}
        <div className="flex items-start gap-3 bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
          <Info className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
          <p className="text-sm text-teal-800">
            OCR document extraction is coming soon. Your uploads are saved for the doctor to view during consultation.
          </p>
        </div>

        {/* Upload area */}
        <div
          className="w-full border-2 border-dashed border-clinical-muted rounded-lg p-10 text-center bg-white hover:border-teal-400 hover:bg-teal-50 transition-all cursor-pointer mb-6"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-16 h-16 bg-teal-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Camera className="w-8 h-8 text-teal-600" />
          </div>
          <p className="text-kiosk-md text-slate-700 mb-2 font-semibold">
            Tap to take photo or upload
          </p>
          <p className="text-sm text-slate-500">
            Supports JPG, PNG, PDF
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Uploaded doc previews */}
        {docs.length > 0 && (
          <div className="space-y-3 mb-6">
            <h3 className="font-semibold text-slate-700 text-sm">
              Uploaded ({docs.length})
            </h3>
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 p-3"
              >
                {doc.dataUrl.startsWith('data:image') ? (
                  <img
                    src={doc.dataUrl}
                    alt={doc.name}
                    className="w-12 h-12 object-cover rounded-lg border border-clinical-muted"
                  />
                ) : (
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-slate-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{doc.name}</p>
                  <p className={"text-xs font-medium flex items-center gap-1.5 " + (doc.isSaved ? "text-emerald-600" : "text-amber-600 animate-pulse")}>{doc.isSaved ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />}{doc.isSaved ? "Saved to Doctor" : "Saving..."}</p>
                </div>
                <button
                  onClick={() => removeDoc(doc.id)}
                  className="text-slate-400 hover:text-red-500 transition-colors p-1.5 rounded hover:bg-red-50"><X className="w-4 h-4" /></button>
              </div>
            ))}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border border-slate-200 rounded-lg py-3 text-sm font-medium text-slate-600 hover:bg-clinical-light transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add another document
            </button>
          </div>
        )}

        {/* Continue */}
        <button
          onClick={() => setStep('complete')}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-3 text-kiosk-sm touch-target transition-colors"
        >
          {docs.length > 0 ? `Continue with ${docs.length} document(s)` : 'Skip — No documents'}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

