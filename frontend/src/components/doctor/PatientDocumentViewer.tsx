'use client';

import { useState } from 'react';
import { FileText, Image as ImageIcon, Eye, Download, X, AlertCircle, FileCheck } from 'lucide-react';
import type { UploadedDocItem } from '@/store/doctorStore';
import { cn, formatTimestamp } from '@/lib/utils';

interface PatientDocumentViewerProps {
  sessionId: string;
  documents?: UploadedDocItem[];
}

export function PatientDocumentViewer({ sessionId, documents = [] }: PatientDocumentViewerProps) {
  const [selectedDoc, setSelectedDoc] = useState<UploadedDocItem | null>(null);

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-teal-600" />
          <h3 className="font-bold text-slate-800 text-sm">
            Uploaded Prescriptions & Reports
          </h3>
        </div>
        <span
          className={cn(
            'text-xs font-bold px-2.5 py-0.5 rounded',
            documents.length > 0
              ? 'bg-teal-100 text-teal-800'
              : 'bg-slate-100 text-slate-500'
          )}
        >
          {documents.length} {documents.length === 1 ? 'Document' : 'Documents'}
        </span>
      </div>

      <div className="p-5">
        {documents.length === 0 ? (
          <div className="py-6 flex flex-col items-center justify-center text-center text-slate-400">
            <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mb-2">
              <FileCheck className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">No Patient Documents Uploaded</p>
            <p className="text-xs text-slate-400 mt-0.5 max-w-xs">
              The patient did not upload any previous prescriptions or laboratory reports at the kiosk.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {documents.map((doc) => {
              const isImage = doc.fileUrl.startsWith('data:image') || doc.fileUrl.match(/\.(jpg|jpeg|png|webp)$/i);

              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className="group relative rounded-lg border border-slate-200 bg-slate-50 hover:bg-teal-50/50 hover:border-teal-300 transition-all cursor-pointer p-3 flex flex-col items-center text-center"
                >
                  <div className="w-full h-24 rounded-lg overflow-hidden bg-white border border-slate-200 flex items-center justify-center mb-2 relative">
                    {isImage ? (
                      <img
                        src={doc.fileUrl}
                        alt={doc.fileName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <FileText className="w-10 h-10 text-slate-400 group-hover:text-teal-600 transition-colors" />
                    )}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Eye className="w-5 h-5" />
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-slate-800 truncate w-full" title={doc.fileName}>
                    {doc.fileName}
                  </p>
                  <span className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">
                    {doc.documentType}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Document Full-Screen Modal Preview */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{selectedDoc.fileName}</h4>
                <p className="text-xs text-slate-500 capitalize">{selectedDoc.documentType} · Session {sessionId}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={selectedDoc.fileUrl}
                  download={selectedDoc.fileName}
                  className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                  title="Download File"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                  title="Close preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-100 min-h-[300px]">
              {selectedDoc.fileUrl.startsWith('data:image') || selectedDoc.fileUrl.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                <img
                  src={selectedDoc.fileUrl}
                  alt={selectedDoc.fileName}
                  className="max-w-full max-h-[70vh] rounded-lg object-contain shadow-md"
                />
              ) : (
                <iframe
                  src={selectedDoc.fileUrl}
                  title={selectedDoc.fileName}
                  className="w-full h-[70vh] rounded-lg border border-slate-300"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

