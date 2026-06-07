import { Fragment } from 'react';

export type StepDefinition = { k: number; name: string };

export const STEPS: ReadonlyArray<StepDefinition> = [
  { k: 1, name: 'Upload' },
  { k: 2, name: 'Select' },
  { k: 3, name: 'Configure' },
  { k: 4, name: 'Done' },
];

type StepState = 'done' | 'now' | 'upcoming';

function stateFor(stepKey: number, current: number): StepState {
  if (stepKey < current) return 'done';
  if (stepKey === current) return 'now';
  return 'upcoming';
}

export interface StepperProps {
  current: number;
  onNavigate?: (step: number) => void;
  className?: string;
}

export function Stepper({ current, onNavigate, className }: StepperProps) {
  return (
    <nav
      aria-label="Steps"
      className={[
        'inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px]',
        className ?? '',
      ]
        .join(' ')
        .trim()}
    >
      <ol className="contents">
        {STEPS.map((step, index) => {
          const rawState = stateFor(step.k, current);
          // Step 4 on screen 4 = everything complete → treat as done
          const state: StepState = rawState === 'now' && current === 4 ? 'done' : rawState;
          const badgeClasses = [
            'font-display inline-flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px] font-semibold',
            state === 'now' && 'bg-foreground text-background',
            state === 'done' && 'text-emerald-500',
            state === 'upcoming' && 'text-muted-foreground',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <Fragment key={step.k}>
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className="h-px w-1 bg-[var(--slice-line-strong)]"
                />
              )}
              <li
                data-state={state}
                aria-current={state === 'now' ? 'step' : undefined}
                className={[
                  'inline-flex items-center gap-2',
                  state === 'upcoming' ? 'text-muted-foreground' : 'text-foreground',
                ].join(' ')}
              >
                {state === 'done' && onNavigate ? (
                  <button
                    type="button"
                    onClick={() => onNavigate(step.k)}
                    aria-label={`Back to ${step.name}`}
                    className={[
                      badgeClasses,
                      'border border-emerald-500/40 hover:border-emerald-500 hover:bg-emerald-500/10 transition-colors cursor-pointer',
                    ].join(' ')}
                  >
                    ✓
                  </button>
                ) : (
                  <span className={badgeClasses} aria-hidden="true">
                    {state === 'done' ? '✓' : step.k}
                  </span>
                )}
                {(state === 'now' || (current === 4 && step.k === 4)) && (
                  <span className={current === 4 ? 'font-medium text-emerald-500' : 'font-medium text-foreground'}>
                    {step.name}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
