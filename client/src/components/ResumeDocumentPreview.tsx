import React, { useState } from 'react';
import {
  FileText,
  ExternalLink,
  Download,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  FileCheck,
  AlertCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ResumeDocumentPreviewProps {
  fileUrl?: string;
  targetRole?: string | null;
  embedded?: boolean;
}

export const ResumeDocumentPreview: React.FC<ResumeDocumentPreviewProps> = ({
  fileUrl,
  targetRole,
  embedded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  if (!fileUrl) return null;

  // Determine file format from URL
  const cleanUrl = fileUrl.split('?')[0].toLowerCase();
  const isPdf = cleanUrl.endsWith('.pdf') || fileUrl.toLowerCase().includes('.pdf');
  const isDocx =
    cleanUrl.endsWith('.docx') ||
    cleanUrl.endsWith('.doc') ||
    fileUrl.toLowerCase().includes('.docx') ||
    fileUrl.toLowerCase().includes('.doc');

  if (embedded) {
    return (
      <div className="w-full transition-all duration-300">
        {isPdf ? (
          <div className="relative rounded-2xl overflow-hidden border border-slate-200/90 bg-slate-50 shadow-inner">
            <iframe
              src={`${fileUrl}#toolbar=0&navpanes=0`}
              className="w-full h-[550px] sm:h-[650px] rounded-2xl"
              title="Embedded Resume PDF Viewer"
            />
          </div>
        ) : (
          /* Clean DOCX Fallback Card */
          <div className="p-8 sm:p-12 rounded-2xl border border-dashed border-teal-200/80 bg-white/90 text-center space-y-5 max-w-xl mx-auto shadow-xs">
            <div className="w-16 h-16 rounded-3xl bg-teal-50 border border-teal-200 text-[#0d9488] flex items-center justify-center mx-auto shadow-sm">
              <FileCheck className="w-8 h-8 text-[#0d9488]" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                <AlertCircle className="w-3.5 h-3.5" />
                Microsoft Word Document (.docx)
              </span>
              <h4 className="font-heading font-extrabold text-lg text-[#043c44]">
                Native Preview Unavailable for DOCX
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Browser security standards do not render Microsoft Word files natively inside inline frames. You can open or download the original file below to view it cleanly.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#043c44] hover:bg-[#074e58] text-white font-semibold text-xs transition-all shadow-md shadow-[#043c44]/20"
              >
                <ExternalLink className="w-4 h-4 text-teal-300" />
                Open in New Tab
              </a>

              <a
                href={fileUrl}
                download
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-all shadow-xs"
              >
                <Download className="w-4 h-4 text-slate-500" />
                Download File
              </a>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="glass-panel rounded-3xl border-teal-100 bg-white/95 shadow-sm overflow-hidden transition-all duration-300">
      {/* Card Header Bar */}
      <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 text-[#0d9488] flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-base text-[#043c44]">
                Original Uploaded Resume
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-100/80 text-[#0d9488] text-[10px] font-extrabold uppercase">
                {isPdf ? 'PDF' : isDocx ? 'DOCX' : 'DOCUMENT'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {targetRole ? `${targetRole} Resume` : 'Candidate Document'} • Inline File Viewer
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isPdf && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="text-xs font-medium rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center gap-1.5"
            >
              {isFullScreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-slate-500" /> Compact View
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-slate-500" /> Full Height
                </>
              )}
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-medium rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center gap-1.5"
          >
            {isExpanded ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-slate-500" /> Collapse Viewer
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-slate-500" /> Expand Viewer
              </>
            )}
          </Button>

          <Button
            asChild
            size="sm"
            className="text-xs font-semibold rounded-xl bg-[#043c44] hover:bg-[#074e58] text-white flex items-center gap-1.5 shadow-xs"
          >
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5 text-teal-300" /> Open File
            </a>
          </Button>
        </div>
      </div>

      {/* Embedded Viewer Body */}
      {isExpanded && (
        <div className="p-4 sm:p-6 bg-slate-100/60">
          {isPdf ? (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-inner">
              <iframe
                src={`${fileUrl}#toolbar=0&navpanes=0`}
                className={`w-full transition-all duration-300 rounded-2xl ${
                  isFullScreen ? 'h-[850px]' : 'h-[550px] sm:h-[650px]'
                }`}
                title="Embedded Resume PDF Viewer"
              />
            </div>
          ) : (
            /* Clean DOCX Fallback Card */
            <div className="p-8 sm:p-12 rounded-2xl border border-dashed border-teal-200/80 bg-white/90 text-center space-y-5 max-w-xl mx-auto shadow-xs">
              <div className="w-16 h-16 rounded-3xl bg-teal-50 border border-teal-200 text-[#0d9488] flex items-center justify-center mx-auto shadow-sm">
                <FileCheck className="w-8 h-8 text-[#0d9488]" />
              </div>

              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Microsoft Word Document (.docx)
                </span>
                <h4 className="font-heading font-extrabold text-lg text-[#043c44]">
                  Native Preview Unavailable for DOCX
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Browser security standards do not render Microsoft Word files natively inside inline frames. You can open or download the original file below to view it cleanly.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#043c44] hover:bg-[#074e58] text-white font-semibold text-xs transition-all shadow-md shadow-[#043c44]/20"
                >
                  <ExternalLink className="w-4 h-4 text-teal-300" />
                  Open in New Tab
                </a>

                <a
                  href={fileUrl}
                  download
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-all shadow-xs"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  Download File
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
