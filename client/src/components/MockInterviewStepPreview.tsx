import React, { useState, useEffect } from 'react';
import { Bot, AudioLines, Sparkles, ArrowRight, HelpCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

export const MockInterviewStepPreview: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const steps = [
    {
      id: 0,
      icon: Bot,
      stepNumber: 'Step 1',
      title: 'AI Asks a Question',
      description: 'Voice-guided interview prompts tailored to your target role',
    },
    {
      id: 1,
      icon: AudioLines,
      stepNumber: 'Step 2',
      title: 'You Speak Your Answer',
      description: 'Respond out loud in real time with natural voice recognition',
    },
    {
      id: 2,
      icon: Sparkles,
      stepNumber: 'Step 3',
      title: 'Get Instant Feedback',
      description: 'Actionable STAR method scoring & section-by-section breakdown',
    },
  ];

  return (
    <Card className="glass-panel p-6 sm:p-8 rounded-3xl border-teal-100/80 bg-white/90 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#0d9488] border border-teal-200/60 flex items-center justify-center shadow-xs">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-lg text-[#043c44]">How Mock Interviews Work</h3>
            <p className="text-xs text-slate-500">Practice out loud with real-time AI voice feedback before your real interview</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-50 text-[#0d9488] border border-teal-200/60 self-start sm:self-auto">
          3-Step Interactive Practice
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = activeStep === step.id;

          return (
            <div key={step.id} className="flex items-center gap-4 relative">
              <div
                className={`flex-1 p-5 sm:p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-4 ${
                  isActive
                    ? 'bg-white border-teal-300 shadow-md shadow-teal-500/10 scale-102 ring-2 ring-teal-400/20'
                    : 'bg-slate-50/50 border-slate-200/80 hover:border-teal-200 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-teal-100 text-[#0d9488]'
                        : 'bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    {step.stepNumber}
                  </span>
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-[#043c44] text-teal-300 shadow-md scale-110'
                        : 'bg-white text-slate-500 border border-slate-200'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className={`font-heading font-bold text-base ${isActive ? 'text-[#043c44]' : 'text-slate-700'}`}>
                    {step.title}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Connecting Arrow for desktop */}
              {idx < steps.length - 1 && (
                <div className="hidden md:flex items-center justify-center shrink-0 -mr-2 z-10">
                  <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-200/80 flex items-center justify-center text-[#0d9488] shadow-2xs">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
