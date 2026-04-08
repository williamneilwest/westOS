import { FileSpreadsheet } from 'lucide-react';
import type { FlowRunSummary } from '../types';

interface FlowCardProps {
  flow: FlowRunSummary;
  onOpen: (flowId: string) => void;
  isActiveSource: boolean;
  settingSource: boolean;
  onSetSource: (fileName: string) => void;
}

function processedFileName(flow: FlowRunSummary): string | null {
  if (!flow.processed_file_path) {
    return null;
  }
  const parts = flow.processed_file_path.split('/');
  return parts[parts.length - 1] || null;
}

export function FlowCard({ flow, onOpen, isActiveSource, settingSource, onSetSource }: FlowCardProps) {
  const isSuccess = flow.status === 'Success';
  const outputFileName = processedFileName(flow);

  return (
    <div className="w-full rounded-xl border border-white/10 bg-zinc-950/60 p-3 text-left transition hover:border-cyan-400/30 hover:bg-zinc-900/70">
      <button onClick={() => onOpen(flow.id)} className="w-full text-left">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-cyan-200" />
            <p className="text-sm font-semibold text-white">{flow.file_name}</p>
          </div>
          <div className="inline-flex items-center gap-2">
            {isActiveSource ? (
              <span className="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] text-cyan-200">
                Active
              </span>
            ) : null}
            <span className={`rounded-full border px-2 py-0.5 text-[11px] ${isSuccess ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-400/30 bg-rose-500/10 text-rose-200'}`}>
              {flow.status}
            </span>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
          <span>Rows: {flow.row_count}</span>
          <span>Cols: {flow.column_count}</span>
          <span>{flow.created_at ? new Date(flow.created_at).toLocaleString() : 'Unknown time'}</span>
        </div>
      </button>

      {isSuccess && outputFileName ? (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => onSetSource(outputFileName)}
            disabled={settingSource}
            className="rounded-lg border border-cyan-300/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-200 transition hover:bg-cyan-500/20 disabled:opacity-50"
          >
            {settingSource ? 'Setting...' : 'Set as Dashboard Source'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
