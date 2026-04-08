import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Link2,
  Pencil,
  Pin,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import { Button, Card } from '../../../components/ui';
import { QuickLinkModal } from './QuickLinkModal';
import { quickLinkCategories, type QuickLink, useQuickLinksStore } from '../data/quickLinks';

type QuickLinksProps = {
  onPinnedChange?: (ids: string[]) => void;
};

function iconFor(name?: string) {
  const key = String(name || '').toLowerCase();
  if (key.includes('ticket')) return <Link2 className="h-4 w-4" />;
  if (key.includes('report')) return <Search className="h-4 w-4" />;
  if (key.includes('power')) return <Star className="h-4 w-4" />;
  return <Link2 className="h-4 w-4" />;
}

function matchesSearch(link: QuickLink, searchTerm: string) {
  if (!searchTerm) return true;
  const haystack = [link.name, link.url, link.category, link.description || ''].join(' ').toLowerCase();
  return haystack.includes(searchTerm);
}

export function QuickLinks({ onPinnedChange }: QuickLinksProps) {
  const links = useQuickLinksStore((state) => state.links);
  const favorites = useQuickLinksStore((state) => state.favorites);
  const recent = useQuickLinksStore((state) => state.recent);
  const addLink = useQuickLinksStore((state) => state.addLink);
  const updateLink = useQuickLinksStore((state) => state.updateLink);
  const deleteLink = useQuickLinksStore((state) => state.deleteLink);
  const toggleFavorite = useQuickLinksStore((state) => state.toggleFavorite);
  const markUsed = useQuickLinksStore((state) => state.markUsed);

  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<QuickLink | null>(null);

  useEffect(() => {
    onPinnedChange?.(favorites);
  }, [favorites, onPinnedChange]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (typing) return;
      if (event.key === '/') {
        event.preventDefault();
        document.getElementById('quick-links-search')?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const searchTerm = search.trim().toLowerCase();
  const ordered = useMemo(() => {
    const favoriteSet = new Set(favorites);
    return [...links].sort((a, b) => Number(favoriteSet.has(b.id)) - Number(favoriteSet.has(a.id)));
  }, [links, favorites]);

  const recentlyUsed = useMemo(() => {
    const ids = new Set(recent);
    return recent.map((id) => ordered.find((link) => link.id === id)).filter((link): link is QuickLink => Boolean(link && ids.has(link.id)));
  }, [ordered, recent]);

  const grouped = useMemo(() => {
    const map = new Map<string, QuickLink[]>();
    for (const category of quickLinkCategories) map.set(category, []);
    for (const link of ordered) {
      if (!matchesSearch(link, searchTerm)) continue;
      if (!map.has(link.category)) map.set(link.category, []);
      map.get(link.category)?.push(link);
    }
    return Array.from(map.entries()).filter(([, list]) => list.length > 0);
  }, [ordered, searchTerm]);

  const renderLinkCard = (link: QuickLink) => {
    const pinned = favorites.includes(link.id);
    return (
      <div
        key={link.id}
        className="group relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.03] p-3 shadow-sm backdrop-blur hover:-translate-y-0.5 hover:border-cyan-300/40 hover:shadow-cyan-500/10 transition"
      >
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-start gap-2 text-left"
            title={link.description || undefined}
            onClick={() => {
              markUsed(link.id);
              window.open(link.url, '_blank', 'noopener,noreferrer');
            }}
          >
            <span className="mt-0.5 text-cyan-200">{iconFor(link.icon)}</span>
            <span className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{link.name}</p>
              <p className="truncate text-xs text-slate-400">{link.url.replace(/^https?:\/\//, '')}</p>
            </span>
          </button>

          <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
            <button
              type="button"
              className={`rounded-lg p-1.5 ${pinned ? 'bg-amber-500/20 text-amber-200' : 'bg-zinc-800/70 text-slate-300 hover:text-amber-200'}`}
              onClick={() => toggleFavorite(link.id)}
              aria-label={`Toggle favorite for ${link.name}`}
              title={pinned ? 'Unpin' : 'Pin to top'}
            >
              <Pin className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="rounded-lg bg-zinc-800/70 p-1.5 text-slate-300 hover:text-cyan-200"
              onClick={() => {
                setEditingLink(link);
                setModalOpen(true);
              }}
              aria-label={`Edit ${link.name}`}
              title="Edit link"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="rounded-lg bg-zinc-800/70 p-1.5 text-slate-300 hover:text-rose-200"
              onClick={() => deleteLink(link.id)}
              aria-label={`Delete ${link.name}`}
              title="Delete link"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {link.description ? <p className="mt-2 text-xs text-slate-400 line-clamp-2">{link.description}</p> : null}
        <div className="mt-2 flex items-center justify-between">
          <span className="rounded-md border border-white/10 bg-zinc-900/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
            {link.category}
          </span>
          <ExternalLink className="h-3.5 w-3.5 text-slate-500 group-hover:text-cyan-200" />
        </div>
      </div>
    );
  };

  return (
    <>
      <Card title="Quick Links" description="Operational shortcuts with categories, favorites, and recent activity.">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
            <input
              id="quick-links-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search links (/)"
              className="w-full rounded-xl border border-white/10 bg-zinc-900/70 py-2 pl-8 pr-3 text-sm text-white outline-none transition focus:border-cyan-300/40"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setEditingLink(null);
              setModalOpen(true);
            }}
          >
            Add Link
          </Button>
        </div>

        {recentlyUsed.length > 0 ? (
          <section className="mb-4 rounded-xl border border-white/10 bg-zinc-950/50 p-3">
            <h4 className="mb-2 text-xs uppercase tracking-wide text-slate-400">Recently Used</h4>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {recentlyUsed.slice(0, 6).map((link) => renderLinkCard(link))}
            </div>
          </section>
        ) : null}

        <div className="space-y-3">
          {grouped.map(([category, items]) => {
            const isCollapsed = Boolean(collapsed[category]);
            return (
              <section key={category} className="rounded-xl border border-white/10 bg-zinc-950/50">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left"
                  onClick={() => setCollapsed((prev) => ({ ...prev, [category]: !prev[category] }))}
                >
                  <span className="text-sm font-semibold text-white">{category}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                    {items.length}
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </span>
                </button>
                {!isCollapsed ? <div className="grid gap-3 px-3 pb-3 sm:grid-cols-2 xl:grid-cols-3">{items.map((link) => renderLinkCard(link))}</div> : null}
              </section>
            );
          })}
          {grouped.length === 0 ? <p className="rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-5 text-sm text-slate-500">No links match your search.</p> : null}
        </div>
      </Card>

      <QuickLinkModal
        open={modalOpen}
        mode={editingLink ? 'edit' : 'add'}
        initial={editingLink}
        onClose={() => {
          setModalOpen(false);
          setEditingLink(null);
        }}
        onSubmit={(payload) => {
          if (editingLink) {
            updateLink(editingLink.id, payload);
          } else {
            addLink(payload);
          }
          setModalOpen(false);
          setEditingLink(null);
        }}
      />
    </>
  );
}
