import { createElement, lazy, Suspense } from 'react';
import { Briefcase } from 'lucide-react';
import type { LifeOsModule } from '../../routes/moduleTypes';

const WorkplacePage = lazy(() => import('./pages/WorkplacePage').then((module) => ({ default: module.WorkplacePage })));

export const workplaceModule: LifeOsModule = {
  id: 'workplace',
  nav: {
    id: 'workplace',
    label: 'Workplace',
    path: '/workplace',
    icon: Briefcase,
  },
  routes: [
    {
      path: 'workplace',
      element: createElement(
        Suspense,
        { fallback: createElement('div', { className: 'text-sm text-slate-400' }, 'Loading Workplace Hub...') },
        createElement(WorkplacePage),
      ),
    },
  ],
};

export { WorkplacePage } from './pages/WorkplacePage';
