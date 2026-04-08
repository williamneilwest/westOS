import { Card } from '../../../components/ui/Card';
import type { ToolsOverview } from '../types';

interface ToolsSummaryCardProps {
  overview: ToolsOverview;
}

export function ToolsSummaryCard({ overview }: ToolsSummaryCardProps) {
  return (
    <Card>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-sm text-slate-400">Quick Links</p>
          <p className="text-2xl font-semibold text-white">{overview.links}</p>
        </div>
        <div>
          <p className="text-sm text-slate-400">Snippets</p>
          <p className="text-2xl font-semibold text-white">{overview.snippets}</p>
        </div>
      </div>
    </Card>
  );
}
