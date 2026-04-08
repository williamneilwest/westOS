import { useCallback, useEffect, useMemo, useState } from 'react';
import { homelabService } from '../../../services/homelabService';
import type { HomelabHealth, HomelabOverview, HomelabServiceItem } from '../types';

export function useHomelab() {
  const [services, setServices] = useState<HomelabServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await homelabService.getAll();
      setServices(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load homelab services');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addService = useCallback(async (service: HomelabServiceItem) => {
    const created = await homelabService.create(service);
    setServices((prev) => [created, ...prev]);
  }, []);

  const updateStatus = useCallback(async (id: string, status: HomelabHealth) => {
    const updated = await homelabService.updateStatus(id, status);
    setServices((prev) => prev.map((service) => (service.id === id ? updated : service)));
  }, []);

  const overview = useMemo<HomelabOverview>(
    () => ({
      totalServices: services.length,
      healthyServices: services.filter((service) => service.status === 'healthy').length,
      degradedServices: services.filter((service) => service.status === 'degraded').length,
      offlineServices: services.filter((service) => service.status === 'offline').length,
    }),
    [services],
  );

  return {
    services,
    overview,
    loading,
    error,
    refresh: load,
    addService,
    updateStatus,
  };
}
