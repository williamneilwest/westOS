import { Bell, ChevronDown, Menu, MoonStar, Plus, Search, SunMedium, UserCircle2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { quickActions, userProfile } from '../../config/appConfig';
import { getModuleNavItems } from '../../routes/moduleRegistry';
import { useAppStore } from '../../store/useAppStore';
import { Badge, Button, Input } from '../ui';

export function TopBar() {
  const navigate = useNavigate();
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const theme = useAppStore((state) => state.preferences.theme);
  const activeModules = useAppStore((state) => state.activeModules);
  const navItems = getModuleNavItems(activeModules);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onHotkey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }

      if (event.key === 'Escape') {
        setQuery('');
      }
    }

    window.addEventListener('keydown', onHotkey);
    return () => window.removeEventListener('keydown', onHotkey);
  }, []);

  const results = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) {
      return [];
    }

    const modules = navItems
      .filter((item) => item.label.toLowerCase().includes(clean))
      .map((item) => ({ id: item.id, label: item.label, type: 'module' as const, route: item.path }));

    const actions = quickActions
      .filter((item) => item.label.toLowerCase().includes(clean) || item.description.toLowerCase().includes(clean))
      .map((item) => ({ id: item.id, label: item.label, type: 'action' as const, route: item.route }));

    return [...modules, ...actions].slice(0, 6);
  }, [query]);

  return (
    <header className="glass-panel mb-6 flex flex-col gap-4 rounded-3xl p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative flex items-center gap-3">
        <Button variant="ghost" className="h-11 w-11 rounded-2xl p-0" onClick={toggleSidebar}>
          <Menu className="h-5 w-5" />
        </Button>

        <div className="w-full min-w-[260px] max-w-xl">
          <Input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search modules, commands, and actions..."
            helper="Shortcut: Ctrl/Cmd + K"
            leadingIcon={<Search className="h-4 w-4" />}
          />
        </div>

        {results.length > 0 ? (
          <div className="absolute left-14 top-[68px] z-40 w-[min(520px,85vw)] rounded-2xl border border-white/10 bg-slate-900/95 p-2 shadow-glow backdrop-blur-xl">
            {results.map((result) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => {
                  navigate(result.route);
                  setQuery('');
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-white/10"
              >
                <span className="text-sm text-white">{result.label}</span>
                <Badge variant={result.type === 'module' ? 'info' : 'neutral'}>{result.type}</Badge>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => navigate('/tasks')}>Focus Tasks</Button>
        <Button variant="outline" onClick={() => navigate('/planning')}>Review Goals</Button>
        <Button variant="ghost" className="h-10 w-10 rounded-2xl p-0" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? <SunMedium className="h-5 w-5" /> : <MoonStar className="h-5 w-5" />}
        </Button>
        <Button variant="ghost" className="h-10 w-10 rounded-2xl p-0" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="primary" className="gap-2" onClick={() => navigate('/tasks')}>
          <Plus className="h-4 w-4" />
          Quick Add
        </Button>
        <div className="ml-1 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
          <UserCircle2 className="h-5 w-5 text-cyan-300" />
          <div className="leading-tight">
            <p className="text-sm font-medium text-white">{userProfile.name}</p>
            <p className="text-xs text-slate-400">{userProfile.workspace}</p>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </div>
      </div>
    </header>
  );
}
