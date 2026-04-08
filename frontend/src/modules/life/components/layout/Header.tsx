import { CloudCheck, Menu, MoonStar, PlayCircle, Settings2, SunMedium } from 'lucide-react';
import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';

const PAGE_TITLES: Record<string, string> = {
  '/': 'LifeOS Dashboard',
  '/projects': 'Automation Workflows',
  '/planning': 'Project Planning',
  '/tasks': 'Task Queue',
  '/tools': 'Tools Library',
  '/homelab': 'Homelab Control',
  '/workplace': 'Workplace Hub',
  '/database': 'Database Manager',
  '/settings': 'Workspace Settings',
};

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useAppStore((state) => state.preferences.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  const action = useMemo(() => {
    if (location.pathname.startsWith('/tools')) {
      return {
        label: 'Add Tool',
        onClick: () => window.dispatchEvent(new CustomEvent('tools:add-requested')),
      };
    }

    if (location.pathname.startsWith('/workplace') || location.pathname.startsWith('/projects')) {
      return {
        label: 'Refresh / Analyze',
        onClick: () => {
          window.dispatchEvent(new CustomEvent('workspace:refresh-requested'));
          window.dispatchEvent(new CustomEvent('workplace:analyze-tickets'));
          if (!location.pathname.startsWith('/workplace')) navigate('/workplace');
        },
      };
    }

    if (location.pathname.startsWith('/homelab')) {
      return {
        label: 'Check Status',
        onClick: () => window.dispatchEvent(new CustomEvent('homelab:check-status-requested')),
      };
    }

    return {
      label: 'Run Daily Flow',
      onClick: () => navigate('/projects'),
    };
  }, [location.pathname, navigate]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-black/30 px-3 backdrop-blur-md transition-all duration-200 sm:px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-zinc-900/60 text-zinc-300 transition-all duration-200 hover:border-emerald-400/30 hover:text-white lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-xs uppercase tracking-wide text-zinc-400">{today}</p>
          <h1 className="truncate text-base font-semibold text-white sm:text-lg lg:text-xl">{PAGE_TITLES[location.pathname] ?? 'LifeOS'}</h1>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <span className="hidden rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs uppercase tracking-wide text-emerald-300 md:inline-flex">
          <CloudCheck className="mr-1 h-3.5 w-3.5" />
          Systems Healthy
        </span>

        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex h-10 min-w-fit items-center justify-center whitespace-nowrap rounded-xl border border-white/10 bg-zinc-900/60 px-2.5 text-xs font-medium leading-none text-zinc-300 transition-all duration-200 hover:border-emerald-400/30 hover:text-white sm:px-3 sm:text-sm"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="inline-flex h-10 min-w-fit items-center justify-center whitespace-nowrap rounded-xl border border-white/10 bg-zinc-900/60 px-2.5 text-xs font-medium leading-none text-zinc-300 transition-all duration-200 hover:border-emerald-400/30 hover:text-white sm:px-3 sm:text-sm"
          aria-label="Open settings"
        >
          <Settings2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={action.onClick}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 text-sm font-medium text-black shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all duration-200 hover:brightness-110 sm:px-4"
        >
          <PlayCircle className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{action.label}</span>
        </button>

        {user ? (
          <button
            type="button"
            onClick={() => {
              void authService.logout().finally(() => {
                setUser(null);
                void queryClient.invalidateQueries({ queryKey: ['auth-me'] });
              });
            }}
            className="inline-flex h-10 min-w-fit items-center justify-center whitespace-nowrap rounded-xl border border-white/10 bg-zinc-900/60 px-2.5 text-xs font-medium leading-none text-zinc-300 transition-all duration-200 hover:border-emerald-400/30 hover:text-white sm:px-3 sm:text-sm"
          >
            Sign Out
          </button>
        ) : null}
      </div>

    </header>
  );
}
