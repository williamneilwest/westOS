import type { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'success' | 'warning' | 'info';
}

const badgeStyles = {
  neutral: 'border-white/10 bg-white/5 text-slate-300',
  success: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  warning: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  info: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
};

export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium', badgeStyles[variant], className)}
      {...props}
    />
  );
}
