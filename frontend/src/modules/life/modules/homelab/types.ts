export type HomelabHealth = 'healthy' | 'degraded' | 'offline';

export interface HomelabServiceItem {
  id: string;
  name: string;
  endpoint: string;
  status: HomelabHealth;
  uptimeDays: number;
}

export interface HomelabOverview {
  totalServices: number;
  healthyServices: number;
  degradedServices: number;
  offlineServices: number;
}
