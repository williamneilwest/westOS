import { Copy, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui';
import type { ScriptRecord } from '../types';

interface ScriptCardProps {
  script: ScriptRecord;
  onCopy: (script: ScriptRecord) => void;
  onEdit: (script: ScriptRecord) => void;
  onDelete: (script: ScriptRecord) => void;
}

export function ScriptCard({ script, onCopy, onEdit, onDelete }: ScriptCardProps) {
  return (
    <article className="group rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:shadow-cyan-500/10">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{script.name}</p>
          <p className="mt-1 text-xs text-slate-400">{script.description || 'No description provided.'}</p>
        </div>
        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
          <button
            type="button"
            className="rounded-lg border border-white/10 bg-zinc-900/70 p-1.5 text-slate-300 hover:text-cyan-200"
            onClick={() => onEdit(script)}
            aria-label={`Edit ${script.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/10 bg-zinc-900/70 p-1.5 text-slate-300 hover:text-rose-200"
            onClick={() => onDelete(script)}
            aria-label={`Delete ${script.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <p className="mb-2 text-[11px] text-slate-500">Copy and paste this into PowerShell to run</p>
      <pre className="max-h-64 overflow-auto rounded-xl border border-white/10 bg-zinc-950/70 p-3 font-mono text-xs text-slate-200 whitespace-pre-wrap">
        {script.script}
      </pre>

      <div className="mt-3">
        <Button
          variant="outline"
          onClick={() => onCopy(script)}
          className="w-full"
        >
          <Copy className="mr-1.5 h-3.5 w-3.5" />
          Copy Script
        </Button>
      </div>
    </article>
  );
}
