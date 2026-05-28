import { cn } from '@/lib/utils';

export interface PostGenStepsProps {
  className?: string;
}

const STEPS = [
  <>You download the ZIP.</>,
  <>
    You configure the <code className="font-mono text-foreground">.env</code>.
  </>,
  <>You paste the snippet into your agent.</>,
];

export function PostGenSteps({ className }: PostGenStepsProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <p className="eyebrow">After generation</p>
      <ol className="flex flex-col gap-1">
        {STEPS.map((content, i) => (
          <li key={i} className="font-mono flex gap-2 text-xs text-muted-foreground">
            <span className="font-serif text-sm italic text-foreground">{i + 1}.</span>
            <span>{content}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
