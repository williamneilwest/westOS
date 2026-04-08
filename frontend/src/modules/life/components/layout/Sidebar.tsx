import { ChevronsLeft, ChevronsRight, LayoutGrid } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { getModuleNavItems } from '../../routes/moduleRegistry';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const collapsed = useAppStore((state) => state.preferences.sidebarCollapsed);
  const activeModules = useAppStore((state) => state.activeModules);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const navItems = getModuleNavItems(activeModules);

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[1px] lg:hidden"
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-[60] border-r border-white/10 bg-black/80 backdrop-blur-md transition-transform duration-300',
          'w-[84vw] max-w-[320px] lg:flex lg:flex-col',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
          collapsed ? 'lg:w-24' : 'lg:w-72',
        )}
      >
        <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-emerald-500/0 via-emerald-500/30 to-cyan-500/0" />

        <div className="flex items-start justify-between border-b border-white/10 px-4 py-4">
          {!collapsed ? (
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/70 px-2.5 py-1 text-xs uppercase tracking-wide text-zinc-400">
                <LayoutGrid className="h-3.5 w-3.5 text-emerald-300" />
                LifeOS
              </div>
              <h2 className="mt-3 text-lg font-semibold text-white">Command Center</h2>
              <p className="mt-1 text-sm text-zinc-400">Run your day from one place</p>
            </div>
          ) : (
            <div className="mx-auto rounded-xl border border-white/10 bg-zinc-900/70 p-2 text-emerald-300">
              <LayoutGrid className="h-4 w-4" />
            </div>
          )}

          <button
            type="button"
            onClick={toggleSidebar}
            className="hidden h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-zinc-900/60 text-zinc-300 transition-all duration-200 hover:border-emerald-400/30 hover:text-white lg:inline-flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'group flex min-h-11 items-center rounded-xl border border-transparent text-sm text-zinc-400 transition-all duration-200',
                    collapsed ? 'justify-center px-2 py-2.5 lg:min-h-10' : 'gap-3 px-3 py-3',
                    'hover:border-white/10 hover:bg-zinc-900/60 hover:text-zinc-200',
                    'hover:shadow-[0_0_20px_rgba(16,185,129,0.10)]',
                    isActive && 'border-emerald-400/30 bg-zinc-900/80 text-white shadow-[0_0_20px_rgba(16,185,129,0.15)]',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {!collapsed ? <span>{item.label}</span> : null}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
