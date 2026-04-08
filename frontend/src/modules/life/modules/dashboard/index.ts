import { createElement, lazy, Suspense } from 'react';
import { LayoutDashboard } from 'lucide-react';
import type { LifeOsModule } from '../../routes/moduleTypes';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));

export const dashboardModule: LifeOsModule = {
  id: 'dashboard',
  nav: {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
  },
  routes: [
    {
      index: true,
      element: createElement(
        Suspense,
        { fallback: createElement('div', { className: 'text-sm text-slate-400' }, 'Loading dashboard...') },
        createElement(DashboardPage),
      ),
    },
  ],
};

export { DashboardPage } from './pages/DashboardPage';
