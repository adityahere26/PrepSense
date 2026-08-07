import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, Mic, Sparkles, CheckCircle2, User, Plus, MessageSquarePlus, Send, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const Dashboard: React.FC = () => {
  const { user, token } = useAuth();
  
  const [authorName, setAuthorName] = useState(user?.name || '');
  const [roleAchieved, setRoleAchieved] = useState(user?.targetRole || '');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
          roleAchieved: roleAchieved.trim() || undefined,
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header Banner */}
      <Card className="glass-panel p-8 rounded-3xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-teal-100 bg-white/90 shadow-sm">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-[#0d9488] border border-teal-200/60 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Authenticated via OAuth & JWT
          </div>
          <h1 className="font-heading text-3xl font-extrabold text-[#043c44]">
            Welcome back, {user?.name || user?.email}!
          </h1>
          <p className="text-slate-600 text-sm">
            {user?.targetRole
              ? `Target Role: ${user.targetRole}`
              : 'Target role not set yet — upload a resume to configure.'}
          </p>
        </div>

        <div className="flex items-center gap-3 z-10">
          <Button className="px-5 py-2.5 h-auto rounded-xl bg-[#043c44] hover:bg-[#074e58] text-white font-semibold text-sm transition-all shadow-md shadow-[#043c44]/20 flex items-center gap-2 border border-[#043c44]">
            <Plus className="w-4 h-4 text-teal-300" />
            Upload Resume
          </Button>
        </div>

        {/* Glow decoration */}
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
      </Card>

      {/* Dashboard Stats / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-panel p-6 rounded-2xl space-y-3 border-teal-100 bg-white/90 shadow-xs">
          <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 text-slate-500">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-sans">User Account</CardTitle>
            <User className="w-4 h-4 text-[#0d9488]" />
          </CardHeader>
          <CardContent className="p-0 space-y-1">
            <p className="text-lg font-bold text-[#043c44] truncate">{user?.email}</p>
            <CardDescription className="text-xs text-slate-500">ID: {user?.id}</CardDescription>
          </CardContent>
        </Card>

        <Card className="glass-panel p-6 rounded-2xl space-y-3 border-teal-100 bg-white/90 shadow-xs">
          <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 text-slate-500">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-sans">Resumes Parsed</CardTitle>
            <FileText className="w-4 h-4 text-[#06b6d4]" />
          </CardHeader>
          <CardContent className="p-0 space-y-1">
            <p className="text-3xl font-extrabold text-[#043c44]">0</p>
            <CardDescription className="text-xs text-slate-500">Ready for Phase 1 Upload Flow</CardDescription>
          </CardContent>
        </Card>

        <Card className="glass-panel p-6 rounded-2xl space-y-3 border-teal-100 bg-white/90 shadow-xs">
          <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 text-slate-500">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-sans">Interview Sessions</CardTitle>
            <Mic className="w-4 h-4 text-[#10b981]" />
          </CardHeader>
          <CardContent className="p-0 space-y-1">
            <p className="text-3xl font-extrabold text-[#043c44]">0</p>
            <CardDescription className="text-xs text-slate-500">Ready for Phase 3 Voice Module</CardDescription>
          </CardContent>
        </Card>
      </div>

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

        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmitStory} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Author Name</label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-[#043c44] focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Role Achieved <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={roleAchieved}
                onChange={(e) => setRoleAchieved(e.target.value)}
                placeholder="e.g. Frontend Engineer at TechCorp"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-[#043c44] focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Your Story / Testimonial</label>
              <span className={`text-xs ${content.length > 450 ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
                {content.length}/500 chars
              </span>
            </div>
            <textarea
              rows={4}
              maxLength={500}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tell us how PrepSense helped you analyze your resume, improve interview answers, or boost your confidence..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-[#043c44] focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488] resize-none"
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="px-6 py-2.5 h-auto rounded-xl bg-[#043c44] hover:bg-[#074e58] text-white font-semibold text-sm transition-all shadow-md shadow-[#043c44]/20 flex items-center gap-2 border border-[#043c44] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>Submitting...</>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-teal-300" />
                  Submit Story
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* Placeholder Empty State */}
      <Card className="glass-panel p-12 rounded-3xl text-center space-y-4 border-dashed border-teal-200 bg-white/90 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#0d9488] border border-teal-200/60 flex items-center justify-center mx-auto">
          <Sparkles className="w-6 h-6" />
        </div>
        <CardHeader className="p-0">
          <CardTitle className="font-heading font-bold text-xl text-[#043c44]">Your Workspace is Ready</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <CardDescription className="text-slate-600 text-sm max-w-md mx-auto">
            The monorepo architecture, Express JWT server, and protected React client route are successfully linked!
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
};


