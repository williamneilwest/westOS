import { AlertTriangle, ArrowRight, PiggyBank, Target, TriangleAlert } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { SectionHeader } from '../../../components/ui/SectionHeader';

export interface Recommendation {
  id: string;
  title: string;
  detail: string;
  severity: 'high' | 'medium' | 'low';
  actionLabel: string;
  onAction: () => void;
}

interface RecommendationsPanelProps {
  items: Recommendation[];
}

const severityStyles = {
  high: 'text-rose-300 border-rose-400/30 bg-rose-500/10',
  medium: 'text-amber-300 border-amber-400/30 bg-amber-500/10',
  low: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10',
} as const;

const severityIcon = {
  high: AlertTriangle,
  medium: TriangleAlert,
  low: Target,
} as const;

export function RecommendationsPanel({ items }: RecommendationsPanelProps) {
  return (
    <section>
      <SectionHeader title="Today's Recommendations" description="Intelligent suggestions based on current signals." className="mb-3" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 md:gap-6">
        {items.map((item) => {
          const Icon = severityIcon[item.severity];
          return (
            <Card key={item.id} variant="compact">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/70 px-2 py-1">
                    <PiggyBank className="h-3.5 w-3.5 text-cyan-300" />
                    <span className="text-xs uppercase tracking-wide text-zinc-400">Recommendation</span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-white">{item.title}</h3>
                  <p className="mt-1 text-sm text-zinc-400">{item.detail}</p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs uppercase tracking-wide ${severityStyles[item.severity]}`}>
                  <Icon className="h-3.5 w-3.5" />
                  {item.severity}
                </span>
              </div>
              <Button variant="outline" className="mt-4 w-full" onClick={item.onAction}>
                {item.actionLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
