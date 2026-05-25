import { Fragment } from 'react';

export type StepDefinition = { k: number; name: string };

export const STEPS: ReadonlyArray<StepDefinition> = [
  { k: 1, name: 'Upload' },
  { k: 2, name: 'Sélection' },
  { k: 3, name: 'Configuration' },
  { k: 4, name: 'Terminé' },
];

type StepState = 'done' | 'now' | 'upcoming';

function stateFor(stepKey: number, current: number): StepState {
  if (stepKey < current) return 'done';
  if (stepKey === current) return 'now';
  return 'upcoming';
}

export interface StepperProps {
  current: number;
  className?: string;
}

export function Stepper({ current, className }: StepperProps) {
  return (
    <nav
      aria-label="Étapes"
      className={[
        'inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px]',
        className ?? '',
      ]
        .join(' ')
        .trim()}
    >
      <ol className="contents">
        {STEPS.map((step, index) => {
          const state = stateFor(step.k, current);
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
                <span
                  className={[
                    'font-display inline-flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px] font-semibold',
                    state === 'now' && 'bg-foreground text-background',
                    state === 'done' && 'text-foreground/80',
                    state === 'upcoming' && 'text-muted-foreground',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-hidden="true"
                >
                  {state === 'done' ? '✓' : step.k}
                </span>
                {state === 'now' && (
                  <span className="font-medium text-foreground">{step.name}</span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
