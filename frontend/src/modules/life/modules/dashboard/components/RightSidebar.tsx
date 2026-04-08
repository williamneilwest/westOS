import { Clock3, Database, Filter, HeartPulse, PlayCircle, Server, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';

interface RightSidebarProps {
  mode?: 'desktop' | 'focus-only' | 'mobile-secondary';
  onStartFocus: (minutes: number) => void;
}

type ActivityType = 'tasks' | 'planning' | 'system';

type ActivityFilter = 'all' | ActivityType;

interface ActivityEvent {
  id: string;
  type: ActivityType;
  label: string;
  detail: string;
  time: string;
}

const activityEvents: ActivityEvent[] = [
  { id: 'a1', type: 'tasks', label: 'Task sweep complete', detail: '4 tasks reprioritized', time: '9m ago' },
  { id: 'a2', type: 'planning', label: 'Planning check-in', detail: 'Goals refreshed', time: '22m ago' },
  { id: 'a3', type: 'system', label: 'Homelab health check', detail: 'All services online', time: '41m ago' },
  { id: 'a4', type: 'tasks', label: 'Project blocker flagged', detail: 'Dependency update pending', time: '1h ago' },
];

function FocusBlock({ onStartFocus }: { onStartFocus: (minutes: number) => void }) {
  const [selectedDuration, setSelectedDuration] = useState<25 | 50>(25);

  return (
    <Card variant="compact">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400">Focus Block</p>
          <h3 className="mt-1 font-semibold text-white">Deep Work Session</h3>
        </div>
        <Clock3 className="h-4 w-4 text-emerald-300" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {[25, 50].map((minutes) => (
          <button
            key={minutes}
            type="button"
            onClick={() => setSelectedDuration(minutes as 25 | 50)}
            className={`rounded-xl border px-3 py-2 text-sm transition-all duration-200 ${
              selectedDuration === minutes
                ? 'border-emerald-400/30 bg-emerald-500/10 text-white'
                : 'border-white/10 bg-zinc-900/70 text-zinc-300 hover:border-emerald-400/30'
            }`}
          >
            {minutes}m
          </button>
        ))}
      </div>

      <Button className="mt-3 w-full" onClick={() => onStartFocus(selectedDuration)}>
        <PlayCircle className="mr-2 h-4 w-4" />
        Start Focus Session
      </Button>
    </Card>
  );
}

function RecentActivity() {
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const filtered = useMemo(
    () => (filter === 'all' ? activityEvents : activityEvents.filter((event) => event.type === filter)),
    [filter],
  );

  return (
    <Card title="Recent Activity" description="Latest actions and logs.">
      <div className="mb-3 flex flex-wrap gap-2">
        {(['all', 'tasks', 'planning', 'system'] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs uppercase tracking-wide transition-all duration-200 ${
              filter === item
                ? 'border-emerald-400/30 bg-emerald-500/10 text-white'
                : 'border-white/10 bg-zinc-900/70 text-zinc-400 hover:border-emerald-400/30'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            {item}
          </button>
        ))}
      </div>

      <ul className="space-y-3">
        {filtered.map((event) => (
          <li key={event.id} className="rounded-xl border border-white/10 bg-zinc-900/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">{event.label}</p>
              <span className="text-xs uppercase tracking-wide text-zinc-400">{event.time}</span>
            </div>
            <p className="mt-1 text-sm text-zinc-400">{event.detail}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function SystemHealthPanel() {
  return (
    <Card title="System Health" description="Core platform readiness.">
      <ul className="space-y-3">
        <li className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/60 p-3">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-emerald-300" />
            <span className="text-sm text-zinc-200">API Status</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Operational
          </span>
        </li>
        <li className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/60 p-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-cyan-300" />
            <span className="text-sm text-zinc-200">Last Sync</span>
          </div>
          <span className="text-xs uppercase tracking-wide text-zinc-400">6 min ago</span>
        </li>
        <li className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/60 p-3">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-emerald-300" />
            <span className="text-sm text-zinc-200">Data Freshness</span>
          </div>
          <span className="text-xs uppercase tracking-wide text-emerald-300">98.7%</span>
        </li>
      </ul>
    </Card>
  );
}

export function RightSidebar({ mode = 'desktop', onStartFocus }: RightSidebarProps) {
  if (mode === 'focus-only') {
    return <FocusBlock onStartFocus={onStartFocus} />;
  }
  if (mode === 'mobile-secondary') {
    return (
      <aside className="space-y-4 md:space-y-6">
        <RecentActivity />
        <SystemHealthPanel />
      </aside>
    );
  }

  return (
    <aside className="space-y-4 md:space-y-6">
      <FocusBlock onStartFocus={onStartFocus} />
      <RecentActivity />
      <SystemHealthPanel />
    </aside>
  );
}
