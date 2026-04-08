import { createElement, lazy, Suspense } from 'react';
import { Wrench } from 'lucide-react';
import type { LifeOsModule } from '../../routes/moduleTypes';

const ToolsPage = lazy(() => import('./pages/ToolsPage').then((module) => ({ default: module.ToolsPage })));

export const toolsModule: LifeOsModule = {
  id: 'tools',
  nav: {
    id: 'tools',
    label: 'Tools',
    path: '/tools',
    icon: Wrench,
  },
  routes: [
    {
      path: 'tools',
      element: createElement(
        Suspense,
        { fallback: createElement('div', { className: 'text-sm text-slate-400' }, 'Loading tools...') },
        createElement(ToolsPage),
      ),
    },
  ],
};

export { ToolsPage } from './pages/ToolsPage';
