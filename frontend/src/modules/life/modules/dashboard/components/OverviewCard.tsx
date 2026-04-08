import type { ReactNode } from 'react';
import { Card } from '../../../components/ui/Card';
import { cn } from '../../../utils/cn';

interface OverviewCardProps {
  title: string;
  value: string;
  helper: string;
  icon: ReactNode;
  className?: string;
}

export function OverviewCard({ title, value, helper, icon, className }: OverviewCardProps) {
  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{helper}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-2 text-cyan-300">{icon}</div>
      </div>
    </Card>
  );
}
