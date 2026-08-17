import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Award,
  History,
  Target,
  BarChart3,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
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

const CustomDarkTooltip = ({ active, payload, label }: any) => {
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

export const Dashboard: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

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
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({});

  // Interview Sessions & Analytics states
  const [pastSessions, setPastSessions] = useState<PastSessionItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(true);
  const [recurringAreas, setRecurringAreas] = useState<RecurringImprovementArea[]>([]);
  const [scoreTrendData, setScoreTrendData] = useState<Array<{ id: string; targetRole: string; date: string; score: number }>>([]);
  const [isStartingInterview, setIsStartingInterview] = useState<boolean>(false);

  const handleStartMockInterview = async (resumeId: string, targetRole: string) => {
    if (!token) return;
    setIsStartingInterview(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/interview/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resumeId,
          targetRole: targetRole || 'Software Engineer',
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
    }
  };

  useEffect(() => {
    fetchResumes();
    fetchSessionsAndAnalytics();
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

  const fetchSessionsAndAnalytics = async () => {
    if (!token) return;
    setIsLoadingSessions(true);
    try {
      // 1. Fetch sessions
      const sessionsRes = await fetch(`${API_BASE_URL}/api/interview/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sessionsData = await sessionsRes.json();

      if (sessionsRes.ok && sessionsData.success && Array.isArray(sessionsData.sessions)) {
        setPastSessions(sessionsData.sessions);

        // Prepare trend data for completed sessions sorted chronologically ascending
        const completedSessions = sessionsData.sessions
          .filter((s: PastSessionItem) => s.status === 'completed' || (s.overallScore !== null && s.overallScore > 0))
          .sort((a: PastSessionItem, b: PastSessionItem) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        const formattedTrend = completedSessions.map((s: PastSessionItem, index: number) => ({
          id: s.id,
          targetRole: s.targetRole,
          date: new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          score: s.overallScore || 0,
        }));

        setScoreTrendData(formattedTrend);
      }

      // 2. Fetch aggregated analytics
      const analyticsRes = await fetch(`${API_BASE_URL}/api/interview/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const analyticsData = await analyticsRes.json();

      if (analyticsRes.ok && analyticsData.success) {
        if (Array.isArray(analyticsData.recurringImprovementAreas)) {
          setRecurringAreas(analyticsData.recurringImprovementAreas);
        }
      }
    } catch (err) {
      console.error('Failed to fetch interview sessions or analytics:', err);
    } finally {
      setIsLoadingSessions(false);
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

  // Compute overall average score across completed sessions
  const completedSessions = pastSessions.filter((s) => s.status === 'completed' && s.overallScore !== null);
  const avgInterviewScore =
    completedSessions.length > 0
      ? Math.round(completedSessions.reduce((acc, s) => acc + (s.overallScore || 0), 0) / completedSessions.length)
      : null;

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
            Track your resume iterations, interview progress, score trends, and recurring areas for improvement.
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

        <Card className="glass-panel p-6 rounded-2xl space-y-3 border-teal-100 bg-white/90 shadow-xs">
          <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 text-slate-500">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-sans">Resumes Parsed</CardTitle>
            <FileText className="w-4 h-4 text-[#06b6d4]" />
          </CardHeader>
          <CardContent className="p-0 space-y-1">
            <p className="text-3xl font-extrabold text-[#043c44]">{resumesList.length}</p>
            <CardDescription className="text-xs text-slate-500">
              {resumesList.length === 1
                ? '1 distinct resume group'
                : resumesList.length > 1
                ? `${resumesList.length} distinct resume groups`
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
            <p className="text-3xl font-extrabold text-[#043c44]">{pastSessions.length}</p>
            <CardDescription className="text-xs text-slate-500">
              {completedSessions.length} completed session{completedSessions.length === 1 ? '' : 's'}
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="glass-panel p-6 rounded-2xl space-y-3 border-teal-100 bg-white/90 shadow-xs">
          <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 text-slate-500">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-sans">Average Score</CardTitle>
            <Award className="w-4 h-4 text-[#0d9488]" />
          </CardHeader>
          <CardContent className="p-0 space-y-1">
            <p className="text-3xl font-extrabold text-[#043c44]">
              {avgInterviewScore !== null ? `${avgInterviewScore}/100` : '--'}
            </p>
            <CardDescription className="text-xs text-slate-500">
              {completedSessions.length > 0 ? 'Across completed interviews' : 'Complete 1 session to score'}
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Analytics & Score Progress Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Requirement (3): Recharts Line Chart for Score Trend */}
        <Card className="glass-panel lg:col-span-2 p-6 rounded-3xl space-y-4 border-teal-100 bg-white/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#0d9488]" />
                <h2 className="font-heading font-bold text-xl text-[#043c44]">Interview Score Progress</h2>
              </div>
              <p className="text-xs text-slate-500">
                Track overall mock interview scores across completed sessions in chronological order.
              </p>
            </div>
            {scoreTrendData.length >= 2 && (
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                {scoreTrendData[scoreTrendData.length - 1].score - scoreTrendData[0].score >= 0
                  ? `+${scoreTrendData[scoreTrendData.length - 1].score - scoreTrendData[0].score} pts trend`
                  : `${scoreTrendData[scoreTrendData.length - 1].score - scoreTrendData[0].score} pts trend`}
              </span>
            )}
          </div>

          {scoreTrendData.length < 2 ? (
            <div className="glass-panel p-8 rounded-2xl text-center space-y-3 border-teal-100/60 bg-teal-50/40 my-4 flex flex-col items-center justify-center min-h-[220px]">
              <div className="w-12 h-12 rounded-2xl bg-white border border-teal-200 flex items-center justify-center text-[#0d9488] shadow-xs">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm text-[#043c44]">Complete a few sessions to see your trend</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  You need at least 2 completed mock interview sessions to visualize your score progression and track improvement over time.
                </p>
              </div>
              {activeResume && (
                <Button
                  onClick={() => handleStartMockInterview(activeResume.id, activeResume.targetRole || 'Software Engineer')}
                  className="px-4 py-2 h-auto rounded-xl bg-[#043c44] hover:bg-[#074e58] text-white font-semibold text-xs transition-all flex items-center gap-2 mt-2"
                >
                  <Mic className="w-3.5 h-3.5 text-teal-300" />
                  Start a Mock Session
                </Button>
              )}
            </div>
          ) : (
            <div className="w-full pt-2">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={scoreTrendData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                  <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                  <Tooltip content={<CustomDarkTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#0d9488"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#0d9488', strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 8, fill: '#043c44', stroke: '#0d9488', strokeWidth: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Requirement (4): Card Aggregating Most Frequently Recurring Improvement Areas */}
        <Card className="glass-panel p-6 rounded-3xl space-y-4 border-teal-100 bg-white/90 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#0d9488]" />
              <h2 className="font-heading font-bold text-xl text-[#043c44]">Recurring Improvement Areas</h2>
            </div>
            <p className="text-xs text-slate-500">
              Aggregated themes extracted across all your evaluated interview answers.
            </p>
          </div>

          {recurringAreas.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-2 my-auto">
              <Target className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">No recurring feedback themes yet</p>
              <p className="text-[11px] text-slate-500">
                Complete mock interview sessions to identify recurring strengths and key growth areas across candidate answers.
              </p>
            </div>
          ) : (
            <div className="space-y-3 my-auto">
              {recurringAreas.slice(0, 4).map((area, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-gradient-to-r from-teal-50/70 to-slate-50 border border-teal-100 hover:border-teal-300 transition-all space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-[#043c44] flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0d9488] shrink-0" />
                      {area.theme}
                    </p>
                    <span className="px-2 py-0.5 rounded-full bg-teal-100/80 text-[#0d9488] font-extrabold text-[10px] shrink-0 border border-teal-200/80">
                      {area.count} {area.count === 1 ? 'occurrence' : 'occurrences'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug pl-3">{area.description}</p>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Aggregated across user responses</span>
            <span className="font-semibold text-[#0d9488]">{recurringAreas.length} themes identified</span>
          </div>
        </Card>
      </div>

      {/* Requirement (2): Past Interview Sessions List */}
      <Card className="glass-panel p-8 rounded-3xl space-y-6 border-teal-100 bg-white/90 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-[#0d9488]" />
              <h2 className="font-heading font-bold text-xl text-[#043c44]">Past Mock Interview Sessions</h2>
            </div>
            <p className="text-xs text-slate-500">
              Review transcripts, STAR evaluations, and per-question score breakdowns for previous practice sessions.
            </p>
          </div>

          {activeResume && (
            <Button
              onClick={() => handleStartMockInterview(activeResume.id, activeResume.targetRole || 'Software Engineer')}
              disabled={isStartingInterview}
              className="px-4 py-2 h-auto rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-xs"
            >
              {isStartingInterview ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-200" />
                  Starting Session...
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-teal-200" />
                  + New Interview Session
                </>
              )}
            </Button>
          )}
        </div>

        {isLoadingSessions ? (
          <div className="p-8 text-center space-y-2">
            <Loader2 className="w-6 h-6 text-[#0d9488] animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-600">Loading interview sessions...</p>
          </div>
        ) : pastSessions.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-center space-y-3">
            <Mic className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-[#043c44]">No Practice Sessions Completed Yet</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Start a voice mock interview to answer role-specific questions and receive structured feedback on STAR framework, specificity, and relevance.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastSessions.map((session) => {
              const formattedDate = session.createdAt
                ? new Date(session.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Recent Session';

              const isCompleted = session.status === 'completed';

              return (
                <div
                  key={session.id}
                  onClick={() => navigate(`/interview/${session.id}`)}
                  className="glass-panel p-5 rounded-2xl border border-slate-200/90 hover:border-teal-400 bg-white hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-teal-50 text-[#0d9488] border border-teal-200/60 text-xs font-bold truncate">
                        {session.targetRole}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border shrink-0 flex items-center gap-1 ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {isCompleted ? 'Completed' : 'In Progress'}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formattedDate}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Overall Score</p>
                      <p className="text-lg font-extrabold text-[#043c44]">
                        {session.overallScore !== null ? `${session.overallScore}/100` : '--'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-[#0d9488] group-hover:translate-x-1 transition-transform">
                      <span>View Detail</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

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

      {/* Requirement (1): Resume Groups Cards Grid with Version History */}
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
              const versions = item.versions || [];
              const isExpanded = Boolean(expandedVersions[item.resumeGroupId]);

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
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Uploaded {createdDate}
                        </p>
                        {item.aiQualityScore !== undefined && item.aiQualityScore !== null && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-extrabold">
                            AI Score: {item.aiQualityScore}/100
                          </span>
                        )}
                      </div>
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

                  {/* Requirement (1): Version History Section under each resume group */}
                  <div className="pt-3 border-t border-slate-100 space-y-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => toggleVersionExpand(item.resumeGroupId)}
                      className="w-full flex items-center justify-between text-xs font-bold text-slate-600 hover:text-[#0d9488] transition-colors py-1"
                    >
                      <span className="flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-[#0d9488]" />
                        Version History ({versions.length > 0 ? versions.length : item.totalVersions} {item.totalVersions === 1 ? 'version' : 'versions'})
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {isExpanded && (
                      <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                        {versions.map((ver) => {
                          const verDate = ver.createdAt ? new Date(ver.createdAt).toLocaleDateString() : '';
                          const isVerActive = activeResume?.id === ver.id;

                          return (
                            <div
                              key={ver.id}
                              onClick={() => setActiveResume(ver as any)}
                              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 cursor-pointer transition-all ${
                                isVerActive
                                  ? 'bg-teal-50/80 border-[#0d9488] font-semibold text-[#043c44]'
                                  : 'bg-slate-50/80 border-slate-200 hover:bg-teal-50/40 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-extrabold text-slate-700 shrink-0">
                                  v{ver.version}
                                </span>
                                <span className="text-[11px] text-slate-500 truncate">{verDate}</span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {ver.aiQualityScore !== undefined && ver.aiQualityScore !== null ? (
                                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                    {ver.aiQualityScore}/100
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">Not analyzed</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 text-xs font-bold">
                      <span className={`flex items-center gap-1 ${isSelected ? 'text-[#0d9488]' : 'text-slate-500'}`}>
                        {isSelected ? 'Active Profile' : 'Click to Select'}
                      </span>

                      <button
                        onClick={() => handleStartNewVersionUpload(item.resumeGroupId)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-[#0d9488] transition-colors text-[11px] font-bold flex items-center gap-1 border border-slate-200"
                      >
                        <Upload className="w-3 h-3" />
                        + Upload New Ver
                      </button>
                    </div>
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
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <h3 className="font-heading font-extrabold text-xl text-[#043c44] flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#0d9488]" />
              Active Workspace: {activeResume.targetRole || 'Resume Workspace'} (v{activeResume.version})
            </h3>

            <Button
              onClick={() => handleStartMockInterview(activeResume.id, activeResume.targetRole || 'Software Engineer')}
              disabled={isStartingInterview}
              className="px-5 py-2.5 h-auto rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-xs transition-all shadow-md shadow-teal-600/20 flex items-center gap-2"
            >
              {isStartingInterview ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-teal-200" />
                  Starting Interview...
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-teal-200 animate-pulse" />
                  Start Mock Interview
                </>
              )}
            </Button>
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
