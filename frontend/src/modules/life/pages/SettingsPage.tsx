import { Card, SectionHeader } from '../components/ui';
import { useAppStore } from '../store/useAppStore';

export function SettingsPage() {
  const hideMobileTabs = useAppStore((state) => state.preferences.hideMobileTabs);
  const toggleHideMobileTabs = useAppStore((state) => state.toggleHideMobileTabs);
  const sidebarCollapsed = useAppStore((state) => state.preferences.sidebarCollapsed);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Workspace" title="Settings" description="Centralized settings page for LifeOS." />
      <section className="grid gap-4 md:grid-cols-2">
        <Card title="Layout" description="Navigation and layout behavior.">
          <div className="space-y-3">
            <label className="flex min-h-[44px] items-center justify-between rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-200">
              Hide bottom tabs on mobile
              <input type="checkbox" checked={hideMobileTabs} onChange={toggleHideMobileTabs} />
            </label>
            <label className="flex min-h-[44px] items-center justify-between rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-200">
              Collapse desktop sidebar
              <input type="checkbox" checked={sidebarCollapsed} onChange={toggleSidebar} />
            </label>
          </div>
        </Card>
      </section>
    </div>
  );
}
