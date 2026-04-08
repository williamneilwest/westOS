import { AlertTriangle, Bell, CheckCircle2, Info } from 'lucide-react';
import { Card } from '../../../components/ui';
import type { WorkplaceNotification } from '../types';

interface NotificationsPanelProps {
  notifications: WorkplaceNotification[];
}

const iconByType = {
  info: Info,
  success: CheckCircle2,
  error: AlertTriangle,
};

const toneByType = {
  info: 'text-cyan-200 border-cyan-400/20 bg-cyan-500/10',
  success: 'text-emerald-200 border-emerald-400/20 bg-emerald-500/10',
  error: 'text-rose-200 border-rose-400/20 bg-rose-500/10',
};

export function NotificationsPanel({ notifications }: NotificationsPanelProps) {
  return (
    <Card title="Notifications" description="Recent alerts, execution updates, and important events." className="h-full">
      <div className="max-h-[480px] space-y-2 overflow-auto pr-1">
        {notifications.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-3 text-sm text-slate-400">No notifications yet.</div>
        ) : (
          notifications.map((item) => {
            const Icon = iconByType[item.type];
            return (
              <div key={item.id} className={`rounded-xl border p-3 ${toneByType[item.type]}`}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <p className="text-sm font-semibold">{item.title}</p>
                </div>
                <p className="mt-1 text-xs opacity-90">{item.message}</p>
                <p className="mt-1 text-[11px] opacity-70">{new Date(item.timestamp).toLocaleString()}</p>
              </div>
            );
          })
        )}
      </div>
      <div className="mt-3 inline-flex items-center gap-1 text-xs text-slate-500">
        <Bell className="h-3.5 w-3.5" />
        Live updates from script execution and tools
      </div>
    </Card>
  );
}
