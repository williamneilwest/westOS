import { Card } from '../../../components/ui';

interface FavoritesPanelProps {
  pinnedScripts: string[];
  pinnedLinks: string[];
  pinnedTools: string[];
}

export function FavoritesPanel({ pinnedScripts, pinnedLinks, pinnedTools }: FavoritesPanelProps) {
  return (
    <Card title="Favorites / Pinned" description="Pinned items stay on top for faster access.">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-zinc-950/50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Scripts</p>
          <p className="mt-2 text-2xl font-semibold text-white">{pinnedScripts.length}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-950/50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Links</p>
          <p className="mt-2 text-2xl font-semibold text-white">{pinnedLinks.length}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-950/50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Tools</p>
          <p className="mt-2 text-2xl font-semibold text-white">{pinnedTools.length}</p>
        </div>
      </div>
    </Card>
  );
}
