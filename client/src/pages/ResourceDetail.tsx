import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock, Sparkles } from 'lucide-react';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiErrorBoundary } from '../components/ApiErrorBoundary';

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

  const {
    data: resource,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ResourceDetailData | null>({
    queryKey: ['resourceDetail', slug],
    queryFn: async () => {
      if (!slug) return null;
      const response = await fetch(`${API_BASE_URL}/api/resources/${slug}`);
      if (!response.ok) throw new Error('Resource article not found');
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to load article');
      return data.resource || null;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 sm:py-16 space-y-6">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <Card className="p-8 rounded-3xl space-y-6 bg-white/90 border-teal-100">
          <Skeleton className="h-10 w-3/4 rounded-xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </Card>
      </div>
    );
  }

  if (isError || !resource) {
    return (
      <div className="max-w-xl mx-auto my-16 px-4">
        <ApiErrorBoundary
          title="Article Not Found"
          description="The preparation guide you are looking for doesn't exist or could not be loaded."
          error={error}
          onRetry={refetch}
        />
        <div className="text-center mt-4">
          <Button
            onClick={() => navigate('/resources')}
            className="px-4 py-2 h-auto bg-[#043c44] text-white rounded-xl text-xs font-semibold"
          >
            Back to Resources
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:py-16 space-y-8 animate-in fade-in duration-300">
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
            className="px-5 py-2.5 h-auto rounded-xl bg-[#043c44] hover:bg-[#074e58] text-white font-semibold text-xs transition-colors shadow-md shadow-[#043c44]/20 flex items-center gap-2 border border-[#043c44]"
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
