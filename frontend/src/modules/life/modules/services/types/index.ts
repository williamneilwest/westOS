export type ServiceStatus = 'online' | 'offline' | 'unknown';

export interface ServiceWidget {
  type: 'homeassistant' | string;
  url: string;
  key?: string;
}

export interface ServiceItem {
  name: string;
  href: string;
  icon: string;
  description: string;
  status?: ServiceStatus;
  target?: '_blank' | '_self';
  widget?: ServiceWidget;
  metadata?: string[];
}

export interface ServiceCategory {
  category: string;
  items: ServiceItem[];
}

export interface ServicesPayload {
  categories: ServiceCategory[];
}

export interface ServiceStatusEntry {
  category: string;
  name: string;
  url: string;
  status: ServiceStatus;
}

export interface ServicesStatusPayload {
  statuses: ServiceStatusEntry[];
}
