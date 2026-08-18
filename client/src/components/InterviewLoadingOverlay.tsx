import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, Bot, Mic, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface InterviewLoadingOverlayProps {
  targetRole?: string;
}

export const InterviewLoadingOverlay: React.FC<InterviewLoadingOverlayProps> = ({
  targetRole = 'Software Engineer',
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { title: 'Reading resume details...', icon: Bot },
    { title: 'Generating role-specific questions...', icon: Sparkles },
    { title: 'Setting up voice AI coach...', icon: Mic },
    { title: 'Launching practice session...', icon: CheckCircle2 },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1200);
    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <Card className="glass-panel p-8 sm:p-10 rounded-3xl max-w-md w-full border-teal-200/80 bg-white/95 shadow-2xl text-center space-y-6 relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* Central Spinner Badge */}
        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-teal-50 border border-teal-200 text-[#0d9488] flex items-center justify-center shadow-lg shadow-teal-500/10">
          <Loader2 className="w-10 h-10 animate-spin text-[#0d9488]" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#043c44] text-teal-300 flex items-center justify-center shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Title & Role */}
        <div className="space-y-2 relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100/80 text-[#0d9488] text-xs font-bold uppercase tracking-wider">
            Gemini AI Voice Coach
          </span>
          <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-[#043c44]">
            Preparing Mock Interview
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Tailoring voice interview prompts for <strong className="text-[#043c44] font-semibold">{targetRole}</strong>
          </p>
        </div>

        {/* Dynamic Progress Steps */}
        <div className="space-y-2 pt-2 border-t border-slate-100 relative z-10">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isDone = idx < currentStep;
            const isCurrent = idx === currentStep;

            return (
              <div
                key={idx}
                className={`flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-300 ${
                  isCurrent
                    ? 'bg-teal-50 text-[#043c44] border border-teal-200/80 font-bold shadow-2xs'
                    : isDone
                    ? 'text-slate-500 opacity-60'
                    : 'text-slate-400 opacity-40'
                }`}
              >
                {isCurrent ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#0d9488] shrink-0" />
                ) : (
                  <Icon className={`w-4 h-4 shrink-0 ${isDone ? 'text-teal-600' : 'text-slate-400'}`} />
                )}
                <span className="truncate">{step.title}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
