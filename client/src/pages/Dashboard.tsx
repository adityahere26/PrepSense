import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  Mic,
  Sparkles,
  CheckCircle2,
  User,
  Plus,
  Send,
  Loader2,
  ArrowRight,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Award,
  History,
  Target,
  BarChart3,
  ExternalLink,
  MessageSquarePlus,
  Clock,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiErrorBoundary } from '../components/ApiErrorBoundary';
import { ResumeUploadForm } from '../components/ResumeUploadForm';
import { ParsedResumeView } from '../components/ParsedResumeView';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface ResumeVersionItem {
  id: string;
  resumeGroupId: string;
  fileUrl: string;
  parsedJson: any;
  version: number;
  aiQualityScore?: number | null;
  createdAt: string;
}

export interface ResumeGroupItem {
  id: string;
  resumeGroupId: string;
  fileUrl: string;
  targetRole?: string | null;
  parsedJson: any;
  version: number;
  aiQualityScore?: number | null;
  totalVersions: number;
  createdAt: string;
  versions?: ResumeVersionItem[];
}

export interface PastSessionItem {
  id: string;
  targetRole: string;
  status: string; // 'completed' | 'in_progress'
  createdAt: string;
  completedAt?: string | null;
  overallScore: number | null;
  questionsCount?: number;
  answeredCount?: number;
}

export interface RecurringImprovementArea {
  theme: string;
  count: number;
  description: string;
}

export interface SuccessStoryItem {
  id: string;
  authorName: string;
  roleAchieved?: string | null;
  content: string;
  createdAt: string;
}

const CustomDarkTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#043c44] text-white p-3 rounded-xl border border-teal-500/30 shadow-lg text-xs space-y-1">
        <p className="font-bold text-teal-300">{data.targetRole}</p>
        <p className="text-slate-300">Date: {data.date}</p>
        <p className="text-sm font-extrabold text-emerald-400">Score: {data.score}/100</p>
      </div>
    );
  }
  return null;
};

import { MockInterviewStepPreview } from '../components/MockInterviewStepPreview';
import { InterviewLoadingOverlay } from '../components/InterviewLoadingOverlay';

