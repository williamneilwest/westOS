import { createElement, lazy, Suspense } from 'react';
import { FolderKanban } from 'lucide-react';
import type { LifeOsModule } from '../../routes/moduleTypes';

const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then((module) => ({ default: module.ProjectsPage })));

export const projectsModule: LifeOsModule = {
  id: 'projects',
  nav: {
    id: 'projects',
    label: 'Projects',
    path: '/projects',
    icon: FolderKanban,
  },
  routes: [
    {
      path: 'projects',
      element: createElement(
        Suspense,
        { fallback: createElement('div', { className: 'text-sm text-slate-400' }, 'Loading projects...') },
        createElement(ProjectsPage),
      ),
    },
  ],
};

export { ProjectsPage } from './pages/ProjectsPage';
