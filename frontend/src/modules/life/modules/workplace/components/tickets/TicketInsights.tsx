import type { TicketAnalyticsPayload } from '../../types';

interface TicketInsightsProps {
  analytics: TicketAnalyticsPayload;
}

function renderCountBar(value: number, max: number): string {
  if (max <= 0) {
    return '0%';
  }
  return `${Math.max(8, Math.round((value / max) * 100))}%`;
}

export function TicketInsights({ analytics }: TicketInsightsProps) {
  const assigneeMax = Math.max(...analytics.by_assignee.map((item) => item.count), 0);
  const priorityMax = Math.max(...analytics.by_priority.map((item) => item.count), 0);
  const statusMax = Math.max(...analytics.by_status.map((item) => item.count), 0);

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <section className="rounded-xl border border-white/10 bg-zinc-950/60 p-3">
        <h4 className="text-sm font-semibold text-white">Top Assignees</h4>
        <div className="mt-3 space-y-2">
          {analytics.by_assignee.slice(0, 6).map((item) => (
            <div key={item.assignee} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="truncate">{item.assignee}</span>
                <span>{item.count}</span>
              </div>
              <div className="h-1.5 rounded bg-zinc-800">
                <div
                  className="h-1.5 rounded bg-cyan-400"
                  style={{ width: renderCountBar(item.count, assigneeMax) }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-zinc-950/60 p-3">
        <h4 className="text-sm font-semibold text-white">Priority Breakdown</h4>
        <div className="mt-3 space-y-2">
          {analytics.by_priority.map((item) => (
            <div key={item.priority} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>{item.priority}</span>
                <span>{item.count}</span>
              </div>
              <div className="h-1.5 rounded bg-zinc-800">
                <div
                  className="h-1.5 rounded bg-amber-400"
                  style={{ width: renderCountBar(item.count, priorityMax) }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-zinc-950/60 p-3">
        <h4 className="text-sm font-semibold text-white">Status Distribution</h4>
        <div className="mt-3 space-y-2">
          {analytics.by_status.map((item) => (
            <div key={item.status} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>{item.status}</span>
                <span>{item.count}</span>
              </div>
              <div className="h-1.5 rounded bg-zinc-800">
                <div
                  className="h-1.5 rounded bg-emerald-400"
                  style={{ width: renderCountBar(item.count, statusMax) }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
