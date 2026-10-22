import React from 'react';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { TAMasterPhase } from '@/lib/types';

interface TATimelineProps {
  phases: TAMasterPhase[];
  currentPhaseId?: string | null;
  onSelectPhase?: (phase: TAMasterPhase, index: number) => void;
  allowRevertClick?: boolean;
}

export function TATimeline({ phases, currentPhaseId, onSelectPhase, allowRevertClick = false }: TATimelineProps) {
  if (!phases || phases.length === 0) return null;

  const currentIndex = currentPhaseId 
    ? phases.findIndex(p => p.id === currentPhaseId) 
    : -1;

  return (
    <div className="w-full py-4 overflow-x-auto">
      <div className="flex items-center min-w-max px-4">
        {phases.map((phase, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;
          const isPending = index > currentIndex;
          const isClickable = isCompleted && allowRevertClick && !!onSelectPhase;

          return (
            <React.Fragment key={phase.id}>
              {/* Node */}
              <div 
                className={`flex flex-col items-center relative z-10 w-32 ${isClickable ? 'cursor-pointer group' : ''}`}
                onClick={() => {
                  if (isClickable && onSelectPhase) {
                    onSelectPhase(phase, index);
                  }
                }}
                title={isClickable ? `Klik untuk mengembalikan ke fase "${phase.name}"` : undefined}
              >
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center border-2 bg-background transition-all
                  ${isCompleted ? 'border-green-500 text-green-500' : ''}
                  ${isClickable ? 'group-hover:border-amber-500 group-hover:text-amber-500 group-hover:scale-110 group-hover:shadow-md' : ''}
                  ${isActive ? 'border-primary text-primary shadow-sm bg-primary/5' : ''}
                  ${isPending ? 'border-muted text-muted-foreground' : ''}
                `}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : isActive ? (
                    <Clock className="w-5 h-5" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </div>
                <div className="mt-3 text-center">
                  <p className={`text-xs font-medium leading-tight ${isActive ? 'text-primary' : 'text-muted-foreground'} ${isClickable ? 'group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:font-semibold' : ''}`}>
                    {phase.name}
                  </p>
                  {isClickable && (
                    <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 opacity-0 group-hover:opacity-100 transition-opacity block mt-0.5">
                      Kembalikan
                    </span>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {index < phases.length - 1 && (
                <div className={`h-1 w-16 -ml-4 -mr-4 mt-[-2rem] z-0 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-muted'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
