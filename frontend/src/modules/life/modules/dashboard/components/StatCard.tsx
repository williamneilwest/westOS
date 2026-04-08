import type { ReactNode } from 'react';
import { Card } from '../../../components/ui/Card';

interface StatCardProps {
  title: string;
  value: string;
  helper: string;
  icon: ReactNode;
}

export function StatCard({ title, value, helper, icon }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{helper}</p>
        </div>
        <div className="rounded-2xl bg-white/10 p-3 text-slate-100">{icon}</div>
      </div>
    </Card>
  );
}
