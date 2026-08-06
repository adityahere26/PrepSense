import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, FileText, Mic, BarChart3, ArrowRight } from 'lucide-react';

export const Home: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24">
      {/* Hero Section */}
      <div className="text-center space-y-6 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          Role-Agnostic AI Career Suite
        </div>

        <h1 className="font-heading text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent leading-[1.15]">
          Master Any Job Role With Personalized AI Guidance
        </h1>

        <p className="text-slate-400 text-lg leading-relaxed">
          Upload your resume, set your target field, get actionable ATS score analysis, and rehearse with tailored voice mock interviews.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          {user ? (
            <Link
              to="/dashboard"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2"
            >
              Get Started with Google
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Feature Grid */}
      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel glass-panel-hover p-6 rounded-2xl">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mb-4 text-indigo-400">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-heading font-semibold text-lg text-white mb-2">
            Targeted Resume Rewrite
          </h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Get field-specific bullet rewrite suggestions that match actual industry standards, not generic grammar checks.
          </p>
        </div>

        <div className="glass-panel glass-panel-hover p-6 rounded-2xl">
          <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mb-4 text-purple-400">
            <Mic className="w-6 h-6" />
          </div>
          <h3 className="font-heading font-semibold text-lg text-white mb-2">
            Voice Mock Interviews
          </h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Rehearse out loud with 5-7 dynamic questions generated specifically for your target role and resume context.
          </p>
        </div>

        <div className="glass-panel glass-panel-hover p-6 rounded-2xl">
          <div className="w-12 h-12 rounded-xl bg-pink-600/20 border border-pink-500/30 flex items-center justify-center mb-4 text-pink-400">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h3 className="font-heading font-semibold text-lg text-white mb-2">
            Progress Tracking
          </h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Track STAR-structure evaluation scores and filler-word trends over multiple sessions to measure real improvement.
          </p>
        </div>
      </div>
    </div>
  );
};
