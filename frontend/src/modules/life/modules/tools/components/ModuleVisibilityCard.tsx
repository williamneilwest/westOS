import { Card } from '../../../components/ui';
import { getModuleNavItems } from '../../../routes/moduleRegistry';
import { useAppStore, type ModuleId } from '../../../store/useAppStore';

export function ModuleVisibilityCard() {
  const activeModules = useAppStore((state) => state.activeModules);
  const setActiveModules = useAppStore((state) => state.setActiveModules);
  const navItems = getModuleNavItems(['workplace', 'dashboard', 'tools', 'database']);

  function onToggle(moduleId: ModuleId) {
    if (activeModules.includes(moduleId)) {
      const next = activeModules.filter((item) => item !== moduleId);
      if (next.length > 0) {
        setActiveModules(next);
      }
      return;
    }

    setActiveModules([...activeModules, moduleId]);
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-white">Sidebar Modules</h3>
      <p className="mt-1 text-sm text-slate-400">Toggle module visibility for your navigation.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {navItems.map((item) => {
          const active = activeModules.includes(item.id);

          return (
            <button
              key={item.id}
              onClick={() => onToggle(item.id)}
              className={`rounded-xl border px-3 py-2 text-sm transition ${
                active ? 'border-cyan-300/40 bg-cyan-400/20 text-cyan-100' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
