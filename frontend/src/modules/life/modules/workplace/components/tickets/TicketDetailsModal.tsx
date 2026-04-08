import { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, ExternalLink, Link2 } from 'lucide-react';

type TicketRow = Record<string, string | number | boolean>;

interface TicketDetailsModalProps {
  open: boolean;
  tickets: TicketRow[];
  currentIndex: number;
  onChangeIndex: (index: number) => void;
  onClose: () => void;
}

function pick(ticket: TicketRow, keys: string[], fallback = '-'): string {
  for (const key of keys) {
    const value = ticket[key];
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (!text || text.toLowerCase() === 'nan') continue;
    return text;
  }
  return fallback;
}

function serviceNowUrl(sysId: string): string {
  return `https://servicenow.adventhealth.com/task.do?sys_id=${encodeURIComponent(sysId)}`;
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  if (index < 0) return 0;
  if (index > length - 1) return length - 1;
  return index;
}

export function TicketDetailsModal({
  open,
  tickets,
  currentIndex,
  onChangeIndex,
  onClose,
}: TicketDetailsModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [transitionEnabled, setTransitionEnabled] = useState(true);

  const safeIndex = useMemo(() => clampIndex(currentIndex, tickets.length), [currentIndex, tickets.length]);
  const ticket = tickets[safeIndex] || null;

  if (!open || !ticket) return null;

  const ticketNumber = pick(ticket, ['ticket_number', 'number']);
  const sysId = pick(ticket, ['sys_id'], '');
  const title = pick(ticket, ['title', 'short_description'], '(No title)');
  const latestComment = pick(ticket, ['latest_comment', 'comments'], '');
  const latestWorkNote = pick(ticket, ['latest_work_note', 'work_notes'], '');

  const canGoPrev = safeIndex > 0;
  const canGoNext = safeIndex < tickets.length - 1;

  const animateToIndex = (nextIndex: number, direction: 'next' | 'prev') => {
    if (animating) return;
    const width = modalRef.current?.clientWidth || window.innerWidth || 360;
    const outX = direction === 'next' ? -Math.max(220, width * 0.55) : Math.max(220, width * 0.55);
    const inX = direction === 'next' ? Math.max(220, width * 0.55) : -Math.max(220, width * 0.55);

    setAnimating(true);
    setTransitionEnabled(true);
    setDragX(outX);

    window.setTimeout(() => {
      onChangeIndex(nextIndex);
      setTransitionEnabled(false);
      setDragX(inX);

      requestAnimationFrame(() => {
        setTransitionEnabled(true);
        setDragX(0);
        window.setTimeout(() => {
          setAnimating(false);
        }, 170);
      });
    }, 140);
  };

  const onPrev = () => {
    if (!canGoPrev) {
      setTransitionEnabled(true);
      setDragX(24);
      window.setTimeout(() => setDragX(0), 120);
      return;
    }
    animateToIndex(safeIndex - 1, 'prev');
  };

  const onNext = () => {
    if (!canGoNext) {
      setTransitionEnabled(true);
      setDragX(-24);
      window.setTimeout(() => setDragX(0), 120);
      return;
    }
    animateToIndex(safeIndex + 1, 'next');
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm">
      <div className="h-full w-full md:flex md:items-center md:justify-center md:p-4">
        <div
          ref={modalRef}
          className="h-full w-full overflow-y-auto border border-white/10 bg-zinc-950 p-4 md:h-auto md:max-h-[90vh] md:max-w-3xl md:rounded-2xl md:bg-zinc-900/95 md:p-5"
          onTouchStart={(event) => {
            const touch = event.touches[0];
            touchStartX.current = touch.clientX;
            touchStartY.current = touch.clientY;
            setDragging(false);
          }}
          onTouchMove={(event) => {
            if (animating) return;
            const touch = event.touches[0];
            const dx = touch.clientX - touchStartX.current;
            const dy = touch.clientY - touchStartY.current;
            if (!dragging && Math.abs(dx) < 8) return;
            if (!dragging && Math.abs(dy) > Math.abs(dx)) return;
            setDragging(true);
            setTransitionEnabled(false);
            setDragX(dx);
          }}
          onTouchEnd={() => {
            if (!dragging || animating) {
              setDragX(0);
              return;
            }
            setTransitionEnabled(true);
            const threshold = 70;
            if (dragX <= -threshold) {
              onNext();
            } else if (dragX >= threshold) {
              onPrev();
            } else {
              setDragX(0);
            }
            setDragging(false);
          }}
          style={{ touchAction: 'pan-y' }}
        >
          <div
            style={{
              transform: `translateX(${dragX}px)`,
              transition: transitionEnabled ? 'transform 180ms ease-out' : 'none',
            }}
          >
            <div className="sticky top-0 z-10 mb-3 border-b border-white/10 bg-zinc-950/95 pb-3 md:bg-transparent">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">{ticketNumber}</p>
                  <h3 className="truncate text-base font-semibold text-white">{title}</h3>
                  <p className="mt-1 text-xs text-slate-300">
                    <span className="rounded border border-white/15 bg-white/5 px-2 py-0.5">{pick(ticket, ['priority'])}</span>
                    <span className="ml-2 rounded border border-white/15 bg-white/5 px-2 py-0.5">{pick(ticket, ['state', 'status'])}</span>
                  </p>
                </div>
                <button className="rounded-lg border border-white/10 px-3 py-1 text-sm text-slate-200" onClick={onClose}>Close</button>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-xs text-slate-400">{safeIndex + 1} of {tickets.length}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-200 disabled:opacity-40"
                    onClick={onPrev}
                    disabled={!canGoPrev || animating}
                    aria-label="Previous ticket"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-200 disabled:opacity-40"
                    onClick={onNext}
                    disabled={!canGoNext || animating}
                    aria-label="Next ticket"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              <section className="rounded-xl border border-white/10 bg-zinc-900/60 p-3">
                <h4 className="mb-2 text-xs uppercase tracking-wide text-slate-400">Core Info</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  <p><span className="text-slate-400">Assigned To:</span> {pick(ticket, ['assignee'])}</p>
                  <p><span className="text-slate-400">Assignment Group:</span> {pick(ticket, ['assignment_group'])}</p>
                  <p><span className="text-slate-400">State:</span> {pick(ticket, ['state', 'status'])}</p>
                  <p><span className="text-slate-400">Priority:</span> {pick(ticket, ['priority'])}</p>
                  <p><span className="text-slate-400">Category:</span> {pick(ticket, ['category'])}</p>
                  <p><span className="text-slate-400">Subcategory:</span> {pick(ticket, ['subcategory'])}</p>
                  <p><span className="text-slate-400">Contact Type:</span> {pick(ticket, ['contact_type'])}</p>
                </div>
              </section>

              <section className="rounded-xl border border-white/10 bg-zinc-900/60 p-3">
                <h4 className="mb-2 text-xs uppercase tracking-wide text-slate-400">User + Location</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  <p><span className="text-slate-400">Caller/User:</span> {pick(ticket, ['caller_id', 'caller'])}</p>
                  <p><span className="text-slate-400">Affected User:</span> {pick(ticket, ['affected_user', 'u_affected_user'])}</p>
                  <p><span className="text-slate-400">Opened By:</span> {pick(ticket, ['opened_by'])}</p>
                  <p><span className="text-slate-400">Location:</span> {pick(ticket, ['location'])}</p>
                </div>
              </section>

              <section className="rounded-xl border border-white/10 bg-zinc-900/60 p-3">
                <h4 className="mb-2 text-xs uppercase tracking-wide text-slate-400">System / Device</h4>
                <p><span className="text-slate-400">CI / Device:</span> {pick(ticket, ['cmdb_ci'])}</p>
              </section>

              <section className="rounded-xl border border-white/10 bg-zinc-900/60 p-3">
                <h4 className="mb-2 text-xs uppercase tracking-wide text-slate-400">Timing</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  <p><span className="text-slate-400">Created:</span> {pick(ticket, ['created_at'])}</p>
                  <p><span className="text-slate-400">Last Updated:</span> {pick(ticket, ['updated_at', 'sys_updated_on'])}</p>
                </div>
              </section>

              <section className="rounded-xl border border-white/10 bg-zinc-900/60 p-3">
                <h4 className="mb-2 text-xs uppercase tracking-wide text-slate-400">Description</h4>
                <p className="whitespace-pre-wrap text-slate-200">{pick(ticket, ['description'])}</p>
                <p className="mt-2 text-xs text-slate-400">Short: {pick(ticket, ['short_description', 'title'])}</p>
              </section>

              <section className="rounded-xl border border-white/10 bg-zinc-900/60 p-3">
                <h4 className="mb-2 text-xs uppercase tracking-wide text-slate-400">Activity</h4>
                <p><span className="text-slate-400">Latest Comment:</span> {latestComment || '-'}</p>
                <p className="mt-2"><span className="text-slate-400">Latest Work Note:</span> {latestWorkNote || '-'}</p>
              </section>

              <section className="rounded-xl border border-white/10 bg-zinc-900/60 p-3">
                <h4 className="mb-2 text-xs uppercase tracking-wide text-slate-400">Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white"
                    disabled={!sysId}
                    onClick={() => window.open(serviceNowUrl(sysId), '_blank', 'noopener,noreferrer')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open in ServiceNow
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-200"
                    onClick={() => navigator.clipboard.writeText(ticketNumber)}
                  >
                    <Copy className="h-4 w-4" />
                    Copy Ticket Number
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-200"
                    disabled={!sysId}
                    onClick={() => navigator.clipboard.writeText(serviceNowUrl(sysId))}
                  >
                    <Link2 className="h-4 w-4" />
                    Copy Link
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
