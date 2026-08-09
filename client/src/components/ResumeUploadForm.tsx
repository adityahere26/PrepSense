import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { uploadMultipartApi, getStoredToken } from '../lib/api';

interface ResumeUploadFormProps {
  initialTargetRole?: string;
  resumeGroupId?: string;
  onUploadSuccess: (resumeData: any) => void;
  onCancel?: () => void;
}

const SUGGESTED_ROLES = [
  'Software Engineer',
  'Product Manager',
  'Digital Marketing',
  'Data Analyst',
  'UI/UX Designer',
  'Financial Analyst',
  'DevOps Engineer',
];

export const ResumeUploadForm: React.FC<ResumeUploadFormProps> = ({
  initialTargetRole = '',
  resumeGroupId,
  onUploadSuccess,
  onCancel,
}) => {
  const [targetRole, setTargetRole] = useState(initialTargetRole);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    setError(null);
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (!validTypes.includes(file.type) && !['pdf', 'docx', 'doc'].includes(extension || '')) {
      setError('Invalid file format. Please upload a PDF (.pdf) or Word document (.docx).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit. Please upload a smaller file.');
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetRole.trim()) {
      setError('Please specify your target role or field (e.g., Software Engineer, Product Manager).');
      return;
    }

    if (!selectedFile) {
      setError('Please select a resume file (PDF or DOCX) to upload.');
      return;
    }

    const token = getStoredToken();
    if (!token) {
      setError('Not authenticated. Please sign in to upload your resume.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setLoadingStep('Uploading file and analyzing with Gemini AI...');

    const formData = new FormData();
    formData.append('targetRole', targetRole.trim());
    if (resumeGroupId) {
      formData.append('resumeGroupId', resumeGroupId);
    }
    formData.append('resume', selectedFile);

    try {
      const data = await uploadMultipartApi<{ success: boolean; resume: any }>('/api/resume/upload', formData);

      if (data && data.resume) {
        setLoadingStep('Success!');
        onUploadSuccess(data.resume);
      } else {
        throw new Error('Server returned an empty resume response.');
      }
    } catch (err: any) {
      console.error('Resume upload error:', err);
      setError(err.message || 'An unexpected error occurred during upload. Please try again.');
    } finally {
      setIsUploading(false);
      setLoadingStep('');
    }
  };

  return (
    <Card className="glass-panel p-8 rounded-3xl border-teal-100 bg-white/95 shadow-md space-y-6 max-w-3xl mx-auto relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-teal-300/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-[#0d9488]">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="font-heading font-bold text-xl text-[#043c44]">
              {resumeGroupId ? 'Upload New Resume Version' : 'Upload Independent Resume'}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {resumeGroupId
                ? 'Upload an updated version of this resume. It will be added to this resume group history.'
                : 'Upload a brand new independent resume for parsing and AI analysis.'}
            </CardDescription>
          </div>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            title="Close form"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50/90 border border-red-200 text-red-700 text-xs flex items-start gap-3 shadow-xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-sm">Upload Error</p>
            <p className="text-xs text-red-600 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Target Role Free Text Input */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Target Role / Industry <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="e.g. Software Engineer, Product Manager, Digital Marketing"
            disabled={isUploading}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-[#043c44] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488] transition-all font-medium"
          />
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="text-[11px] text-slate-400 font-medium self-center">Quick Select:</span>
            {SUGGESTED_ROLES.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setTargetRole(role)}
                disabled={isUploading}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                  targetRole === role
                    ? 'bg-[#0d9488] text-white border-[#0d9488]'
                    : 'bg-teal-50/50 text-[#0d9488] border-teal-200/60 hover:bg-teal-100/60'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* File Dropzone */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Resume File (PDF or DOCX) <span className="text-red-500">*</span>
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
            disabled={isUploading}
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isDragOver
                ? 'border-[#0d9488] bg-teal-50/60 scale-[0.99]'
                : selectedFile
                ? 'border-teal-300 bg-teal-50/30'
                : 'border-slate-200 hover:border-teal-300 bg-slate-50/50 hover:bg-teal-50/20'
            }`}
          >
            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-teal-100 text-[#0d9488] flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="text-left space-y-0.5">
                  <p className="font-semibold text-sm text-[#043c44] truncate max-w-xs">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                  className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-3 pointer-events-none">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200/60 text-[#0d9488] flex items-center justify-center mx-auto shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#043c44]">
                    Drag and drop your resume here, or <span className="text-[#0d9488] underline">browse</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Supports PDF and DOCX files up to 10MB</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Loading Progress State */}
        {isUploading && (
          <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200/80 space-y-2 animate-in fade-in">
            <div className="flex items-center gap-3 text-[#043c44]">
              <Loader2 className="w-5 h-5 text-[#0d9488] animate-spin shrink-0" />
              <span className="text-xs font-semibold">{loadingStep}</span>
            </div>
            <div className="w-full bg-teal-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-[#0d9488] h-1.5 rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isUploading}
              className="px-5 py-2.5 h-auto rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-sm"
            >
              Cancel
            </Button>
          )}

          <Button
            type="submit"
            disabled={isUploading || !selectedFile || !targetRole.trim()}
            className="px-6 py-2.5 h-auto rounded-xl bg-[#043c44] hover:bg-[#074e58] text-white font-semibold text-sm transition-all shadow-md shadow-[#043c44]/20 flex items-center gap-2 border border-[#043c44] disabled:opacity-50"
          >
            {isUploading ? (
              <>Parsing Resume...</>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-teal-300" />
                Upload & Parse Resume
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
};
