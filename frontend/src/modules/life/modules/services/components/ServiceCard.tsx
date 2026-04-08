import { ExternalLink } from 'lucide-react';
import { Badge } from '../../../components/ui';
import { ServiceIcon } from './getIconComponent';
import type { ServiceItem, ServiceStatus } from '../types';

interface ServiceCardProps {
  service: ServiceItem;
  liveStatus?: ServiceStatus;
}

const statusVariant: Record<ServiceStatus, 'success' | 'warning' | 'neutral'> = {
  online: 'success',
  offline: 'warning',
  unknown: 'neutral',
};

export function ServiceCard({ service, liveStatus }: ServiceCardProps) {
  const status = liveStatus || service.status || 'unknown';

  return (
    <a
      href={service.href}
      target={service.target || '_blank'}
      rel="noreferrer"
      className="group rounded-2xl border border-white/10 bg-zinc-900/70 p-4 shadow transition duration-200 hover:scale-105 hover:border-cyan-300/40 hover:bg-zinc-900/90"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-500/10 p-2 text-cyan-200">
          <ServiceIcon icon={service.icon} name={service.name} />
        </div>
        <Badge variant={statusVariant[status]}>{status}</Badge>
      </div>

      <h4 className="mt-3 text-sm font-semibold text-white">{service.name}</h4>
      <p className="mt-1 text-xs text-slate-400">{service.description}</p>

      {service.widget?.type === 'homeassistant' ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-2">
          <p className="text-[11px] text-slate-400">Home Assistant Widget</p>
          <iframe
            src={service.widget.url}
            title={`${service.name} widget`}
            className="mt-2 h-24 w-full rounded border border-white/10"
            loading="lazy"
          />
        </div>
      ) : null}

      <div className="mt-3 inline-flex items-center text-xs text-cyan-300 group-hover:text-cyan-200">
        Open service
        <ExternalLink className="ml-1 h-3.5 w-3.5" />
      </div>
    </a>
  );
}
