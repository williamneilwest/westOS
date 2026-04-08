import type { ComponentType } from 'react';
import { Clock3, MoonStar, PlayCircle, Plus, Sunrise, Sunset } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { SectionHeader } from '../../../components/ui/SectionHeader';

export interface QuickActionItem {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
}

interface QuickActionsProps {
  actions: QuickActionItem[];
  onConfigure: () => void;
}

function getAdaptiveAction(): { label: string; icon: ComponentType<{ className?: string }> } {
  const hour = new Date().getHours();
  if (hour < 12) return { label: 'Run Daily Sync', icon: Sunrise };
  if (hour < 18) return { label: 'Log Progress', icon: Clock3 };
  return { label: 'Review Day', icon: MoonStar };
}

export function QuickActions({ actions, onConfigure }: QuickActionsProps) {
  const adaptiveAction = getAdaptiveAction();
  const AdaptiveIcon = adaptiveAction.icon;

  return (
    <section>
      <SectionHeader
        title="Quick Actions"
        description={`Adaptive prompt: ${adaptiveAction.label}`}
        className="mb-3"
        actions={
          <Button variant="outline" className="w-full sm:w-auto" onClick={onConfigure}>
            Configure
          </Button>
        }
      />
      <div className="-mx-1 overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2 px-1 sm:gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-200 transition-all duration-200 hover:scale-[1.01] hover:border-emerald-400/30 hover:shadow-[0_0_25px_rgba(16,185,129,0.15)]"
              >
                <Icon className="h-4 w-4 text-emerald-300" />
                {action.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={onConfigure}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-300 transition-all duration-200 hover:scale-[1.01] hover:border-emerald-400/30"
          >
            <Plus className="h-4 w-4" />
            Add Action
          </button>
          <button
            type="button"
            onClick={actions[0]?.onClick}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 shadow-[0_0_25px_rgba(16,185,129,0.15)] transition-all duration-200 hover:scale-[1.01]"
          >
            <AdaptiveIcon className="h-4 w-4 text-emerald-300" />
            {adaptiveAction.label}
            <PlayCircle className="h-4 w-4 text-cyan-300" />
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-300"
          >
            <Sunset className="h-4 w-4" />
            Evening Summary
          </button>
        </div>
      </div>
    </section>
  );
}
