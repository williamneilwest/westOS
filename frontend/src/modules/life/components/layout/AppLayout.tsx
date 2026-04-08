import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const sidebarCollapsed = useAppStore((state) => state.preferences.sidebarCollapsed);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="h-dvh overflow-hidden bg-zinc-950 text-zinc-200">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={cn('relative flex h-full min-w-0 flex-1 flex-col overflow-hidden transition-all duration-200', sidebarCollapsed ? 'lg:pl-24' : 'lg:pl-72')}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,0.10),transparent_30%),radial-gradient(circle_at_90%_10%,rgba(6,182,212,0.10),transparent_26%)]" />

        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="relative flex-1 overflow-y-auto overflow-x-hidden pb-4">
          <div className="mx-auto w-full max-w-[1600px] p-3 sm:p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