export const Dashboard: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // Story submission state
  const [authorName, setAuthorName] = useState(user?.name || '');
  const [roleAchieved, setRoleAchieved] = useState(user?.targetRole || '');
  const [content, setContent] = useState('');
  const [isSubmittingStory, setIsSubmittingStory] = useState(false);
  const [isStorySubmitted, setIsStorySubmitted] = useState(false);
  const [storyErrorMessage, setStoryErrorMessage] = useState<string | null>(null);

  // Local interaction states
  const [activeResumeGroup, setActiveResumeGroup] = useState<ResumeGroupItem | null>(null);
  const [showUploadForm, setShowUploadForm] = useState<boolean>(false);
  const [targetUploadGroupId, setTargetUploadGroupId] = useState<string | undefined>(undefined);
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({});
  const [isStartingInterview, setIsStartingInterview] = useState<boolean>(false);
  const [startingResumeId, setStartingResumeId] = useState<string | null>(null);
  const [startingRole, setStartingRole] = useState<string>('Software Engineer');
  const [selectingGroupId, setSelectingGroupId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'resumes' | 'sessions' | 'community'>('resumes');
  const [showAllResumeGroups, setShowAllResumeGroups] = useState<boolean>(false);

  const handleSelectResumeGroup = (group: ResumeGroupItem) => {
    setSelectingGroupId(group.resumeGroupId);
    setActiveResumeGroup(group);
    setTimeout(() => {
      setSelectingGroupId(null);
    }, 400);
  };

  // 1. TanStack Query: Fetch Resumes List
  const {
    data: resumesList = [],
    isLoading: isLoadingResumes,
    isError: isErrorResumes,
    error: errorResumes,
    refetch: refetchResumes,
  } = useQuery<ResumeGroupItem[]>({
    queryKey: ['resumes', token],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/resume`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to load candidate resumes');
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Server error loading resumes');
      return data.resumes || [];
    },
    enabled: !!token,
  });

  // Automatically update active resume selection when resumesList changes
  React.useEffect(() => {
    if (resumesList.length > 0 && !activeResumeGroup) {
      setActiveResumeGroup(resumesList[0]);
    }
  }, [resumesList, activeResumeGroup]);

  // 2. TanStack Query: Fetch Interview Sessions & Aggregated Analytics
  const {
    data: sessionsData,
    isLoading: isLoadingSessions,
    isError: isErrorSessions,
    error: errorSessions,
    refetch: refetchSessions,
  } = useQuery<{ pastSessions: PastSessionItem[]; recurringAreas: RecurringImprovementArea[]; scoreTrendData: any[] }>({
    queryKey: ['sessionsAndAnalytics', token],
    queryFn: async () => {
      const sessionsRes = await fetch(`${API_BASE_URL}/api/interview/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!sessionsRes.ok) throw new Error('Failed to load past interview sessions');
      const sessionsJson = await sessionsRes.json();
      const pastSessions: PastSessionItem[] = sessionsJson.sessions || [];

      // Format score trend
      const completed = pastSessions
        .filter((s) => s.status === 'completed' || (s.overallScore !== null && s.overallScore > 0))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      const scoreTrendData = completed.map((s) => ({
        id: s.id,
        targetRole: s.targetRole,
        date: new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        score: s.overallScore || 0,
      }));

      // Fetch analytics
      const analyticsRes = await fetch(`${API_BASE_URL}/api/interview/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const analyticsJson = analyticsRes.ok ? await analyticsRes.json() : {};
      const recurringAreas: RecurringImprovementArea[] = analyticsJson.recurringImprovementAreas || [];

      return { pastSessions, recurringAreas, scoreTrendData };
    },
    enabled: !!token,
  });

  const pastSessions = sessionsData?.pastSessions || [];
  const recurringAreas = sessionsData?.recurringAreas || [];
  const scoreTrendData = sessionsData?.scoreTrendData || [];

  // 3. TanStack Query: Fetch Success Stories
  const {
    data: successStories = [],
    isLoading: isLoadingStories,
    refetch: refetchStories,
  } = useQuery<SuccessStoryItem[]>({
    queryKey: ['successStories'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/success-stories`);
      if (!res.ok) throw new Error('Failed to load success stories');
      const data = await res.json();
      return data.stories || [];
    },
  });

  const handleStartMockInterview = async (resumeId: string, targetRole: string) => {
    if (!token) return;
    const roleName = targetRole || user?.targetRole || 'Software Engineer';
    setIsStartingInterview(true);
    setStartingResumeId(resumeId);
    setStartingRole(roleName);
    try {
      const response = await fetch(`${API_BASE_URL}/api/interview/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resumeId,
          targetRole: roleName,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success && data.session) {
        navigate(`/interview/${data.session.id}`);
      } else {
        alert(`Failed to create interview session: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error starting mock interview:', err);
      alert('Network error initiating mock interview session.');
    } finally {
      setIsStartingInterview(false);
      setStartingResumeId(null);
    }
  };

  const toggleVersionExpand = (resumeGroupId: string) => {
    setExpandedVersions((prev) => ({
      ...prev,
      [resumeGroupId]: !prev[resumeGroupId],
    }));
  };

  const handleStartNewResumeUpload = () => {
    setTargetUploadGroupId(undefined);
    setShowUploadForm(true);
  };

  const handleStartNewVersionUpload = (resumeGroupId: string) => {
    setTargetUploadGroupId(resumeGroupId);
    setShowUploadForm(true);
  };

  const handleUploadSuccess = () => {
    setShowUploadForm(false);
    setTargetUploadGroupId(undefined);
    refetchResumes();
  };

  const handleSubmitStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setStoryErrorMessage('Please enter your success story before submitting.');
      return;
    }

    if (content.trim().length > 500) {
      setStoryErrorMessage('Story must be 500 characters or less.');
      return;
    }

    setIsSubmittingStory(true);
    setStoryErrorMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/success-stories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          authorName: authorName.trim() || user?.name || user?.email,
          roleAchieved: roleAchieved.trim() || user?.targetRole || undefined,
          content: content.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit success story');
      }

      setIsStorySubmitted(true);
      setContent('');
      refetchStories();
    } catch (err: any) {
      setStoryErrorMessage(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsSubmittingStory(false);
    }
  };

  // Compute overall average score across completed sessions
  const completedSessions = pastSessions.filter((s) => s.status === 'completed' && s.overallScore !== null);
  const avgInterviewScore =
    completedSessions.length > 0
      ? Math.round(completedSessions.reduce((acc, s) => acc + (s.overallScore || 0), 0) / completedSessions.length)
      : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <Card className="glass-panel p-6 sm:p-8 rounded-3xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-teal-100 bg-white/90 shadow-sm">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-[#0d9488] border border-teal-200/60 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Authenticated Candidate Dashboard
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#043c44] tracking-tight">
            Welcome back, {user?.name || user?.email}!
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm max-w-xl">
            Track your resume iterations, ATS optimization scores, voice interview practice, and recurring growth areas.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10 w-full sm:w-auto shrink-0">
          <Button
            onClick={handleStartNewResumeUpload}
            className="w-full sm:w-auto px-5 py-2.5 h-auto rounded-xl bg-[#043c44] hover:bg-[#074e58] text-white font-semibold text-xs sm:text-sm transition-colors shadow-md shadow-[#043c44]/20 flex items-center justify-center gap-2 border border-[#043c44]"
          >
            <Plus className="w-4 h-4 text-teal-300" />
            Upload New Resume
          </Button>
        </div>

        {/* Glow decoration */}
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
      </Card>

      {/* Dashboard Top Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="glass-panel p-5 sm:p-6 rounded-2xl space-y-3 border-teal-100 bg-white/90 shadow-xs">
          <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 text-slate-500">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-sans">User Account</CardTitle>
            <User className="w-4 h-4 text-[#0d9488]" />
          </CardHeader>
          <CardContent className="p-0 space-y-1">
            <p className="text-base sm:text-lg font-bold text-[#043c44] truncate">{user?.email}</p>
            <CardDescription className="text-xs text-slate-500">Candidate Workspace</CardDescription>
          </CardContent>
        </Card>

        <Card className="glass-panel p-5 sm:p-6 rounded-2xl space-y-3 border-teal-100 bg-white/90 shadow-xs">
          <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 text-slate-500">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-sans">Resumes Parsed</CardTitle>
            <FileText className="w-4 h-4 text-[#06b6d4]" />
          </CardHeader>
          <CardContent className="p-0 space-y-1">
            {isLoadingResumes ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <p className="text-2xl sm:text-3xl font-extrabold text-[#043c44]">{resumesList.length}</p>
            )}
            <CardDescription className="text-xs text-slate-500">
              {resumesList.length === 1
                ? '1 distinct resume group'
                : resumesList.length > 1
                ? `${resumesList.length} distinct resume groups`
                : 'No resumes uploaded yet'}
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="glass-panel p-5 sm:p-6 rounded-2xl space-y-3 border-teal-100 bg-white/90 shadow-xs">
          <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 text-slate-500">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-sans">Interview Sessions</CardTitle>
            <Mic className="w-4 h-4 text-[#10b981]" />
          </CardHeader>
          <CardContent className="p-0 space-y-1">
            {isLoadingSessions ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <p className="text-2xl sm:text-3xl font-extrabold text-[#043c44]">{pastSessions.length}</p>
            )}
            <CardDescription className="text-xs text-slate-500">
              {completedSessions.length} completed session{completedSessions.length === 1 ? '' : 's'}
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="glass-panel p-5 sm:p-6 rounded-2xl space-y-3 border-teal-100 bg-white/90 shadow-xs">
          <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 text-slate-500">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-sans">Average Score</CardTitle>
            <Award className="w-4 h-4 text-[#0d9488]" />
          </CardHeader>
          <CardContent className="p-0 space-y-1">
            {isLoadingSessions ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <p className="text-2xl sm:text-3xl font-extrabold text-[#043c44]">
                {avgInterviewScore !== null ? `${avgInterviewScore}/100` : '--'}
              </p>
            )}
            <CardDescription className="text-xs text-slate-500">
              {completedSessions.length > 0 ? 'Across completed interviews' : 'Complete 1 session to score'}
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Analytics & Score Progress Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts Line Chart for Score Trend */}
        <Card className="glass-panel lg:col-span-2 p-5 sm:p-6 rounded-3xl space-y-4 border-teal-100 bg-white/90 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#0d9488]" />
                <h2 className="font-heading font-bold text-lg sm:text-xl text-[#043c44]">Interview Score Progress</h2>
              </div>
              <p className="text-xs text-slate-500">
                Track overall mock interview performance trends across completed voice sessions.
              </p>
            </div>
            {scoreTrendData.length >= 2 && (
              <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                {scoreTrendData[scoreTrendData.length - 1].score - scoreTrendData[0].score >= 0
                  ? `+${scoreTrendData[scoreTrendData.length - 1].score - scoreTrendData[0].score} pts trend`
                  : `${scoreTrendData[scoreTrendData.length - 1].score - scoreTrendData[0].score} pts trend`}
              </span>
            )}
          </div>

          {isLoadingSessions ? (
            <div className="py-8 space-y-3">
              <Skeleton className="h-44 w-full rounded-2xl" />
            </div>
          ) : isErrorSessions ? (
            <ApiErrorBoundary
              title="Failed to Load Score Trend"
              error={errorSessions}
              onRetry={refetchSessions}
              className="my-4"
            />
          ) : scoreTrendData.length < 2 ? (
            <div className="glass-panel p-6 sm:p-8 rounded-2xl text-center space-y-3 border-teal-100/60 bg-teal-50/40 my-4 flex flex-col items-center justify-center min-h-[220px]">
              <div className="w-12 h-12 rounded-2xl bg-white border border-teal-200 flex items-center justify-center text-[#0d9488] shadow-xs">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-sm">
                <p className="font-bold text-sm text-[#043c44]">Complete a few sessions to see your trend</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  You need at least 2 completed mock interview sessions to visualize score progression and track performance improvement.
                </p>
              </div>
              {resumesList.length > 0 && (
                <Button
                  onClick={() => handleStartMockInterview(resumesList[0].id, resumesList[0].targetRole || 'Software Engineer')}
                  className="px-4 py-2 h-auto rounded-xl bg-[#043c44] hover:bg-[#074e58] text-white font-semibold text-xs transition-colors flex items-center gap-2 mt-2"
                >
                  <Mic className="w-3.5 h-3.5 text-teal-300" />
                  Start a Mock Session
                </Button>
              )}
            </div>
          ) : (
            <div className="w-full pt-2 min-h-[220px]">
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={scoreTrendData} margin={{ top: 10, right: 15, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                  <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                  <Tooltip content={<CustomDarkTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#0d9488"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#0d9488', strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 7, fill: '#043c44', stroke: '#0d9488', strokeWidth: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Aggregated Most Frequently Recurring Improvement Areas */}
        <Card className="glass-panel p-5 sm:p-6 rounded-3xl space-y-4 border-teal-100 bg-white/90 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#0d9488]" />
              <h2 className="font-heading font-bold text-lg sm:text-xl text-[#043c44]">Recurring Weak Areas</h2>
            </div>
            <p className="text-xs text-slate-500">
              Aggregated growth themes extracted across evaluated interview answers.
            </p>
          </div>

          {isLoadingSessions ? (
            <div className="space-y-3 py-2">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          ) : recurringAreas.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-2 my-auto">
              <Target className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">No recurring feedback themes yet</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Complete voice mock interview sessions to unlock AI insights into your communication patterns and key focus areas.
              </p>
            </div>
          ) : (
            <div className="space-y-3 my-auto">
              {recurringAreas.slice(0, 4).map((area, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-gradient-to-r from-teal-50/70 to-slate-50 border border-teal-100 hover:border-teal-300 transition-colors duration-150 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-[#043c44] flex items-center gap-1.5 truncate">
                      <Target className="w-3.5 h-3.5 text-[#0d9488] shrink-0" />
                      {area.theme}
                    </p>
                    <span className="px-2 py-0.5 rounded-full bg-teal-100/80 text-[#0d9488] text-[10px] font-extrabold shrink-0">
                      {area.count} {area.count === 1 ? 'flag' : 'flags'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">{area.description}</p>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Updated after each evaluation</span>
            <span className="font-semibold text-[#0d9488]">STAR Feedback</span>
          </div>
        </Card>
      </div>

      {/* Main Content Tabs Navigation */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 gap-4 overflow-x-auto">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('resumes')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 ${
                activeTab === 'resumes'
                  ? 'bg-[#043c44] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-teal-50/60 hover:text-[#043c44]'
              }`}
            >
              <FileText className="w-4 h-4 text-teal-300" />
              Resumes ({resumesList.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sessions')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 ${
                activeTab === 'sessions'
                  ? 'bg-[#043c44] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-teal-50/60 hover:text-[#043c44]'
              }`}
            >
              <Mic className="w-4 h-4 text-teal-300" />
              Mock Sessions ({pastSessions.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('community')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 ${
                activeTab === 'community'
                  ? 'bg-[#043c44] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-teal-50/60 hover:text-[#043c44]'
              }`}
            >
              <MessageSquarePlus className="w-4 h-4 text-teal-300" />
              Share Story
            </button>
          </div>

          {activeTab === 'resumes' && (
            <Button
              size="sm"
              onClick={handleStartNewResumeUpload}
              className="text-xs font-semibold rounded-xl bg-teal-50 text-[#043c44] border border-teal-200/80 hover:bg-teal-100 shrink-0"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Upload Resume
            </Button>
          )}
        </div>

        {/* Modal for Resume Upload Form */}
        {showUploadForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-teal-100 relative">
              <button
                type="button"
                onClick={() => setShowUploadForm(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition-colors"
              >
                ✕
              </button>
              <h3 className="font-heading text-xl font-bold text-[#043c44] mb-4">
                {targetUploadGroupId ? 'Upload New Version of Resume' : 'Upload Resume for AI Analysis'}
              </h3>
              <ResumeUploadForm
                resumeGroupId={targetUploadGroupId}
                onUploadSuccess={handleUploadSuccess}
              />
            </div>
          </div>
        )}

        {/* TAB 1: RESUMES */}
        {activeTab === 'resumes' && (
          <div className="space-y-6">
            {isLoadingResumes ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Skeleton className="h-64 rounded-3xl" />
                <Skeleton className="h-64 rounded-3xl col-span-2" />
              </div>
            ) : isErrorResumes ? (
              <ApiErrorBoundary
                title="Failed to Load Candidate Resumes"
                error={errorResumes}
                onRetry={refetchResumes}
              />
            ) : resumesList.length === 0 ? (
              /* Requirement (2): Encouraging Empty State for Resumes */
              <Card className="glass-panel p-8 sm:p-12 rounded-3xl text-center space-y-4 border-dashed border-teal-200 bg-white/90 max-w-xl mx-auto shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 text-[#0d9488] border border-teal-200/70 flex items-center justify-center mx-auto shadow-xs">
                  <FileText className="w-7 h-7" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-heading font-bold text-xl text-[#043c44]">No Resumes Uploaded Yet</h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
                    Upload your resume to get instant role-specific ATS scoring, section-by-section feedback, format compatibility checks, and tailored rewrite suggestions.
                  </p>
                </div>
                <Button
                  onClick={handleStartNewResumeUpload}
                  className="px-6 py-3 h-auto rounded-xl bg-[#043c44] hover:bg-[#074e58] text-white font-semibold text-xs sm:text-sm shadow-md transition-all inline-flex items-center gap-2 border border-[#043c44]"
                >
                  <Plus className="w-4 h-4 text-teal-300" />
                  Upload Your First Resume
                </Button>
              </Card>
            ) : (
              <div className="space-y-8">
                {/* Top 2-Column Grid: Sidebar + Selected Resume Header */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Panel: Resume Groups / Versions List */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-heading font-bold text-base text-[#043c44]">Your Resumes</h3>
                      <span className="text-xs text-slate-500">{resumesList.length} groups</span>
                    </div>

                    <div className="space-y-3">
                      {(showAllResumeGroups ? resumesList : resumesList.slice(0, 4)).map((group) => {
                        const isActive = activeResumeGroup?.resumeGroupId === group.resumeGroupId;
                        const isExpanded = !!expandedVersions[group.resumeGroupId];

                        return (
                          <Card
                            key={group.id}
                            className={`glass-panel p-4 sm:p-5 rounded-2xl border transition-colors duration-150 cursor-pointer ${
                              isActive
                                ? 'border-teal-400 bg-teal-50/40 shadow-xs'
                                : 'border-slate-200/80 bg-white/90 hover:border-teal-200'
                            }`}
                            onClick={() => handleSelectResumeGroup(group)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-teal-100/80 text-[#0d9488] text-[10px] font-extrabold uppercase">
                                    v{group.version}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-500">
                                    {group.totalVersions > 1 ? `${group.totalVersions} versions` : '1 version'}
                                  </span>
                                  {selectingGroupId === group.resumeGroupId && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0d9488]">
                                      <Loader2 className="w-3 h-3 animate-spin text-[#0d9488]" />
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-heading font-bold text-sm text-[#043c44] truncate">
                                  {group.targetRole || 'Software Engineer'}
                                </h4>
                                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(group.createdAt).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </p>
                              </div>

                              {group.aiQualityScore !== undefined && group.aiQualityScore !== null && (
                                <div className="text-right shrink-0">
                                  <span className="text-lg font-extrabold text-[#0d9488]">
                                    {group.aiQualityScore}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block">ATS Score</span>
                                </div>
                              )}
                            </div>

                            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartNewVersionUpload(group.resumeGroupId);
                                }}
                                className="p-0 h-auto text-xs font-semibold text-[#0d9488] hover:text-[#043c44] flex items-center gap-1 bg-transparent hover:bg-transparent"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Upload v{group.version + 1}
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartMockInterview(group.id, group.targetRole || 'Software Engineer');
                                }}
                                disabled={isStartingInterview}
                                className="p-0 h-auto text-xs font-semibold text-[#043c44] hover:text-[#0d9488] flex items-center gap-1 bg-transparent hover:bg-transparent"
                              >
                                {isStartingInterview && startingResumeId === group.id ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0d9488]" />
                                    Preparing...
                                  </>
                                ) : (
                                  <>
                                    <Mic className="w-3.5 h-3.5 text-[#0d9488]" />
                                    Mock Practice
                                  </>
                                )}
                              </Button>
                            </div>
                          </Card>
                        );
                      })}

                      {resumesList.length > 4 && (
                        <button
                          type="button"
                          onClick={() => setShowAllResumeGroups((prev) => !prev)}
                          className="w-full py-2.5 px-3 rounded-xl border border-slate-200/80 bg-white/90 hover:bg-teal-50/60 text-[#0d9488] hover:text-[#043c44] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs mt-2"
                        >
                          {showAllResumeGroups ? (
                            <>
                              Show Less <ChevronUp className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              View More ({resumesList.length - 4} more) <ChevronDown className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right Panel: Selected Resume Header & Quick Actions */}
                  <div className="lg:col-span-8">
                    {activeResumeGroup ? (
                      <Card className="glass-panel p-6 rounded-3xl border-teal-100 bg-white/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <FileCheck className="w-5 h-5 text-[#0d9488]" />
                            <h3 className="font-heading font-bold text-lg text-[#043c44]">
                              {activeResumeGroup.targetRole || 'Software Engineer'} Resume
                            </h3>
                          </div>
                          <p className="text-xs text-slate-500">
                            Version {activeResumeGroup.version} • Uploaded{' '}
                            {new Date(activeResumeGroup.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="text-xs font-semibold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
                          >
                            <a href={activeResumeGroup.fileUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3.5 h-3.5 mr-1 text-[#0d9488]" />
                              View Original File
                            </a>
                          </Button>

                          <Button
                            size="sm"
                            onClick={() =>
                              handleStartMockInterview(
                                activeResumeGroup.id,
                                activeResumeGroup.targetRole || 'Software Engineer'
                              )
                            }
                            disabled={isStartingInterview}
                            className="text-xs font-semibold rounded-xl bg-[#043c44] hover:bg-[#074e58] text-white shadow-xs flex items-center gap-1.5 min-w-[155px] justify-center"
                          >
                            {isStartingInterview && startingResumeId === activeResumeGroup.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-300" />
                                Preparing Questions...
                              </>
                            ) : (
                              <>
                                <Mic className="w-3.5 h-3.5 text-teal-300" />
                                Start Mock Interview
                              </>
                            )}
                          </Button>
                        </div>
                      </Card>
                    ) : (
                      <div className="text-center py-12 text-slate-400 text-xs glass-panel rounded-3xl border border-slate-200/80 bg-white/90">
                        Select a resume from the left panel to inspect parsing & AI review.
                      </div>
                    )}
                  </div>
                </div>

                {/* Prominent 3-Step Interactive Mock Interview Visual Explainer */}
                {activeResumeGroup && <MockInterviewStepPreview />}

                {/* Full-Width Section: Detailed Resume Parsing, Format Checker & AI Analysis */}
                {activeResumeGroup && (
                  <ParsedResumeView
                    key={activeResumeGroup.id}
                    resume={{
                      id: activeResumeGroup.id,
                      resumeGroupId: activeResumeGroup.resumeGroupId,
                      fileUrl: activeResumeGroup.fileUrl,
                      targetRole: activeResumeGroup.targetRole,
                      version: activeResumeGroup.version,
                      createdAt: activeResumeGroup.createdAt,
                      parsedJson: activeResumeGroup.parsedJson,
                    }}
                    onReupload={handleStartNewResumeUpload}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INTERVIEW SESSIONS */}
        {activeTab === 'sessions' && (
          <div className="space-y-6">
            {isLoadingSessions ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
              </div>
            ) : isErrorSessions ? (
              <ApiErrorBoundary
                title="Failed to Load Interview Sessions"
                error={errorSessions}
                onRetry={refetchSessions}
              />
            ) : pastSessions.length === 0 ? (
              /* Requirement (2): Encouraging Empty State for Interview Sessions */
              <Card className="glass-panel p-8 sm:p-12 rounded-3xl text-center space-y-4 border-dashed border-teal-200 bg-white/90 max-w-xl mx-auto shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 text-[#10b981] border border-teal-200/70 flex items-center justify-center mx-auto shadow-xs">
                  <Mic className="w-7 h-7" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-heading font-bold text-xl text-[#043c44]">No Mock Interviews Completed Yet</h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
                    Rehearse 5-7 field-specific interview questions out loud with AI voice guidance. Get immediate STAR feedback on structure, relevance, and specificity after each answer.
                  </p>
                </div>
                {resumesList.length > 0 ? (
                  <Button
                    onClick={() => handleStartMockInterview(resumesList[0].id, resumesList[0].targetRole || 'Software Engineer')}
                    className="px-6 py-3 h-auto rounded-xl bg-[#043c44] hover:bg-[#074e58] text-white font-semibold text-xs sm:text-sm shadow-md transition-all inline-flex items-center gap-2 border border-[#043c44]"
                  >
                    <Mic className="w-4 h-4 text-teal-300" />
                    Start First Mock Interview
                  </Button>
                ) : (
                  <Button
                    onClick={handleStartNewResumeUpload}
                    className="px-6 py-3 h-auto rounded-xl bg-[#043c44] hover:bg-[#074e58] text-white font-semibold text-xs sm:text-sm shadow-md transition-all inline-flex items-center gap-2 border border-[#043c44]"
                  >
                    <Plus className="w-4 h-4 text-teal-300" />
                    Upload Resume to Unlock Practice
                  </Button>
                )}
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-bold text-lg text-[#043c44]">Past Voice Interview Sessions</h3>
                  <span className="text-xs text-slate-500">{pastSessions.length} total sessions</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pastSessions.map((s) => (
                    <Card
                      key={s.id}
                      className="glass-panel p-5 rounded-2xl border border-slate-200/80 bg-white/90 hover:border-teal-200 transition-colors duration-150 flex flex-col justify-between space-y-4 shadow-xs min-h-[140px]"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-[#0d9488] border border-teal-200/60">
                            {s.targetRole}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                              s.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {s.status === 'completed' ? 'Completed' : 'In Progress'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div>
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(s.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          </div>

                          {s.overallScore !== null && (
                            <div className="text-right">
                              <span className="text-xl font-extrabold text-[#0d9488]">{s.overallScore}</span>
                              <span className="text-[10px] text-slate-400 block">Overall Score</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          {s.questionsCount || 5} questions total
                        </span>

                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="p-0 h-auto text-xs font-semibold text-[#043c44] hover:text-[#0d9488] flex items-center gap-1.5 bg-transparent hover:bg-transparent"
                        >
                          <button type="button" onClick={() => navigate(`/interview/${s.id}`)}>
                            {s.status === 'completed' ? 'View Results & Report' : 'Resume Practice'}
                            <ArrowRight className="w-3.5 h-3.5 text-[#0d9488]" />
                          </button>
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SHARE SUCCESS STORY */}
        {activeTab === 'community' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <Card className="glass-panel p-6 sm:p-8 rounded-3xl border-teal-100 bg-white/90 shadow-sm space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-[#0d9488] border border-teal-200/60 text-xs font-semibold">
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                  Community Success Stories
                </div>
                <h3 className="font-heading font-bold text-2xl text-[#043c44]">Share Your Candidate Journey</h3>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  Landed an interview offer or improved your speaking confidence using PrepSense? Submit your story below to inspire other job seekers.
                </p>
              </div>

              {isStorySubmitted ? (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="font-heading font-bold text-lg text-emerald-900">Story Submitted Successfully!</h4>
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    Thank you for sharing your experience! Your story will be visible to the PrepSense community.
                  </p>
                  <Button
                    type="button"
                    onClick={() => setIsStorySubmitted(false)}
                    variant="outline"
                    className="mt-3 text-xs font-semibold border-emerald-300 text-emerald-800"
                  >
                    Submit Another Story
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmitStory} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#043c44]">Your Name</label>
                      <input
                        type="text"
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        placeholder="e.g. Alex Rivera"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-400 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#043c44]">Role Achieved / Target</label>
                      <input
                        type="text"
                        value={roleAchieved}
                        onChange={(e) => setRoleAchieved(e.target.value)}
                        placeholder="e.g. Associate Product Manager at Stripe"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#043c44]">Your Story or Feedback</label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={4}
                      placeholder="Share how AI resume feedback or voice mock sessions helped you prepare..."
                      className="w-full p-3.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-400 focus:outline-none resize-none"
                    />
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Max 500 characters</span>
                      <span>{content.length}/500</span>
                    </div>
                  </div>

                  {storyErrorMessage && (
                    <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
                      {storyErrorMessage}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isSubmittingStory}
                    className="w-full py-3 h-auto rounded-xl bg-[#043c44] hover:bg-[#074e58] text-white font-semibold text-xs shadow-md transition-colors flex items-center justify-center gap-2 border border-[#043c44]"
                  >
                    {isSubmittingStory ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-teal-300" /> Submitting Story...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-teal-300" /> Share Your Story
                      </>
                    )}
                  </Button>
                </form>
              )}
            </Card>

            {/* List of existing stories */}
            <div className="space-y-4">
              <h4 className="font-heading font-bold text-base text-[#043c44]">Recent Community Stories</h4>
              {isLoadingStories ? (
                <Skeleton className="h-24 w-full rounded-2xl" />
              ) : successStories.length === 0 ? (
                /* Requirement (2): Encouraging Empty State for Success Stories */
                <Card className="p-6 rounded-2xl text-center space-y-2 border-dashed border-teal-200 bg-white/80">
                  <Sparkles className="w-6 h-6 text-teal-400 mx-auto" />
                  <p className="font-semibold text-xs text-slate-700">Be the first candidate to share your story!</p>
                  <p className="text-[11px] text-slate-500">Your feedback helps inspire other job candidates.</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {successStories.map((story) => (
                    <Card key={story.id} className="p-4 rounded-2xl border border-slate-200/80 bg-white/90 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-[#043c44]">{story.authorName}</p>
                          {story.roleAchieved && (
                            <span className="text-[11px] text-[#0d9488] font-semibold">{story.roleAchieved}</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(story.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">"{story.content}"</p>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Full-Screen Loading Overlay for Mock Interview Session Preparation */}
      {isStartingInterview && <InterviewLoadingOverlay targetRole={startingRole} />}
    </div>
  );
};
