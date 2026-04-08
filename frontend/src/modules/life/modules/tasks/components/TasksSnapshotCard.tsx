import { Card } from '../../../components/ui/Card';
import type { TasksOverview } from '../types';

interface TasksSnapshotCardProps {
  overview: TasksOverview;
}

export function TasksSnapshotCard({ overview }: TasksSnapshotCardProps) {
  return (
    <Card>
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <p className="text-sm text-slate-400">Inbox</p>
          <p className="text-xl font-semibold text-white">{overview.inbox}</p>
        </div>
        <div>
          <p className="text-sm text-slate-400">Today</p>
          <p className="text-xl font-semibold text-white">{overview.today}</p>
        </div>
        <div>
          <p className="text-sm text-slate-400">Overdue</p>
          <p className="text-xl font-semibold text-amber-300">{overview.overdue}</p>
        </div>
        <div>
          <p className="text-sm text-slate-400">Done</p>
          <p className="text-xl font-semibold text-emerald-300">{overview.done}</p>
        </div>
      </div>
    </Card>
  );
}
