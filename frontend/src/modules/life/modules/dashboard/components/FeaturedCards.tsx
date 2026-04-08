import { ArrowRight, PlayCircle } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { SectionHeader } from '../../../components/ui/SectionHeader';

export interface FeaturedItem {
  id: string;
  title: string;
  description: string;
  progress: number;
  status: 'running' | 'idle' | 'blocked';
  metric: string;
  onOpen: () => void;
}

interface FeaturedCardsProps {
  items: FeaturedItem[];
}

const statusStyles = {
  running: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10',
  idle: 'text-zinc-300 border-white/15 bg-zinc-800/60',
  blocked: 'text-amber-300 border-amber-400/30 bg-amber-500/10',
} as const;

export function FeaturedCards({ items }: FeaturedCardsProps) {
  return (
    <section>
      <SectionHeader title="Featured Controls" description="Pinned control panels for high-impact systems." className="mb-3" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        {items.map((item) => (
          <Card key={item.id} variant="featured">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-white font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-zinc-400">{item.description}</p>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs uppercase tracking-wide ${statusStyles[item.status]}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${item.status === 'running' ? 'animate-pulse bg-emerald-300' : item.status === 'blocked' ? 'bg-amber-300' : 'bg-zinc-300'}`} />
                {item.status}
              </span>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Progress</p>
                <p className="text-sm text-zinc-200">{item.progress}%</p>
              </div>
              <div className="mt-2 h-2 rounded-full bg-zinc-800/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <p className="text-sm font-medium text-white">{item.metric}</p>
              <button
                type="button"
                onClick={item.onOpen}
                className="inline-flex items-center gap-1 text-sm text-zinc-300 transition-all duration-200 hover:text-white"
              >
                Open
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {item.status === 'running' ? (
              <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200">
                <PlayCircle className="h-3.5 w-3.5 animate-pulse" />
                Active automation signal
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </section>
  );
}
