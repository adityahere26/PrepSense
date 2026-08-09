import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  Mic,
  Sparkles,
  CheckCircle2,
  User,
  Plus,
  MessageSquarePlus,
  Send,
  Clock,
  AlertCircle,
  Loader2,
  ArrowRight,
  Upload,
  Calendar,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { ResumeUploadForm } from '../components/ResumeUploadForm';
import { ParsedResumeView } from '../components/ParsedResumeView';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface ResumeGroupItem {
  id: string;
  resumeGroupId: string;
  fileUrl: string;
  targetRole?: string | null;
  parsedJson: any;
  version: number;
  totalVersions: number;
  createdAt: string;
}

export const Dashboard: React.FC = () => {
  const { user, token } = useAuth();
  
  const [authorName, setAuthorName] = useState(user?.name || '');
  const [roleAchieved, setRoleAchieved] = useState(user?.targetRole || '');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Multi-Resume states
  const [resumesList, setResumesList] = useState<ResumeGroupItem[]>([]);
  const [activeResume, setActiveResume] = useState<ResumeGroupItem | null>(null);
  const [isLoadingResumes, setIsLoadingResumes] = useState<boolean>(true);
  const [showUploadForm, setShowUploadForm] = useState<boolean>(false);
  const [targetUploadGroupId, setTargetUploadGroupId] = useState<string | undefined>(undefined);
  const [userTargetRole, setUserTargetRole] = useState<string | null>(user?.targetRole || null);

  useEffect(() => {
    fetchResumes();
  }, [token]);

  const fetchResumes = async () => {
    if (!token) return;
    setIsLoadingResumes(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/resume`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok && data.success && Array.isArray(data.resumes)) {
        setResumesList(data.resumes);
        if (data.resumes.length > 0) {
          // Default to latest resume or preserve active selected resume
          setActiveResume((prev) => {
            if (prev) {
              const updated = data.resumes.find((r: ResumeGroupItem) => r.resumeGroupId === prev.resumeGroupId);
              return updated || data.resumes[0];
            }
            return data.resumes[0];
          });
          if (data.resumes[0].targetRole) {
            setUserTargetRole(data.resumes[0].targetRole);
          }
        } else {
          setActiveResume(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch user resumes list:', err);
    } finally {
      setIsLoadingResumes(false);
    }
  };

  const handleStartNewResumeUpload = () => {
    setTargetUploadGroupId(undefined);
    setShowUploadForm(true);
  };

  const handleStartNewVersionUpload = (resumeGroupId: string) => {
    setTargetUploadGroupId(resumeGroupId);
    setShowUploadForm(true);
  };

  const handleUploadSuccess = (uploadedResume: any) => {
    setShowUploadForm(false);
    setTargetUploadGroupId(undefined);
    fetchResumes();
  };

  const handleSubmitStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setErrorMessage('Please enter your success story before submitting.');
      return;
    }

    if (content.trim().length > 500) {
      setErrorMessage('Story must be 500 characters or less.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/success-stories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          authorName: authorName.trim() || user?.name || user?.email,
          roleAchieved: roleAchieved.trim() || userTargetRole || undefined,
          content: content.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit success story');
      }

      setIsSubmitted(true);
      setContent('');
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <Card className="glass-panel p-8 rounded-3xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-teal-100 bg-white/90 shadow-sm">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-[#0d9488] border border-teal-200/60 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Authenticated Candidate Dashboard
          </div>
          <h1 className="font-heading text-3xl font-extrabold text-[#043c44]">
            Welcome back, {user?.name || user?.email}!
          </h1>
          <p className="text-slate-600 text-sm">
            Manage your independent resumes, field-specific AI audits, and version histories.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10 shrink-0">
          <Button
            onClick={handleStartNewResumeUpload}
            className="px-5 py-2.5 h-auto rounded-xl bg-[#043c44] hover:bg-[#074e58] text-white font-semibold text-sm transition-all shadow-md shadow-[#043c44]/20 flex items-center gap-2 border border-[#043c44]"
          >
            <Plus className="w-4 h-4 text-teal-300" />
            Upload New Resume
          </Button>
        </div>

        {/* Glow decoration */}
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
      </Card>

      {/* Dashboard Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-panel p-6 rounded-2xl space-y-3 border-teal-100 bg-white/90 shadow-xs">
          <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 text-slate-500">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-sans">User Account</CardTitle>
            <User className="w-4 h-4 text-[#0d9488]" />
          </CardHeader>
          <CardContent className="p-0 space-y-1">
            <p className="text-lg font-bold text-[#043c44] truncate">{user?.email}</p>
            <CardDescription className="text-xs text-slate-500">Candidate Workspace</CardDescription>
          </CardContent>
        </Card>

        {/* Resumes Parsed Stat Card (Counts DISTINCT resumeGroupId values) */}
        <Card className="glass-panel p-6 rounded-2xl space-y-3 border-teal-100 bg-white/90 shadow-xs">
          <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 text-slate-500">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-sans">Resumes Parsed</CardTitle>
            <FileText className="w-4 h-4 text-[#06b6d4]" />
          </CardHeader>
          <CardContent className="p-0 space-y-1">
            <p className="text-3xl font-extrabold text-[#043c44]">{resumesList.length}</p>
            <CardDescription className="text-xs text-slate-500">
              {resumesList.length === 1
                ? '1 distinct resume uploaded'
                : resumesList.length > 1
                ? `${resumesList.length} distinct resumes uploaded`
                : 'No resumes uploaded yet'}
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="glass-panel p-6 rounded-2xl space-y-3 border-teal-100 bg-white/90 shadow-xs">
          <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 text-slate-500">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-sans">Interview Sessions</CardTitle>
            <Mic className="w-4 h-4 text-[#10b981]" />
          </CardHeader>
          <CardContent className="p-0 space-y-1">
            <p className="text-3xl font-extrabold text-[#043c44]">0</p>
            <CardDescription className="text-xs text-slate-500">Voice Mock Interview Engine Ready</CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Upload Form Modal/View */}
      {showUploadForm && (
        <ResumeUploadForm
          initialTargetRole={
            targetUploadGroupId
              ? resumesList.find((r) => r.resumeGroupId === targetUploadGroupId)?.targetRole || ''
              : ''
          }
          resumeGroupId={targetUploadGroupId}
          onUploadSuccess={handleUploadSuccess}
          onCancel={() => setShowUploadForm(false)}
        />
      )}

      {/* Distinct Resumes Cards Grid */}
      {isLoadingResumes ? (
        <Card className="glass-panel p-12 rounded-3xl text-center space-y-3 border-teal-100 bg-white/90 shadow-xs">
          <Loader2 className="w-8 h-8 text-[#0d9488] animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#043c44]">Loading resume profiles...</p>
        </Card>
      ) : resumesList.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold text-[#043c44]">
                Your Independent Resumes ({resumesList.length})
              </h2>
              <p className="text-xs text-slate-500">
                Select a resume to view its structured parsed fields, Gemini AI audit, and version history.
              </p>
            </div>
            <Button
              onClick={handleStartNewResumeUpload}
              variant="outline"
              className="px-4 py-2 h-auto text-xs font-semibold border-teal-200 text-[#0d9488] hover:bg-teal-50 rounded-xl"
            >
              + Upload Another Resume
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resumesList.map((item) => {
              const isSelected = activeResume?.resumeGroupId === item.resumeGroupId;
              const candidateName = item.parsedJson?.contact?.name || 'Resume Profile';
              const createdDate = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recently uploaded';

              return (
                <Card
                  key={item.resumeGroupId}
                  className={`glass-panel p-6 rounded-3xl border transition-all cursor-pointer space-y-4 flex flex-col justify-between relative overflow-hidden ${
                    isSelected
                      ? 'border-[#0d9488] ring-2 ring-[#0d9488]/20 bg-white shadow-md'
                      : 'border-slate-200/90 bg-white/80 hover:border-teal-300 hover:shadow-xs'
                  }`}
                  onClick={() => setActiveResume(item)}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-3 py-1 rounded-full bg-teal-50 text-[#0d9488] border border-teal-200/60 text-xs font-bold truncate max-w-[180px]">
                        Target: {item.targetRole || 'Professional'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-extrabold text-[11px] border border-slate-200 shrink-0">
                        v{item.version} ({item.totalVersions} {item.totalVersions === 1 ? 'ver' : 'vers'})
                      </span>
                    </div>

                    <div>
                      <h3 className="font-heading font-extrabold text-lg text-[#043c44] truncate">
                        {candidateName}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Uploaded {createdDate}
                      </p>
                    </div>

                    {item.parsedJson?.skills && item.parsedJson.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {item.parsedJson.skills.slice(0, 3).map((s: string, idx: number) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium"
                          >
                            {s}
                          </span>
                        ))}
                        {item.parsedJson.skills.length > 3 && (
                          <span className="text-[10px] px-1.5 py-0.5 text-slate-400 font-medium">
                            +{item.parsedJson.skills.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-bold">
                    <span className={`flex items-center gap-1 ${isSelected ? 'text-[#0d9488]' : 'text-slate-500'}`}>
                      {isSelected ? 'Active Profile' : 'Click to View'}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartNewVersionUpload(item.resumeGroupId);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-[#0d9488] transition-colors text-[11px] font-bold flex items-center gap-1 border border-slate-200"
                    >
                      <Upload className="w-3 h-3" />
                      + Upload New Ver
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ) : !showUploadForm ? (
        <Card className="glass-panel p-12 rounded-3xl text-center space-y-4 border-teal-100 bg-white/90 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto text-[#0d9488]">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#043c44]">No Resumes Uploaded Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Upload your PDF or Word resume to extract structured candidate details, execute deterministic format checks, and run role-specific AI content quality audits.
            </p>
          </div>
          <Button
            onClick={handleStartNewResumeUpload}
            className="px-6 py-2.5 h-auto rounded-xl bg-[#043c44] hover:bg-[#074e58] text-white font-semibold text-xs transition-all shadow-md shadow-[#043c44]/20 inline-flex items-center gap-2 border border-[#043c44]"
          >
            <Plus className="w-4 h-4 text-teal-300" />
            Upload Your First Resume
          </Button>
        </Card>
      ) : null}

      {/* Selected Active Resume Workspace */}
      {activeResume && !showUploadForm && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="font-heading font-extrabold text-xl text-[#043c44] flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#0d9488]" />
              Active Workspace: {activeResume.targetRole || 'Resume Workspace'} (v{activeResume.version})
            </h3>
          </div>

          <ParsedResumeView
            resume={activeResume}
            onReupload={() => handleStartNewVersionUpload(activeResume.resumeGroupId)}
          />
        </div>
      )}

      {/* Share Your Success Story Form Section */}
      <Card className="glass-panel p-8 rounded-3xl border-teal-100 bg-white/90 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-[#0d9488]">
            <MessageSquarePlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-xl text-[#043c44]">Share Your Success Story</h2>
            <p className="text-xs text-slate-600">
              Did PrepSense help you land an interview or job offer? Share your feedback to inspire fellow candidates!
            </p>
          </div>
        </div>

        {isSubmitted && (
          <div className="p-4 rounded-2xl bg-teal-50/90 border border-teal-200 text-[#043c44] flex items-start gap-3 shadow-xs">
            <Clock className="w-5 h-5 text-[#0d9488] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-sm">Pending Review Confirmation</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Thank you for sharing your experience! Your story has been submitted and is currently <strong>pending review</strong>. Once approved, it will be showcased publicly on the PrepSense home page.
              </p>
              <button
                type="button"
                onClick={() => setIsSubmitted(false)}
                className="text-xs font-semibold text-[#0d9488] hover:underline pt-1 inline-block"
              >
                Submit another story
              </button>
            </div>
          </div>
        )}

        {!isSubmitted && (
          <form onSubmit={handleSubmitStory} className="space-y-4">
            {errorMessage && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Author Name</label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="e.g. Aditya S."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-[#043c44] focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Role Achieved</label>
                <input
                  type="text"
                  value={roleAchieved}
                  onChange={(e) => setRoleAchieved(e.target.value)}
                  placeholder="e.g. Software Engineer @ Google"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-[#043c44] focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Your Feedback / Story</label>
              <textarea
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share how PrepSense resume analysis or mock interviews helped your preparation..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-xs text-[#043c44] focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488] resize-none"
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting || !content.trim()}
                className="px-6 py-2.5 h-auto rounded-xl bg-[#043c44] hover:bg-[#074e58] text-white font-semibold text-xs transition-all shadow-md shadow-[#043c44]/20 flex items-center gap-2 border border-[#043c44] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-teal-300" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-teal-300" />
                    Submit Story
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};
