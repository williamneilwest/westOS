import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, PropsWithChildren {
  variant?: 'primary' | 'ghost' | 'secondary' | 'outline';
}

const styles = {
  primary:
    'bg-gradient-to-r from-emerald-500 to-cyan-500 text-black hover:brightness-110 shadow-[0_0_20px_rgba(16,185,129,0.15)]',
  ghost: 'bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800/80',
  secondary: 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700',
  outline: 'border border-white/10 bg-zinc-900/60 text-zinc-300 hover:border-emerald-400/30 hover:text-white',
};

export function Button({ className, children, variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:cursor-not-allowed disabled:opacity-50',
        styles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
