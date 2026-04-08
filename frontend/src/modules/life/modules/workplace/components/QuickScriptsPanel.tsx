import { Copy, Pin, Play } from 'lucide-react';
import { Button, Card } from '../../../components/ui';
import type { WorkplaceScript } from '../types';

interface QuickScriptsPanelProps {
  scripts: WorkplaceScript[];
  runningScriptId: string | null;
  pinnedScriptIds: string[];
  onRun: (scriptId: string) => void;
  onCopy: (scriptLabel: string, scriptText: string) => void;
  onTogglePin: (scriptId: string) => void;
}

export function QuickScriptsPanel({ scripts, runningScriptId, pinnedScriptIds, onRun, onCopy, onTogglePin }: QuickScriptsPanelProps) {
  return (
    <Card title="Quick Scripts" description="One-click scripts for common IT support actions.">
      <div className="grid gap-3 md:grid-cols-2">
        {scripts.map((script) => {
          const pinned = pinnedScriptIds.includes(script.id);
          return (
            <div key={script.id} className="rounded-xl border border-white/10 bg-zinc-950/60 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{script.name}</p>
                  <p className="mt-1 text-xs text-slate-400">{script.description}</p>
                </div>
                <button
                  onClick={() => onTogglePin(script.id)}
                  className={`rounded-lg border p-1.5 transition ${pinned ? 'border-amber-300/40 bg-amber-400/20 text-amber-100' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
                  aria-label="Toggle pin"
                >
                  <Pin className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <Button onClick={() => onRun(script.id)} disabled={runningScriptId === script.id} className="flex-1">
                  <Play className="mr-1.5 h-3.5 w-3.5" />
                  {runningScriptId === script.id ? 'Running...' : 'Run'}
                </Button>
                <Button variant="outline" onClick={() => onCopy(script.name, script.copyCommand)}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
