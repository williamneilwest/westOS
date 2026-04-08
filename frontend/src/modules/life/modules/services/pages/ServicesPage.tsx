import { Grid2X2, Server } from 'lucide-react';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Card, SectionHeader } from '../../../components/ui';
import { ServiceCategory } from '../components/ServiceCategory';
import { servicesConfig } from '../config/servicesConfig';
import { servicesService } from '../services/servicesService';
import type { ServiceStatus } from '../types';

export function ServicesPage() {
  const {
    data: statusesPayload,
  } = useQuery({
    queryKey: ['services-status'],
    queryFn: servicesService.getStatuses,
    refetchInterval: 60_000,
    retry: 0,
  });

  const statusByUrl = useMemo<Record<string, ServiceStatus>>(() => {
    const map: Record<string, ServiceStatus> = {};
    for (const entry of statusesPayload?.statuses || []) {
      if (entry?.url) {
        map[entry.url] = entry.status;
      }
    }
    return map;
  }, [statusesPayload]);

  const categories = servicesConfig;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Module"
        title="Services Dashboard"
        description="Centralized view of infrastructure, tools, and systems with live-ready status hooks."
        actions={<Badge variant="info">Command Grid</Badge>}
      />

      <Card className="border-cyan-400/20 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-emerald-500/10 shadow">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
          <Grid2X2 className="h-4 w-4 text-cyan-300" />
          <span>Category-organized services</span>
          <Server className="h-4 w-4 text-emerald-300" />
          <span>Static config now, API-ready structure next</span>
        </div>
      </Card>

      <div className="space-y-6">
        {categories.map((category) => (
          <ServiceCategory key={category.category} category={category} statusByHref={statusByUrl} />
        ))}
      </div>
    </div>
  );
}
