import { createElement, lazy, Suspense } from 'react';
import { Database } from 'lucide-react';
import type { LifeOsModule } from '../../routes/moduleTypes';

const DatabasePage = lazy(() => import('./pages/DatabasePage').then((module) => ({ default: module.DatabasePage })));

export const databaseModule: LifeOsModule = {
  id: 'database',
  nav: {
    id: 'database',
    label: 'Database',
    path: '/database',
    icon: Database,
  },
  routes: [
    {
      path: 'database',
      element: createElement(
        Suspense,
        { fallback: createElement('div', { className: 'text-sm text-slate-400' }, 'Loading database manager...') },
        createElement(DatabasePage),
      ),
    },
  ],
};
