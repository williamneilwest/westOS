import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppShell } from './shell/AppShell';

const routeModules = import.meta.glob('../features/*/routes.jsx');

const features = [
  { path: 'life', modulePath: '../features/life/routes.jsx' },
  { path: 'work', modulePath: '../features/work/routes.jsx' },
  { path: 'ai', modulePath: '../features/ai/routes.jsx' },
  { path: 'console', modulePath: '../features/console/routes.jsx' }
];

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppShell,
    children: [
      {
        index: true,
        element: <Navigate replace to="/life" />
      },
      ...features.map(({ path, modulePath }) => ({
        path,
        lazy: routeModules[modulePath]
      }))
    ]
  }
]);
