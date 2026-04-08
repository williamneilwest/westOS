import { createElement } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { SettingsPage } from '../pages/SettingsPage';
import { moduleRoutes } from './moduleRegistry';

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: createElement(AppShell),
    children: [
      ...moduleRoutes,
      {
        path: 'settings',
        element: createElement(SettingsPage),
      },
      {
        path: '*',
        element: createElement(Navigate, { to: '/', replace: true }),
      },
    ],
  },
], {
  basename: '/app',
});
