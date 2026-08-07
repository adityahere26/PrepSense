import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Sparkles, BookOpen, Share2 } from 'lucide-react';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ResourceDetailData {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string;
  content: string;
  createdAt: string;
}

export const ResourceDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [resource, setResource] = useState<ResourceDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!slug) return;
      try {
        const response = await fetch(`${API_BASE_URL}/api/resources/${slug}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Resource article not found');
        }

        setResource(data.resource);
      } catch (err: any) {
        setError(err.message || 'Failed to load article');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-slate-400 text-sm">
        Loading article details...
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-heading font-bold text-2xl text-[#043c44]">Article Not Found</h2>
        <p className="text-slate-600 text-sm">{error || "The guide you are looking for doesn't exist."}</p>
        <Button
          onClick={() => navigate('/resources')}
          className="px-4 py-2 h-auto bg-[#043c44] text-white rounded-xl"
        >
          Back to Resources
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:py-16 space-y-8">
      {/* Top Back Navigation */}
      <div>
        <Link
          to="/resources"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#043c44] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#0d9488]" />
          Back to Resources
        </Link>
      </div>

      {/* Main Article Container */}
      <Card className="glass-panel p-6 sm:p-10 rounded-3xl border border-teal-100 bg-white/95 shadow-sm space-y-8">
        {/* Article Meta Header */}
        <div className="space-y-4 border-b border-slate-100 pb-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-teal-50 text-[#0d9488] border border-teal-200/60">
              {resource.category}
            </span>
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-600" />
              Published {new Date(resource.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>

          <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-[#043c44] leading-tight">
            {resource.title}
          </h1>

          <div className="p-4 rounded-xl bg-teal-50/70 border-l-4 border-[#0d9488] text-slate-700 text-sm sm:text-base leading-relaxed font-medium">
            {resource.summary}
          </div>
        </div>

        {/* Article Content Rendered */}
        <div className="pt-2">
          <MarkdownRenderer content={resource.content} />
        </div>

        {/* Bottom Call-to-action */}
        <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-teal-50/50 p-6 rounded-2xl border border-teal-100">
          <div className="space-y-1 text-center sm:text-left">
            <p className="font-heading font-bold text-base text-[#043c44]">
              Ready to put this advice into practice?
            </p>
            <p className="text-xs text-slate-600">
              Try PrepSense AI voice mock interviews and get instant structured feedback.
            </p>
          </div>

          <Button
            asChild
            className="px-5 py-2.5 h-auto rounded-xl bg-[#043c44] hover:bg-[#074e58] text-white font-semibold text-xs transition-all shadow-md shadow-[#043c44]/20 flex items-center gap-2 border border-[#043c44]"
          >
            <Link to="/dashboard">
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              Start Mock Interview
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
};
