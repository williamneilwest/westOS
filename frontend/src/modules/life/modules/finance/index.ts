import { createElement, lazy, Suspense } from 'react';
import { Landmark } from 'lucide-react';
import type { LifeOsModule } from '../../routes/moduleTypes';

const TransactionsPage = lazy(() => import('./pages/TransactionsPage').then((module) => ({ default: module.TransactionsPage })));
const AccountsPage = lazy(() => import('./pages/AccountsPage').then((module) => ({ default: module.AccountsPage })));

export const financeModule: LifeOsModule = {
  id: 'finance',
  nav: {
    id: 'finance',
    label: 'Finance',
    path: '/finance',
    icon: Landmark,
  },
  routes: [
    {
      path: 'finance',
      element: createElement(
        Suspense,
        { fallback: createElement('div', { className: 'text-sm text-slate-400' }, 'Loading finance...') },
        createElement(TransactionsPage),
      ),
    },
    {
      path: 'finance/accounts',
      element: createElement(
        Suspense,
        { fallback: createElement('div', { className: 'text-sm text-slate-400' }, 'Loading account details...') },
        createElement(AccountsPage),
      ),
    },
  ],
};

export { TransactionsPage } from './pages/TransactionsPage';
export { AccountsPage } from './pages/AccountsPage';
