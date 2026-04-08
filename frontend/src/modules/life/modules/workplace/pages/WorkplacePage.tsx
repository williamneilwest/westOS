import { Bell, CalendarDays, ListChecks, RefreshCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, ErrorBoundary } from '../../../components/ui';
import { QuickLinksPanel } from '../components/QuickLinksPanel';
import { TicketDashboard } from '../components/tickets/TicketDashboard';
import { workplaceService } from '../services/workplaceService';
import type { CreateQuickLinkInput } from '../types';

function formatDateLabel(value: Date): string {
  return value.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function WorkplacePage() {
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [pinnedLinks, setPinnedLinks] = useState<string[]>([]);

  useEffect(() => {
    const onRefreshRequested = () => setRefreshSignal((value) => value + 1);
    window.addEventListener('workspace:refresh-requested', onRefreshRequested);
    return () => window.removeEventListener('workspace:refresh-requested', onRefreshRequested);
  }, []);

  const quickLinksQuery = useQuery({
    queryKey: ['quick-links'],
    queryFn: workplaceService.getQuickLinks,
  });

  const createQuickLinkMutation = useMutation({
    mutationFn: (payload: CreateQuickLinkInput) => workplaceService.createQuickLink(payload),
    onSuccess: () => {
      void quickLinksQuery.refetch();
    },
  });

  const deleteQuickLinkMutation = useMutation({
    mutationFn: (id: number) => workplaceService.deleteQuickLink(id),
    onSuccess: () => {
      void quickLinksQuery.refetch();
    },
  });

  const links = quickLinksQuery.data?.links || [];
  const sortedLinks = useMemo(
    () =>
      [...links].sort(
        (a, b) => Number(!pinnedLinks.includes(String(a.id))) - Number(!pinnedLinks.includes(String(b.id))),
      ),
    [links, pinnedLinks],
  );

  return (
    <div className="flex min-h-[calc(var(--vh,1vh)*100)] w-full max-w-full flex-col gap-2 overflow-x-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 pb-[env(safe-area-inset-bottom)]">
      <header className="rounded-2xl border border-white/10 bg-zinc-900/60 px-3 py-2 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-sm font-semibold text-white sm:text-base">Workplace</h1>
            <p className="text-xs text-slate-400">Shared ticket operations dashboard</p>
          </div>
          <div className="inline-flex items-center gap-1 rounded-xl border border-teal-300/20 bg-teal-500/10 px-2 py-1 text-[11px] text-teal-100">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDateLabel(new Date())}
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-20 -mx-0 rounded-2xl border border-white/10 bg-zinc-900/55 px-2 py-2 backdrop-blur-xl">
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1 rounded-full border border-white/15 bg-zinc-950/75 px-3 text-xs text-slate-100"
            onClick={() => setRefreshSignal((value) => value + 1)}
          >
            <RefreshCcw className="h-3.5 w-3.5 text-teal-300" />
            Refresh
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1 rounded-full border border-white/15 bg-zinc-950/75 px-3 text-xs text-slate-100"
            onClick={() => window.dispatchEvent(new CustomEvent('workplace:analyze-tickets'))}
          >
            <ListChecks className="h-3.5 w-3.5 text-cyan-300" />
            Prioritize
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-2 backdrop-blur-xl">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sortedLinks.slice(0, 12).map((link) => (
            <motion.button
              key={link.id}
              whileTap={{ scale: 0.97 }}
              className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl border border-white/10 bg-zinc-950/70 px-3 text-xs text-slate-200 transition-colors hover:border-teal-300/40"
              onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
            >
              <span className="h-2 w-2 rounded-full bg-teal-300/80" />
              <span className="max-w-24 truncate">{link.title}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-2 md:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-h-0 overflow-hidden">
          <ErrorBoundary>
            <TicketDashboard refreshSignal={refreshSignal} />
          </ErrorBoundary>
        </div>

        <aside className="hidden min-h-0 overflow-y-auto md:flex md:flex-col md:gap-2">
          <ErrorBoundary>
            <QuickLinksPanel
              links={sortedLinks}
              pinnedLinkIds={pinnedLinks}
              addError={createQuickLinkMutation.error instanceof Error ? createQuickLinkMutation.error.message : null}
              addSubmitting={createQuickLinkMutation.isPending}
              onTogglePin={(id) => {
                setPinnedLinks((previous) =>
                  previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id],
                );
              }}
              onAddLink={async (payload) => {
                await createQuickLinkMutation.mutateAsync(payload);
              }}
              onDeleteLink={(id) => deleteQuickLinkMutation.mutate(id)}
            />
          </ErrorBoundary>

          <Card variant="compact" title="Notifications" description="System status">
            <div className="space-y-2 text-xs text-slate-300">
              <p className="inline-flex items-center gap-1">
                <Bell className="h-3.5 w-3.5 text-cyan-300" />
                Quick links: {links.length}
              </p>
              {quickLinksQuery.isLoading ? <p className="text-slate-500">Loading quick links...</p> : null}
              {quickLinksQuery.error instanceof Error ? (
                <p className="text-rose-300">{quickLinksQuery.error.message}</p>
              ) : null}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
