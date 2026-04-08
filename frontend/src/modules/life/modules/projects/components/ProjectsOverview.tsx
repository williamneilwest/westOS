import { Card } from '../../../components/ui/Card';
import type { ProjectsSummary } from '../types';

interface ProjectsOverviewProps {
  summary: ProjectsSummary;
}

export function ProjectsOverview({ summary }: ProjectsOverviewProps) {
  return (
    <Card>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white/5 p-3">
          <p className="text-sm text-slate-400">Total</p>
          <p className="text-xl font-semibold text-white">{summary.total}</p>
        </div>
        <div className="rounded-2xl bg-white/5 p-3">
          <p className="text-sm text-slate-400">Active</p>
          <p className="text-xl font-semibold text-white">{summary.active}</p>
        </div>
        <div className="rounded-2xl bg-white/5 p-3">
          <p className="text-sm text-slate-400">Blocked</p>
          <p className="text-xl font-semibold text-amber-300">{summary.blocked}</p>
        </div>
      </div>
    </Card>
  );
}
