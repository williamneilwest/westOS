import type { PropsWithChildren, ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface SectionHeaderProps extends PropsWithChildren {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
  actions?: ReactNode;
}

export function SectionHeader({ eyebrow, title, description, className, actions, children }: SectionHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 md:flex-row md:items-end md:justify-between', className)}>
      <div>
        {eyebrow ? <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{eyebrow}</p> : null}
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">{title}</h2>
        {description ? <p className="mt-2 text-sm text-slate-400">{description}</p> : null}
        {children}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
