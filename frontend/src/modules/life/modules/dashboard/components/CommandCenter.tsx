import { AlertTriangle, CircleDollarSign, PauseCircle, PlayCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export interface CommandCenterStats {
  tasks: number;
  blockers: number;
  urgent: number;
  pending: number;
  financialFlow: string;
}

interface CommandCenterProps {
  userName: string;
  stats: CommandCenterStats;
  focusMode: boolean;
  onRunMyDay: () => void;
  onToggleFocusMode: () => void;
  onSyncAllData: () => void;
}

function getGreetingByTime(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

export function CommandCenter({
  userName,
  stats,
  focusMode,
  onRunMyDay,
  onToggleFocusMode,
  onSyncAllData,
}: CommandCenterProps) {
  const greeting = getGreetingByTime(new Date());

  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/95 via-zinc-900/85 to-zinc-900/70 p-4 shadow-[0_0_25px_rgba(16,185,129,0.15)] backdrop-blur-md transition-all duration-200 sm:p-6">
      <p className="text-xs uppercase tracking-wide text-zinc-400">Command Center</p>
      <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl lg:text-3xl">
        {greeting}, {userName} - You have {stats.tasks} tasks, {stats.blockers} blockers, and {stats.financialFlow} financial flow today.
      </h2>
      <p className="mt-2 text-sm text-zinc-400">
        Run your core workflows, switch into focus, and keep every domain in sync from one panel.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:flex-wrap sm:gap-3">
        <Button className="w-full sm:w-auto" onClick={onRunMyDay}>
          <PlayCircle className="mr-2 h-4 w-4" />
          Run My Day
        </Button>
        <Button variant="outline" className="w-full sm:w-auto" onClick={onToggleFocusMode}>
          {focusMode ? <PauseCircle className="mr-2 h-4 w-4" /> : <PlayCircle className="mr-2 h-4 w-4" />}
          {focusMode ? 'Exit Focus Mode' : 'Focus Mode'}
        </Button>
        <Button variant="outline" className="w-full sm:w-auto" onClick={onSyncAllData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Sync All Data
        </Button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Urgent Items</p>
          <p className="mt-1 text-lg font-semibold text-white">{stats.urgent}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Pending Tasks</p>
          <p className="mt-1 text-lg font-semibold text-white">{stats.pending}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Financial Snapshot</p>
          <div className="mt-1 flex items-center gap-1 text-lg font-semibold text-emerald-300">
            <CircleDollarSign className="h-4 w-4" />
            {stats.financialFlow}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Blockers</p>
          <div className="mt-1 flex items-center gap-1 text-lg font-semibold text-amber-300">
            <AlertTriangle className="h-4 w-4" />
            {stats.blockers}
          </div>
        </div>
      </div>
    </section>
  );
}
