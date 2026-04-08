import { Activity } from 'lucide-react';
import { Card } from '../../../components/ui';
import { FlowCard } from './FlowCard';
import type { FlowRunSummary } from '../types';

interface FlowActivityPanelProps {
  flows: FlowRunSummary[];
  loading: boolean;
  error: string | null;
  activeSourceFileName: string | null;
  settingSourceFileName: string | null;
  onOpenFlow: (flowId: string) => void;
  onSetSource: (fileName: string) => void;
  onRefresh: () => void;
}

function outputFileName(flow: FlowRunSummary): string | null {
  if (!flow.processed_file_path) {
    return null;
  }
  const parts = flow.processed_file_path.split('/');
  return parts[parts.length - 1] || null;
}

export function FlowActivityPanel({
  flows,
  loading,
  error,
  activeSourceFileName,
  settingSourceFileName,
  onOpenFlow,
  onSetSource,
  onRefresh,
}: FlowActivityPanelProps) {
  return (
    <Card title="Flow Activity" description="Recent Power Automate CSV ingestion runs and processing outcomes.">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
          <Activity className="h-3.5 w-3.5 text-cyan-300" />
          Latest 10 runs
        </span>
        <button onClick={onRefresh} className="text-xs text-cyan-300 hover:text-cyan-200">Refresh</button>
      </div>

      {loading ? <p className="text-sm text-slate-400">Loading flow runs...</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {!loading && !error && flows.length === 0 ? <p className="text-sm text-slate-500">No flows yet.</p> : null}

      <div className="max-h-80 space-y-2 overflow-auto pr-1">
        {flows.map((flow) => (
          <FlowCard
            key={flow.id}
            flow={flow}
            onOpen={onOpenFlow}
            isActiveSource={activeSourceFileName === outputFileName(flow)}
            settingSource={settingSourceFileName === outputFileName(flow)}
            onSetSource={onSetSource}
          />
        ))}
      </div>
    </Card>
  );
}
