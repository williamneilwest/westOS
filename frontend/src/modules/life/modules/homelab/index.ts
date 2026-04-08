import { createElement, lazy, Suspense } from 'react';
import { Server } from 'lucide-react';
import type { LifeOsModule } from '../../routes/moduleTypes';

const HomelabPage = lazy(() => import('./pages/HomelabPage').then((module) => ({ default: module.HomelabPage })));

export const homelabModule: LifeOsModule = {
  id: 'homelab',
  nav: {
    id: 'homelab',
    label: 'Homelab',
    path: '/homelab',
    icon: Server,
  },
  routes: [
    {
      path: 'homelab',
      element: createElement(
        Suspense,
        { fallback: createElement('div', { className: 'text-sm text-slate-400' }, 'Loading homelab...') },
        createElement(HomelabPage),
      ),
    },
  ],
};

export { HomelabPage } from './pages/HomelabPage';
