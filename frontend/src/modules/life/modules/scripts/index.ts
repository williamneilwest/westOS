import { createElement, lazy, Suspense } from 'react';
import { FileCode2 } from 'lucide-react';
import type { LifeOsModule } from '../../routes/moduleTypes';

const ScriptsPage = lazy(() => import('./pages/ScriptsPage').then((module) => ({ default: module.ScriptsPage })));

export const scriptsModule: LifeOsModule = {
  id: 'scripts',
  nav: {
    id: 'scripts',
    label: 'Scripts',
    path: '/scripts',
    icon: FileCode2,
  },
  routes: [
    {
      path: 'scripts',
      element: createElement(
        Suspense,
        { fallback: createElement('div', { className: 'text-sm text-slate-400' }, 'Loading scripts...') },
        createElement(ScriptsPage),
      ),
    },
  ],
};

export { ScriptsPage } from './pages/ScriptsPage';
