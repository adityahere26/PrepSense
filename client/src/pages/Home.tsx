import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, FileText, Mic, BarChart3, ArrowRight, Quote, Trophy, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface SuccessStory {
  id: string;
  authorName: string;
  roleAchieved?: string | null;
  content: string;
  createdAt: string;
}

export const Home: React.FC = () => {
  const { user } = useAuth();
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [isLoadingStories, setIsLoadingStories] = useState(true);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/success-stories`);
        const data = await response.json();
        if (response.ok && data.success) {
          setStories(data.stories || []);
        }
      } catch (err) {
        console.error('Failed to fetch success stories:', err);
      } finally {
        setIsLoadingStories(false);
      }
    };

    fetchStories();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24 space-y-24">
      {/* Hero Section */}
      <div className="text-center space-y-6 max-w-3xl mx-auto">
        {/* Dual-tone pill badge matching reference screenshot badge */}
        <div className="inline-flex items-center rounded-full p-1 bg-teal-50/90 border border-teal-200/70 shadow-xs">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0d9488] text-white text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-teal-200" />
            Train with AI
          </span>
          <span className="px-3.5 py-1 text-xs font-semibold text-[#043c44]">
            Perform 4× better in real interviews.
          </span>
        </div>

        <h1 className="font-heading text-4xl sm:text-6xl font-extrabold tracking-tight text-[#043c44] leading-[1.15]">
          Master Any Job Role With{' '}
          <span className="bg-gradient-to-r from-[#0d9488] via-[#06b6d4] to-[#00a896] bg-clip-text text-transparent">
            AI-Powered
          </span>{' '}
          Interview Prep
        </h1>

        <p className="text-slate-600 text-lg leading-relaxed max-w-2xl mx-auto">
          Upload your resume, set your target field, get actionable ATS score analysis, and rehearse with tailored voice mock interviews.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          {user ? (
            <Button
              asChild
              className="w-full sm:w-auto px-6 py-3.5 h-auto rounded-xl bg-[#043c44] hover:bg-[#074e58] text-white font-semibold shadow-md shadow-[#043c44]/20 transition-all flex items-center justify-center gap-3 border border-[#043c44]"
            >
              <Link to="/dashboard">
                Go to Dashboard
                <div className="w-6 h-6 rounded-md bg-[#00a896] flex items-center justify-center text-white">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            </Button>
          ) : (
            <Button
              asChild
              className="w-full sm:w-auto px-6 py-3.5 h-auto rounded-xl bg-[#043c44] hover:bg-[#074e58] text-white font-semibold shadow-md shadow-[#043c44]/20 transition-all flex items-center justify-center gap-3 border border-[#043c44]"
            >
              <Link to="/login">
                Get Started with Google
                <div className="w-6 h-6 rounded-md bg-[#00a896] flex items-center justify-center text-white">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-panel glass-panel-hover p-6 rounded-2xl border border-teal-100 bg-white/90 shadow-sm">
          <CardHeader className="p-0 space-y-0">
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200/70 flex items-center justify-center mb-4 text-[#0d9488]">
              <FileText className="w-6 h-6" />
            </div>
            <CardTitle className="font-heading font-semibold text-lg text-[#043c44] mb-2">
              Targeted Resume Rewrite
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <CardDescription className="text-slate-600 text-sm leading-relaxed">
              Get field-specific bullet rewrite suggestions that match actual industry standards, not generic grammar checks.
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="glass-panel glass-panel-hover p-6 rounded-2xl border border-teal-100 bg-white/90 shadow-sm">
          <CardHeader className="p-0 space-y-0">
            <div className="w-12 h-12 rounded-xl bg-cyan-50 border border-cyan-200/70 flex items-center justify-center mb-4 text-[#06b6d4]">
              <Mic className="w-6 h-6" />
            </div>
            <CardTitle className="font-heading font-semibold text-lg text-[#043c44] mb-2">
              Voice Mock Interviews
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <CardDescription className="text-slate-600 text-sm leading-relaxed">
              Rehearse out loud with 5-7 dynamic questions generated specifically for your target role and resume context.
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="glass-panel glass-panel-hover p-6 rounded-2xl border border-teal-100 bg-white/90 shadow-sm">
          <CardHeader className="p-0 space-y-0">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center mb-4 text-[#10b981]">
              <BarChart3 className="w-6 h-6" />
            </div>
            <CardTitle className="font-heading font-semibold text-lg text-[#043c44] mb-2">
              Progress Tracking
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <CardDescription className="text-slate-600 text-sm leading-relaxed">
              Track STAR-structure evaluation scores and filler-word trends over multiple sessions to measure real improvement.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Success Stories Section */}
      <div className="space-y-10 pt-6">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-[#0d9488] border border-teal-200/60 text-xs font-semibold uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5" />
            Community Proof
          </div>
          <h2 className="font-heading text-3xl font-extrabold text-[#043c44]">
            Candidate Success Stories
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            Real feedback from job seekers who prepared with PrepSense to land interviews and job offers.
          </p>
        </div>

        {isLoadingStories ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            Loading success stories...
          </div>
        ) : stories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stories.map((story) => (
              <Card
                key={story.id}
                className="glass-panel glass-panel-hover p-6 rounded-2xl border border-teal-100 bg-white/90 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <Quote className="w-5 h-5 text-teal-300" />
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed italic">
                    "{story.content}"
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-1">
                  <p className="font-semibold text-sm text-[#043c44]">{story.authorName}</p>
                  {story.roleAchieved && (
                    <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-[#0d9488] border border-teal-200/60">
                      {story.roleAchieved}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* Encouraging Empty State */
          <Card className="glass-panel p-10 rounded-3xl text-center border-dashed border-teal-200 bg-white/90 shadow-xs max-w-xl mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#0d9488] border border-teal-200/60 flex items-center justify-center mx-auto">
              <Trophy className="w-6 h-6" />
            </div>
            <CardHeader className="p-0 space-y-1">
              <CardTitle className="font-heading font-bold text-xl text-[#043c44]">
                Be the first to share your success story!
              </CardTitle>
              <CardDescription className="text-slate-600 text-sm max-w-md mx-auto">
                Have you used PrepSense to polish your resume or practice mock interviews? Submit your testimonial to inspire fellow candidates!
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 pt-2">
              <Button
                asChild
                className="px-5 py-2.5 h-auto rounded-xl bg-[#043c44] hover:bg-[#074e58] text-white font-semibold text-xs transition-all shadow-md shadow-[#043c44]/20 inline-flex items-center gap-2 border border-[#043c44]"
              >
                <Link to={user ? '/dashboard' : '/login'}>
                  {user ? 'Share Your Success Story' : 'Sign In to Share Story'}
                  <ArrowRight className="w-3.5 h-3.5 text-teal-300" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};


