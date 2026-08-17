import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

interface ApiErrorBoundaryProps {
  title?: string;
  description?: string;
  error?: Error | string | null;
  onRetry?: () => void;
  className?: string;
}

export const ApiErrorBoundary: React.FC<ApiErrorBoundaryProps> = ({
  title = 'Unable to Load Data',
  description = 'An error occurred while fetching information from the server.',
  error,
  onRetry,
  className = '',
}) => {
  const errorMessage =
    typeof error === 'string'
      ? error
      : error?.message || 'Network error or server unreachable.';

  return (
    <Card className={`glass-panel p-8 rounded-3xl text-center border border-red-200/80 bg-red-50/40 max-w-lg mx-auto shadow-sm ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-red-100/80 text-red-600 border border-red-200 flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-6 h-6" />
      </div>
      <CardHeader className="p-0 space-y-1">
        <CardTitle className="font-heading font-bold text-xl text-slate-800">{title}</CardTitle>
        <CardDescription className="text-slate-600 text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0 pt-3 space-y-4">
        {errorMessage && (
          <div className="bg-white/90 text-red-700 text-xs font-mono p-3 rounded-xl border border-red-200 text-left overflow-x-auto max-h-24">
            {errorMessage}
          </div>
        )}
        {onRetry && (
          <Button
            type="button"
            onClick={onRetry}
            className="px-5 py-2.5 rounded-xl bg-[#043c44] hover:bg-[#08545e] text-white font-semibold shadow-xs transition-all flex items-center gap-2 mx-auto text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
