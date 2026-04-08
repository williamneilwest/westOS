import { createElement, lazy, Suspense } from 'react';
import { CheckSquare } from 'lucide-react';
import type { LifeOsModule } from '../../routes/moduleTypes';

const TasksPage = lazy(() => import('./pages/TasksPage').then((module) => ({ default: module.TasksPage })));

export const tasksModule: LifeOsModule = {
  id: 'tasks',
  nav: {
    id: 'tasks',
    label: 'Tasks',
    path: '/tasks',
    icon: CheckSquare,
  },
  routes: [
    {
      path: 'tasks',
      element: createElement(
        Suspense,
        { fallback: createElement('div', { className: 'text-sm text-slate-400' }, 'Loading tasks...') },
        createElement(TasksPage),
      ),
    },
  ],
};

export { TasksPage } from './pages/TasksPage';
