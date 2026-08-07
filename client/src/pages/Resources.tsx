import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight, Sparkles, Clock, FileText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface ResourceSummary {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string;
  createdAt: string;
}

export const Resources: React.FC = () => {
  const [resources, setResources] = useState<ResourceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/resources`);
        const data = await response.json();
        if (response.ok && data.success) {
          setResources(data.resources || []);
        }
      } catch (err) {
        console.error('Failed to fetch resources:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResources();
  }, []);

  const categories = ['All', ...Array.from(new Set(resources.map((r) => r.category)))];

  const filteredResources =
    selectedCategory === 'All'
      ? resources
      : resources.filter((r) => r.category === selectedCategory);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 sm:py-20 space-y-12">
      {/* Header Banner */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-[#0d9488] border border-teal-200/60 text-xs font-semibold uppercase tracking-wider">
          <BookOpen className="w-3.5 h-3.5" />
          PrepSense Knowledge Hub
        </div>
        <h1 className="font-heading text-3xl sm:text-5xl font-extrabold text-[#043c44] tracking-tight leading-tight">
          Career & Interview Resources
        </h1>
        <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
          Actionable frameworks, resume ATS optimization guides, and proven strategies to help you land interviews and ace your offers.
        </p>

        {/* Category Filters */}
        {categories.length > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#043c44] text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-teal-50/60 hover:text-[#043c44]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Resource Cards Grid */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          Loading preparation articles...
        </div>
      ) : filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((resource) => (
            <Card
              key={resource.id}
              className="glass-panel glass-panel-hover p-6 rounded-2xl border border-teal-100 bg-white/90 shadow-sm flex flex-col justify-between space-y-6 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-[#0d9488] border border-teal-200/60">
                    {resource.category}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(resource.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                <CardHeader className="p-0 space-y-2">
                  <CardTitle className="font-heading font-bold text-lg text-[#043c44] group-hover:text-[#0d9488] transition-colors leading-snug">
                    <Link to={`/resources/${resource.slug}`}>{resource.title}</Link>
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                  <CardDescription className="text-slate-600 text-sm leading-relaxed line-clamp-3">
                    {resource.summary}
                  </CardDescription>
                </CardContent>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <Button
                  asChild
                  variant="ghost"
                  className="p-0 h-auto text-xs font-semibold text-[#043c44] hover:text-[#0d9488] flex items-center gap-1.5 bg-transparent hover:bg-transparent"
                >
                  <Link to={`/resources/${resource.slug}`}>
                    Read Guide
                    <ArrowRight className="w-3.5 h-3.5 text-[#0d9488] group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="glass-panel p-12 rounded-3xl text-center space-y-4 border-dashed border-teal-200 bg-white/90 max-w-lg mx-auto shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#0d9488] border border-teal-200/60 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <CardHeader className="p-0 space-y-1">
            <CardTitle className="font-heading font-bold text-xl text-[#043c44]">No articles found</CardTitle>
            <CardDescription className="text-slate-600 text-sm">
              No preparation guides match the selected category filter.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};
