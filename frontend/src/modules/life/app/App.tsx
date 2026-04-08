import { RouterProvider } from 'react-router-dom';
import { AuthGate } from './AuthGate';
import { useThemeSetup } from '../hooks/useThemeSetup';
import { appRouter } from '../routes/router';

export default function LifeOSApp() {
  useThemeSetup();

  return (
    <AuthGate>
      <RouterProvider router={appRouter} />
    </AuthGate>
  );
}
