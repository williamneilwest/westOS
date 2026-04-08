import type { PropsWithChildren } from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends PropsWithChildren {
  title?: string;
  description?: string;
  className?: string;
  variant?: 'default' | 'featured' | 'compact';
}

const variants = {
  default:
    'rounded-xl bg-zinc-900/80 border border-white/10 p-4 sm:p-5 hover:scale-[1.01] hover:border-emerald-400/30 hover:shadow-[0_0_25px_rgba(16,185,129,0.15)]',
  featured:
    'rounded-xl bg-zinc-900/90 border border-emerald-400/20 p-4 sm:p-6 shadow-[0_0_25px_rgba(16,185,129,0.15)] hover:scale-[1.01] hover:border-emerald-400/30',
  compact:
    'rounded-xl bg-zinc-900/60 border border-white/10 p-3 sm:p-4 hover:scale-[1.01] hover:border-emerald-400/30',
} as const;

export function Card({ title, description, children, className, variant = 'default' }: CardProps) {
  return (
    <section
      className={cn(
        'group flex flex-col overflow-hidden transition-all duration-200',
        variants[variant],
        className,
      )}
    >
      {variant !== 'compact' ? (
        <div
          className={cn(
            '-mx-4 -mt-4 mb-4 h-1 rounded-t-xl bg-gradient-to-r from-emerald-500 to-cyan-500 sm:-mx-5 sm:-mt-5',
            variant === 'featured' && 'sm:-mx-6 sm:-mt-6',
          )}
        />
      ) : null}

      {title ? <h3 className="text-base font-semibold text-white">{title}</h3> : null}
      {description ? <p className="mt-1 text-sm text-zinc-400">{description}</p> : null}

      <div className={cn('flex-1', (title || description) && 'mt-4')}>{children}</div>
    </section>
  );
}
