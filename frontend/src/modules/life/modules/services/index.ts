import { createElement, lazy, Suspense } from 'react';
import { Server } from 'lucide-react';
import type { LifeOsModule } from '../../routes/moduleTypes';

const ServicesPage = lazy(() => import('./pages/ServicesPage').then((module) => ({ default: module.ServicesPage })));

export const servicesModule: LifeOsModule = {
  id: 'services',
  nav: {
    id: 'services',
    label: 'Services',
    path: '/services',
    icon: Server,
  },
  routes: [
    {
      path: 'services',
      element: createElement(
        Suspense,
        { fallback: createElement('div', { className: 'text-sm text-slate-400' }, 'Loading Services Dashboard...') },
        createElement(ServicesPage),
      ),
    },
  ],
};

export { ServicesPage } from './pages/ServicesPage';
