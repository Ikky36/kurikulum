import React from 'react';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { TAMasterPhase } from '@/lib/types';

interface TATimelineProps {
  phases: TAMasterPhase[];
  currentPhaseId?: string | null;
}

export function TATimeline({ phases, currentPhaseId }: TATimelineProps) {
  if (!phases || phases.length === 0) return null;

  const currentIndex = currentPhaseId 
    ? phases.findIndex(p => p.id === currentPhaseId) 
    : 0;

  return (
    <div className="w-full py-4 overflow-x-auto">
      <div className="flex items-center min-w-max px-4">
        {phases.map((phase, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <React.Fragment key={phase.id}>
              {/* Node */}
              <div className="flex flex-col items-center relative z-10 w-32">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center border-2 bg-background
                  ${isCompleted ? 'border-green-500 text-green-500' : ''}
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
                  <p className={`text-xs font-medium leading-tight ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                    {phase.name}
                  </p>
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
