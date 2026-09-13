import React from 'react';
import { Check, CheckCircle2, ChevronRight, Layers, FileCheck, ShieldCheck, FileText } from 'lucide-react';

export interface InspectionStepperProps {
  currentStage: 1 | 2 | 3 | 4;
  totalExpected?: number;
  totalCreated?: number;
  isCompleted?: boolean;
  onStageClick?: (stage: number) => void;
}

export const InspectionStepper: React.FC<InspectionStepperProps> = ({
  currentStage,
  totalExpected = 1,
  totalCreated = 0,
  isCompleted = false,
  onStageClick,
}) => {
  const isSamplingDone = totalCreated >= totalExpected && totalExpected > 0;

  const steps = [
    {
      stage: 1,
      name: 'Case Details',
      subtitle: 'Commodity & Context',
      icon: FileCheck,
      isDone: true, // Stage 1 is inherently completed once the case exists
      isActive: currentStage === 1,
    },
    {
      stage: 2,
      name: 'Package Samples',
      subtitle: `${totalCreated} of ${totalExpected} Units`,
      icon: Layers,
      isDone: isSamplingDone,
      isActive: currentStage === 2,
    },
    {
      stage: 3,
      name: 'Statutory Findings',
      subtitle: '33 Rules Evaluated',
      icon: ShieldCheck,
      isDone: isCompleted,
      isActive: currentStage === 3,
    },
    {
      stage: 4,
      name: 'Finalize & Report',
      subtitle: isCompleted ? 'Sealed & Certified' : 'Officer Sign-Off',
      icon: FileText,
      isDone: isCompleted,
      isActive: currentStage === 4,
    },
  ];

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isClickable = !!onStageClick;

          // Determine color scheme
          let circleBg = 'bg-slate-100 text-slate-400 border-slate-200';
          let titleColor = 'text-slate-500';
          let subtitleColor = 'text-slate-400';

          if (step.isDone) {
            circleBg = 'bg-emerald-600 text-white border-emerald-600 shadow-xs';
            titleColor = 'text-slate-800 font-bold';
            subtitleColor = 'text-emerald-700 font-medium';
          } else if (step.isActive) {
            circleBg = 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-100 shadow-xs';
            titleColor = 'text-blue-900 font-bold';
            subtitleColor = 'text-blue-700 font-medium';
          }

          return (
            <React.Fragment key={step.stage}>
              <div
                onClick={() => isClickable && onStageClick(step.stage)}
                className={`flex items-center space-x-2.5 flex-1 min-w-0 ${
                  isClickable ? 'cursor-pointer group' : ''
                }`}
              >
                {/* Step Circle Indicator */}
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-200 flex-shrink-0 ${circleBg}`}
                >
                  {step.isDone ? (
                    <Check className="w-4 h-4 text-white stroke-[2.5]" />
                  ) : (
                    <span>{step.stage}</span>
                  )}
                </div>

                {/* Step Text Info */}
                <div className="min-w-0 hidden md:block">
                  <div className={`text-xs truncate ${titleColor}`}>
                    {step.name}
                  </div>
                  <div className={`text-[10px] truncate ${subtitleColor}`}>
                    {step.subtitle}
                  </div>
                </div>
              </div>

              {/* Connector Chevron between steps */}
              {idx < steps.length - 1 && (
                <div className="flex-shrink-0 text-slate-300 px-0.5 sm:px-1">
                  <ChevronRight className="w-4 h-4" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

