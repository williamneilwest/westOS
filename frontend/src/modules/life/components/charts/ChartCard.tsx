import type { PropsWithChildren } from 'react';
import { Card } from '../ui/Card';

interface ChartCardProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
}

export function ChartCard({ title, subtitle, children }: ChartCardProps) {
  return (
    <Card className="h-full">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
      </div>
      <div className="h-72">{children}</div>
    </Card>
  );
}
