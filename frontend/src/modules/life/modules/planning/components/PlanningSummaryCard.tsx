import { Card } from '../../../components/ui/Card';
import type { PlanningOverview } from '../types';

interface PlanningSummaryCardProps {
  overview: PlanningOverview;
}

export function PlanningSummaryCard({ overview }: PlanningSummaryCardProps) {
  return (
    <Card>
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <p className="text-sm text-slate-400">Weekly</p>
          <p className="text-xl font-semibold text-white">{overview.weeklyGoals}</p>
        </div>
        <div>
          <p className="text-sm text-slate-400">Monthly</p>
          <p className="text-xl font-semibold text-white">{overview.monthlyGoals}</p>
        </div>
        <div>
          <p className="text-sm text-slate-400">Quarterly</p>
          <p className="text-xl font-semibold text-white">{overview.quarterlyGoals}</p>
        </div>
        <div>
          <p className="text-sm text-slate-400">Avg Progress</p>
          <p className="text-xl font-semibold text-emerald-300">{overview.averageProgress}%</p>
        </div>
      </div>
    </Card>
  );
}
