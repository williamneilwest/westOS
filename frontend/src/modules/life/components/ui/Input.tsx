import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  leadingIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helper, className, leadingIcon, ...props },
  ref,
) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-200">
      {label ? <span className="font-medium">{label}</span> : null}
      <div className="relative">
        {leadingIcon ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{leadingIcon}</span> : null}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none ring-0 transition placeholder:text-slate-500 focus:border-cyan-400/50',
            leadingIcon ? 'pl-10' : undefined,
            className,
          )}
          {...props}
        />
      </div>
      {helper ? <span className="text-xs text-slate-500">{helper}</span> : null}
    </label>
  );
});
