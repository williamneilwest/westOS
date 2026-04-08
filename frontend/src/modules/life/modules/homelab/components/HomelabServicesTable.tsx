import { Badge, Card } from '../../../components/ui';
import type { HomelabHealth, HomelabServiceItem } from '../types';

interface HomelabServicesTableProps {
  services: HomelabServiceItem[];
  onStatusChange: (id: string, status: HomelabHealth) => void;
}

function healthVariant(status: HomelabHealth) {
  if (status === 'healthy') {
    return 'success' as const;
  }
  if (status === 'degraded') {
    return 'warning' as const;
  }
  return 'neutral' as const;
}

export function HomelabServicesTable({ services, onStatusChange }: HomelabServicesTableProps) {
  return (
    <Card>
      <h3 className="text-lg font-semibold text-white">Services</h3>
      <div className="mt-4 space-y-3">
        {services.map((service) => (
          <div key={service.id} className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 md:grid-cols-[1.3fr_1fr_130px_140px] md:items-center">
            <div>
              <p className="text-sm font-medium text-white">{service.name}</p>
              <p className="text-xs text-slate-400">{service.endpoint}</p>
            </div>
            <p className="text-xs text-slate-400">Uptime: {service.uptimeDays}d</p>
            <Badge variant={healthVariant(service.status)}>{service.status}</Badge>
            <select
              value={service.status}
              onChange={(event) => onStatusChange(service.id, event.target.value as HomelabHealth)}
              className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white"
            >
              <option value="healthy">Healthy</option>
              <option value="degraded">Degraded</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        ))}
      </div>
    </Card>
  );
}
