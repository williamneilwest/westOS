import { ExternalLink, Pin, Trash2 } from 'lucide-react';
import type { QuickLink } from '../types';

interface QuickLinkCardProps {
  link: QuickLink;
  pinned: boolean;
  onTogglePin: (linkId: string) => void;
  onDelete: (linkId: number) => void;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'invalid-url';
  }
}

export function QuickLinkCard({ link, pinned, onTogglePin, onDelete }: QuickLinkCardProps) {
  const domain = getDomain(link.url);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noreferrer"
      className="group relative rounded-xl border border-white/10 bg-zinc-950/60 p-3 transition hover:border-cyan-300/40 hover:bg-zinc-900/80"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <img
            src={faviconUrl}
            alt=""
            className="h-5 w-5 shrink-0 rounded"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
          <p className="truncate text-sm font-semibold text-white">{link.title}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(event) => {
              event.preventDefault();
              onTogglePin(String(link.id));
            }}
            className={`rounded-lg border p-1 transition ${pinned ? 'border-amber-300/40 bg-amber-400/20 text-amber-100' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
            aria-label={pinned ? 'Unpin link' : 'Pin link'}
          >
            <Pin className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(event) => {
              event.preventDefault();
              onDelete(link.id);
            }}
            className="rounded-lg border border-rose-300/20 bg-rose-500/10 p-1 text-rose-200 transition hover:bg-rose-500/20"
            aria-label="Delete link"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {link.category ? (
        <p className="mt-2 inline-flex rounded-md border border-cyan-300/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-cyan-200">
          {link.category}
        </p>
      ) : null}
      <p className="mt-2 truncate text-xs text-slate-400">{domain}</p>
      <div className="mt-2 flex items-center text-xs text-slate-400 group-hover:text-cyan-200">
        Open
        <ExternalLink className="ml-1 h-3.5 w-3.5" />
      </div>
    </a>
  );
}
