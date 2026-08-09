import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Target,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Send,
  Loader2,
  FileText,
  TrendingUp,
  Award,
  AlertCircle,
  Wand2,
  ArrowRight,
  XCircle,
  HelpCircle,
  FileCheck,
  Info,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface SectionFeedbackItem {
  section: string;
  score: number;
  status: 'strong' | 'good' | 'needs_improvement' | 'critical';
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export interface RewriteSuggestionItem {
  section?: string;
  original: string;
  rewritten: string;
  reasoning: string;
}

export interface FormatCheckItem {
  check: string;
  passed: boolean;
  message: string;
}

export interface AnalysisData {
  id: string;
  resumeId: string;
  jdText?: string | null;
  aiQualityScore: number;
  matchScore?: number | null;
  feedbackJson: {
    source?: 'ai' | 'heuristic_fallback';
    modelUsed?: string;
    aiQualityScore: number;
    atsReasoning: string;
    matchScore: number | null;
    jdReasoning?: string;
    overallSummary: string;
    sectionFeedback: SectionFeedbackItem[];
    rewriteSuggestions: RewriteSuggestionItem[];
  };
  formatCompatibility?: FormatCheckItem[];
  createdAt: string;
}

interface ResumeAnalysisViewProps {
  resumeId: string;
  targetRole?: string;
}

export const ResumeAnalysisView: React.FC<ResumeAnalysisViewProps> = ({ resumeId, targetRole }) => {
  const { token } = useAuth();

  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [jdText, setJdText] = useState<string>('');
  const [isJdExpanded, setIsJdExpanded] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Accordion state for section feedback
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchLatestAnalysis();
  }, [resumeId, token]);

  const fetchLatestAnalysis = async () => {
    if (!token || !resumeId) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/resume/${resumeId}/analysis/latest`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success && data.analysis) {
        setAnalysis(data.analysis);
        if (data.analysis.jdText) {
          setJdText(data.analysis.jdText);
        }
        // Open all sections by default for easy reading
        if (data.analysis.feedbackJson?.sectionFeedback) {
          const initialOpen: Record<string, boolean> = {};
          data.analysis.feedbackJson.sectionFeedback.forEach((sec: SectionFeedbackItem, idx: number) => {
            initialOpen[sec.section || `sec-${idx}`] = true;
          });
          setOpenSections(initialOpen);
        }
      }
    } catch (err) {
      console.error('Failed to fetch resume analysis:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunAnalysis = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token || !resumeId) return;

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/resume/${resumeId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          jdText: jdText.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze resume');
      }

      if (data.success && data.analysis) {
        setAnalysis(data.analysis);
        setIsJdExpanded(false);

        // Open section accordions by default
        if (data.analysis.feedbackJson?.sectionFeedback) {
          const initialOpen: Record<string, boolean> = {};
          data.analysis.feedbackJson.sectionFeedback.forEach((sec: SectionFeedbackItem, idx: number) => {
            initialOpen[sec.section || `sec-${idx}`] = true;
          });
          setOpenSections(initialOpen);
        }
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      setErrorMessage(err.message || 'An error occurred during resume analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleSection = (sectionName: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };

  const handleCopyRewrite = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  const getScoreColorClass = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 70) return 'text-teal-600 bg-teal-50 border-teal-200';
    if (score >= 55) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'strong':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Strong
          </span>
        );
      case 'good':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-teal-600" /> Good
          </span>
        );
      case 'needs_improvement':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> Needs Work
          </span>
        );
      case 'critical':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-rose-600" /> Action Required
          </span>
        );
      default:
        return null;
    }
  };

  const feedbackData = analysis?.feedbackJson;
  const formatChecks = analysis?.formatCompatibility || [];
  const aiQualityScore = analysis?.aiQualityScore ?? feedbackData?.aiQualityScore ?? 70;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* AI Resume Analyzer Header & Job Description Action Box */}
      <Card className="glass-panel p-6 sm:p-8 rounded-3xl border-teal-100 bg-white/90 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-[#0d9488] border border-teal-200/60 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-[#0d9488]" />
              Role-Specific AI & Format Audit
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#043c44]">
              Resume Quality & Format Checker
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Evaluating resume alignment for <strong className="text-[#043c44] font-semibold">{targetRole || 'Target Role'}</strong>. 
              Includes Gemini AI content scoring and deterministic rule-based format inspection.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              onClick={() => setIsJdExpanded(!isJdExpanded)}
              variant="outline"
              className="px-4 py-2.5 h-auto rounded-xl border-teal-200 text-[#043c44] hover:bg-teal-50 font-semibold text-xs transition-all flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-[#0d9488]" />
              {isJdExpanded ? 'Hide Job Description' : analysis?.jdText ? 'Edit Job Description' : 'Paste Job Description (Optional)'}
              {isJdExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>

            {!analysis && !isAnalyzing && (
              <Button
                onClick={() => handleRunAnalysis()}
                disabled={isAnalyzing}
                className="px-5 py-2.5 h-auto rounded-xl bg-[#043c44] hover:bg-[#074e58] text-white font-semibold text-xs transition-all shadow-md shadow-[#043c44]/20 flex items-center gap-2 border border-[#043c44]"
              >
                <Wand2 className="w-4 h-4 text-teal-300" />
                Run Full Audit
              </Button>
            )}
          </div>
        </div>

        {/* Optional Job Description Form */}
        {(isJdExpanded || !analysis) && (
          <form onSubmit={handleRunAnalysis} className="space-y-4 pt-2 border-t border-slate-100">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Target Job Description (JD)</span>
                <span className="text-slate-400 font-normal">Optional</span>
              </label>
              <textarea
                rows={4}
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste the full job description or key responsibilities here... (e.g. We are looking for a Software Engineer with expertise in React, Node.js, AWS, and CI/CD pipelines...)"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm text-[#043c44] focus:outline-none focus:ring-2 focus:ring-[#0d9488]/40 focus:border-[#0d9488] resize-none shadow-xs"
              />
            </div>

            <div className="flex justify-end gap-3">
              {analysis && (
                <Button
                  type="button"
                  onClick={() => setIsJdExpanded(false)}
                  variant="ghost"
                  className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={isAnalyzing}
                className="px-6 py-2.5 h-auto rounded-xl bg-[#043c44] hover:bg-[#074e58] text-white font-semibold text-xs transition-all shadow-md shadow-[#043c44]/20 flex items-center gap-2 border border-[#043c44] disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-teal-300" />
                    Analyzing with Gemini AI & Rule Engine...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-teal-300" />
                    {analysis ? 'Re-Analyze Resume' : 'Analyze Resume'}
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}
      </Card>

      {/* Loading state */}
      {isLoading ? (
        <Card className="glass-panel p-12 rounded-3xl text-center space-y-3 border-teal-100 bg-white/90 shadow-xs">
          <Loader2 className="w-8 h-8 text-[#0d9488] animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#043c44]">Fetching latest resume analysis...</p>
        </Card>
      ) : isAnalyzing ? (
        <Card className="glass-panel p-12 rounded-3xl text-center space-y-4 border-teal-100 bg-white/90 shadow-xs animate-pulse">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center mx-auto text-[#0d9488]">
            <Wand2 className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#043c44]">Running Full Resume Audit</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Executing Gemini AI content evaluation and rule-based format compatibility checks (scanned PDF, images, tables, multi-column)...
            </p>
          </div>
        </Card>
      ) : feedbackData ? (
        <div className="space-y-8">
          {/* Top Score Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: AI Content Quality Score (Renamed from ATS Compatibility Score) */}
            <Card className="glass-panel p-6 sm:p-8 rounded-3xl border-teal-100 bg-white/95 shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-3 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-sans flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-[#0d9488]" />
                        AI Content Quality Score
                      </span>
                      {feedbackData?.source === 'ai' ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          Real AI {feedbackData.modelUsed ? `(${feedbackData.modelUsed})` : ''}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 text-[10px] font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Rule Fallback
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Gemini's subjective content/keyword assessment
                    </span>
                  </div>
                  <span className={`px-3 py-1 rounded-full border text-sm font-black ${getScoreColorClass(aiQualityScore)}`}>
                    {aiQualityScore} / 100
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <h3 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#043c44]">
                    {aiQualityScore >= 80
                      ? 'High Quality Content'
                      : aiQualityScore >= 65
                      ? 'Moderate Content Quality'
                      : 'Needs Content Optimization'}
                  </h3>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {feedbackData.atsReasoning}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 pt-2 relative z-10">
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      aiQualityScore >= 80
                        ? 'bg-emerald-500'
                        : aiQualityScore >= 65
                        ? 'bg-[#0d9488]'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${aiQualityScore}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Evaluated against {targetRole || 'industry'} standards</span>
              </div>
            </Card>

            {/* Card 2: JD Match Score */}
            <Card className="glass-panel p-6 sm:p-8 rounded-3xl border-teal-100 bg-white/95 shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-3 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-sans flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-[#0891b2]" />
                    Job Description Match
                  </span>
                  {feedbackData.matchScore !== null && feedbackData.matchScore !== undefined ? (
                    <span className={`px-3 py-1 rounded-full border text-sm font-black ${getScoreColorClass(feedbackData.matchScore)}`}>
                      {feedbackData.matchScore} / 100
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full border text-xs font-semibold bg-slate-100 text-slate-500 border-slate-200">
                      No JD Provided
                    </span>
                  )}
                </div>

                {feedbackData.matchScore !== null && feedbackData.matchScore !== undefined ? (
                  <>
                    <h3 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#043c44]">
                      {feedbackData.matchScore >= 80
                        ? 'Strong Role Alignment'
                        : feedbackData.matchScore >= 65
                        ? 'Good Keyword Fit'
                        : 'Partial Skill Match'}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {feedbackData.jdReasoning || 'Evaluated skill and experience overlaps against target role requirements.'}
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="font-heading text-xl font-bold text-[#043c44]">
                      Paste a Job Description for Custom Match
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Add a target Job Description above to calculate your exact keyword match score, missing skills gap analysis, and tailored recommendations.
                    </p>
                  </>
                )}
              </div>

              {/* Progress Bar or CTA */}
              <div className="space-y-1.5 pt-2 relative z-10">
                {feedbackData.matchScore !== null && feedbackData.matchScore !== undefined ? (
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full transition-all duration-500 rounded-full bg-cyan-500"
                      style={{ width: `${feedbackData.matchScore}%` }}
                    />
                  </div>
                ) : (
                  <Button
                    onClick={() => setIsJdExpanded(true)}
                    variant="outline"
                    className="w-full py-2 h-auto text-xs font-semibold border-cyan-200 text-[#0891b2] hover:bg-cyan-50 rounded-xl"
                  >
                    + Add Job Description
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* NEW SECTION: Deterministic Format Compatibility Check */}
          {formatChecks && formatChecks.length > 0 && (
            <Card className="glass-panel p-6 sm:p-8 rounded-3xl border-teal-100 bg-white/95 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[#043c44] font-heading font-bold text-xl">
                    <FileCheck className="w-5 h-5 text-[#0d9488]" />
                    <h3>Format Compatibility Check</h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Rule-based technical file audit inspecting scanned text density, images, tables, layout columns, and core sections.
                  </p>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold self-start sm:self-auto">
                  {formatChecks.filter((c) => c.passed).length} / {formatChecks.length} Checks Passed
                </span>
              </div>

              {/* Prominent Rule-Based Disclaimer Note */}
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5 font-medium">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                  <span><strong>Note:</strong> These are rule-based checks, not AI-generated.</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/90 px-2.5 py-1 rounded-lg shrink-0">
                  Deterministic File Inspection
                </span>
              </div>

              {/* Grid of Rule Checks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formatChecks.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all space-y-2 flex flex-col justify-between ${
                      item.passed
                        ? 'bg-emerald-50/30 border-emerald-200/80 hover:border-emerald-300'
                        : 'bg-rose-50/40 border-rose-200/80 hover:border-rose-300'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-xs sm:text-sm text-[#043c44] flex items-center gap-1.5">
                          {item.passed ? (
                            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                          )}
                          {item.check}
                        </h4>
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                            item.passed
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border-rose-200'
                          }`}
                        >
                          {item.passed ? 'PASS' : 'FAIL'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed pt-1">
                        {item.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Executive Summary Banner */}
          {feedbackData.overallSummary && (
            <Card className="glass-panel p-6 rounded-2xl border-teal-100 bg-white/90 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-[#043c44] font-heading font-bold text-base">
                <TrendingUp className="w-5 h-5 text-[#0d9488]" />
                <h3>Executive Candidate Assessment</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                {feedbackData.overallSummary}
              </p>
            </Card>
          )}

          {/* Bullet-Point Rewrite Suggestions */}
          {feedbackData.rewriteSuggestions && feedbackData.rewriteSuggestions.length > 0 && (
            <Card className="glass-panel p-6 sm:p-8 rounded-3xl border-teal-100 bg-white/95 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[#043c44] font-heading font-bold text-xl">
                    <Wand2 className="w-5 h-5 text-[#0d9488]" />
                    <h3>Bullet-Point Rewrite Suggestions</h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    High-impact before/after revisions phrased for top {targetRole || 'field'} resume standards.
                  </p>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-teal-50 text-[#0d9488] border border-teal-200 text-xs font-bold self-start sm:self-auto">
                  {feedbackData.rewriteSuggestions.length} Suggestions
                </span>
              </div>

              <div className="space-y-6">
                {feedbackData.rewriteSuggestions.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-5 sm:p-6 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-4 transition-all hover:border-teal-300"
                  >
                    {item.section && (
                      <div className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold text-[11px]">
                        Section: {item.section}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Before / Original */}
                      <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200/80 space-y-2">
                        <div className="flex items-center justify-between text-rose-800 text-xs font-bold">
                          <span className="flex items-center gap-1.5">
                            <XCircle className="w-4 h-4 text-rose-500" /> Original / Weak Version
                          </span>
                        </div>
                        <p className="text-xs text-rose-950 leading-relaxed font-mono bg-white/60 p-2.5 rounded-lg border border-rose-100">
                          "{item.original}"
                        </p>
                      </div>

                      {/* After / Rewritten */}
                      <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-2 relative">
                        <div className="flex items-center justify-between text-emerald-800 text-xs font-bold">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> High-Impact Rewritten Version
                          </span>
                          <button
                            onClick={() => handleCopyRewrite(item.rewritten, idx)}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100 transition-colors font-semibold"
                            title="Copy bullet text"
                          >
                            {copiedIndex === idx ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" /> Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-slate-500" /> Copy
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-emerald-950 leading-relaxed font-medium bg-white/80 p-2.5 rounded-lg border border-emerald-200">
                          "{item.rewritten}"
                        </p>
                      </div>
                    </div>

                    {/* Recruiter Rationale */}
                    <div className="p-3 rounded-xl bg-teal-50/50 border border-teal-100 text-xs text-slate-700 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-[#0d9488] shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-[#043c44] font-semibold">Why this works: </strong>
                        <span>{item.reasoning}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Section-by-Section Expandable Feedback */}
          {feedbackData.sectionFeedback && feedbackData.sectionFeedback.length > 0 && (
            <Card className="glass-panel p-6 sm:p-8 rounded-3xl border-teal-100 bg-white/95 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <h3 className="font-heading text-xl font-bold text-[#043c44]">Section-by-Section Audit</h3>
                  <p className="text-xs text-slate-500">
                    Granular section scores, strengths, and targeted improvement areas.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {feedbackData.sectionFeedback.map((sec, idx) => {
                  const sectionKey = sec.section || `sec-${idx}`;
                  const isOpen = openSections[sectionKey] !== false;

                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs transition-all"
                    >
                      {/* Accordion Header */}
                      <button
                        type="button"
                        onClick={() => toggleSection(sectionKey)}
                        className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-sm ${getScoreColorClass(sec.score)}`}>
                            {sec.score}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm sm:text-base text-[#043c44]">{sec.section}</h4>
                            <p className="text-xs text-slate-500 line-clamp-1">{sec.feedback}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {getStatusBadge(sec.status)}
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {/* Accordion Body */}
                      {isOpen && (
                        <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-4 bg-slate-50/30">
                          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pt-3">
                            {sec.feedback}
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            {/* Strengths */}
                            {sec.strengths && sec.strengths.length > 0 && (
                              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
                                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Key Strengths
                                </span>
                                <ul className="space-y-1.5 text-xs text-emerald-950">
                                  {sec.strengths.map((str, sIdx) => (
                                    <li key={sIdx} className="flex items-start gap-1.5">
                                      <span className="text-emerald-500 font-bold">•</span>
                                      <span>{str}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Areas for Improvement */}
                            {sec.improvements && sec.improvements.length > 0 && (
                              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                                <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                                  <AlertTriangle className="w-4 h-4 text-amber-600" /> Areas for Improvement
                                </span>
                                <ul className="space-y-1.5 text-xs text-amber-950">
                                  {sec.improvements.map((imp, iIdx) => (
                                    <li key={iIdx} className="flex items-start gap-1.5">
                                      <span className="text-amber-500 font-bold">•</span>
                                      <span>{imp}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      ) : (
        <Card className="glass-panel p-8 rounded-3xl text-center space-y-4 border-teal-100 bg-white/90 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto text-[#0d9488]">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#043c44]">No AI Audit Generated Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Run a full audit to get your AI Content Quality Score, deterministic Format Compatibility Check, optional Job Description Match Score, section feedback, and bullet-point rewrite suggestions.
            </p>
          </div>
          <Button
            onClick={() => handleRunAnalysis()}
            disabled={isAnalyzing}
            className="px-6 py-2.5 h-auto rounded-xl bg-[#043c44] hover:bg-[#074e58] text-white font-semibold text-xs transition-all shadow-md shadow-[#043c44]/20 inline-flex items-center gap-2 border border-[#043c44]"
          >
            <Wand2 className="w-4 h-4 text-teal-300" />
            Generate Resume Audit
          </Button>
        </Card>
      )}
    </div>
  );
};
