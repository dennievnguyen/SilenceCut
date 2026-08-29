import type { ReactNode } from 'react';

export type PipelineStepId = 'upload' | 'detect' | 'trim' | 'export';

interface PipelineStep {
  id: PipelineStepId;
  label: string;
}

const PIPELINE_STEPS: PipelineStep[] = [
  { id: 'upload', label: 'New Project' },
  { id: 'detect', label: 'Silence Detection' },
  { id: 'trim', label: 'Trim Settings' },
  { id: 'export', label: 'Export' },
];

export interface RecentFile {
  id: string;
  name: string;
  status: string;
}

interface AppShellProps {
  currentStep: PipelineStepId;
  completedSteps: PipelineStepId[];
  recentFiles?: RecentFile[];
  children: ReactNode;
}

function StepIcon({ done, active }: { done: boolean; active: boolean }) {
  if (done) {
    return (
      <svg className="h-4 w-4 text-mint" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.42 0L3.296 10.22a1 1 0 111.42-1.42l3.03 3.03 6.54-6.54a1 1 0 011.42 0z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  return (
    <span
      className={`block h-2 w-2 rounded-full ${active ? 'bg-orange' : 'bg-white/30'}`}
    />
  );
}

export function AppShell({ currentStep, completedSteps, recentFiles = [], children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col bg-navy-900 text-white">
        <div className="flex items-center gap-2 px-6 py-6">
          <svg className="h-5 w-5 text-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M6 9l6 6m0-6l-6 6M3 4l4 8-4 8M21 4l-4 8 4 8"
            />
          </svg>
          <span className="text-[20px] font-medium tracking-wide">SilenceCut</span>
        </div>

        <nav className="mt-2 flex flex-col gap-0.5 px-3">
          {PIPELINE_STEPS.map((step) => {
            const isActive = step.id === currentStep;
            const isDone = completedSteps.includes(step.id);
            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'border-l-[3px] border-orange bg-navy-800 pl-[9px] font-medium text-white'
                    : isDone
                    ? 'text-white/80'
                    : 'text-white/40'
                }`}
              >
                <StepIcon done={isDone} active={isActive} />
                {step.label}
              </div>
            );
          })}
        </nav>

        {recentFiles.length > 0 && (
          <div className="mt-8 px-6">
            <div className="mb-2 text-[11px] font-medium tracking-wider text-white/40">
              RECENT FILES
            </div>
            <div className="flex flex-col gap-1">
              {recentFiles.map((file) => (
                <div
                  key={file.id}
                  className="truncate rounded px-1 py-1.5 text-[13px] text-white/70 hover:bg-navy-800"
                  title={file.name}
                >
                  {file.name}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto flex items-center gap-4 px-6 py-5 text-white/50">
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 15a3 3 0 100-6 3 3 0 000 6z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h0A1.65 1.65 0 0010 3.09V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51h0a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v0a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1v0z"
            />
          </svg>
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01M12 22a10 10 0 100-20 10 10 0 000 20z"
            />
          </svg>
        </div>
      </aside>

      {/* Main canvas */}
      <div className="flex flex-1 flex-col px-10 py-10">
        <div className="mx-auto w-full max-w-4xl flex-1 rounded-lg bg-surface p-8 shadow-lg">
          {children}
        </div>
      </div>
    </div>
  );
}
