import { Badge, Card } from '../../../components/ui';
import type { PlanningGoal } from '../types';

interface GoalsTableProps {
  goals: PlanningGoal[];
  onProgressChange: (id: string, progress: number) => void;
}

function cadenceVariant(cadence: PlanningGoal['cadence']) {
  if (cadence === 'quarterly') {
    return 'info' as const;
  }
  if (cadence === 'monthly') {
    return 'success' as const;
  }
  return 'neutral' as const;
}

export function GoalsTable({ goals, onProgressChange }: GoalsTableProps) {
  return (
    <Card>
      <h3 className="text-lg font-semibold text-white">Goals</h3>
      <div className="mt-4 space-y-3">
        {goals.map((goal) => (
          <div key={goal.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">{goal.title}</p>
                <p className="text-xs text-slate-400">Target: {goal.targetDate}</p>
              </div>
              <Badge variant={cadenceVariant(goal.cadence)}>{goal.cadence}</Badge>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                value={goal.progress}
                onChange={(event) => onProgressChange(goal.id, Number(event.target.value))}
                className="w-full"
              />
              <span className="w-12 text-right text-xs text-slate-300">{goal.progress}%</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
