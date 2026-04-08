import { createElement, lazy, Suspense } from 'react';
import { CalendarRange } from 'lucide-react';
import type { LifeOsModule } from '../../routes/moduleTypes';

const PlanningPage = lazy(() => import('./pages/PlanningPage').then((module) => ({ default: module.PlanningPage })));

export const planningModule: LifeOsModule = {
  id: 'planning',
  nav: {
    id: 'planning',
    label: 'Planning',
    path: '/planning',
    icon: CalendarRange,
  },
  routes: [
    {
      path: 'planning',
      element: createElement(
        Suspense,
        { fallback: createElement('div', { className: 'text-sm text-slate-400' }, 'Loading planning...') },
        createElement(PlanningPage),
      ),
    },
  ],
};

export { PlanningPage } from './pages/PlanningPage';
