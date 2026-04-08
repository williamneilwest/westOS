import { Card } from '../../../components/ui/Card';
import type { HomelabOverview } from '../types';

interface HomelabStatusCardProps {
  overview: HomelabOverview;
}

export function HomelabStatusCard({ overview }: HomelabStatusCardProps) {
  return (
    <Card>
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <p className="text-sm text-slate-400">Total</p>
          <p className="text-xl font-semibold text-white">{overview.totalServices}</p>
        </div>
        <div>
          <p className="text-sm text-slate-400">Healthy</p>
          <p className="text-xl font-semibold text-emerald-300">{overview.healthyServices}</p>
        </div>
        <div>
          <p className="text-sm text-slate-400">Degraded</p>
          <p className="text-xl font-semibold text-amber-300">{overview.degradedServices}</p>
        </div>
        <div>
          <p className="text-sm text-slate-400">Offline</p>
          <p className="text-xl font-semibold text-rose-300">{overview.offlineServices}</p>
        </div>
      </div>
    </Card>
  );
}
