import { ServiceCard } from './ServiceCard';
import type { ServiceCategory as ServiceCategoryType, ServiceStatus } from '../types';

interface ServiceCategoryProps {
  category: ServiceCategoryType;
  statusByHref?: Record<string, ServiceStatus>;
}

export function ServiceCategory({ category, statusByHref = {} }: ServiceCategoryProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{category.category}</h3>
        <span className="text-xs text-slate-500">{category.items.length} services</span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {category.items.map((service) => (
          <ServiceCard key={`${category.category}-${service.name}`} service={service} liveStatus={statusByHref[service.href]} />
        ))}
      </div>
    </section>
  );
}
