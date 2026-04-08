import { ArrowDownAZ, ArrowUpAZ, ExternalLink } from 'lucide-react';

type TicketRow = Record<string, string | number | boolean>;
type SortKey = 'ticket_number' | 'title' | 'assignee' | 'status' | 'priority' | 'created_at' | 'updated_at' | 'age_days';

interface TicketTableProps {
  rows: TicketRow[];
  sortKey: SortKey;
  sortDir: 'asc' | 'desc';
  page: number;
  pageSize: number;
  onSort: (key: SortKey) => void;
  onPage: (next: number) => void;
  onOpenDetails: (ticket: TicketRow) => void;
}

const columns: Array<{ key: SortKey; label: string }> = [
  { key: 'ticket_number', label: 'Ticket Number' },
  { key: 'title', label: 'Title' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'created_at', label: 'Created' },
  { key: 'updated_at', label: 'Last Updated' },
  { key: 'age_days', label: 'Age' },
];

function value(row: TicketRow, key: SortKey): string | number {
  if (key === 'ticket_number') return String(row.ticket_number || row.number || row.incident || row.ticket || '');
  if (key === 'title') return String(row.title || row.short_description || '');
  const raw = row[key];
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'boolean') return raw ? 1 : 0;
  return '';
}

function serviceNowUrl(sysId: string): string {
  return `https://servicenow.adventhealth.com/task.do?sys_id=${encodeURIComponent(sysId)}`;
}

export function TicketTable({ rows, sortKey, sortDir, page, pageSize, onSort, onPage, onOpenDetails }: TicketTableProps) {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const start = (clampedPage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  return (
    <section className="w-full max-w-full overflow-x-hidden rounded-xl border border-white/10 bg-zinc-950/60 p-3">
      <div className="md:hidden">
        <div className="flex flex-col gap-2">
          {pageRows.map((row, idx) => {
            const ticketNumber = String(value(row, 'ticket_number') || `TKT-${idx + 1}`);
            const sysId = String(row.sys_id || '');
            const lastUpdateDays = Number(row.last_update_days || 0);
            const isUrgent = Boolean(row.is_urgent);
            const isStale = Boolean(row.is_stale);
            const badge = isUrgent ? '🔴 Urgent' : isStale ? '🟡 Stale' : '🟢 Normal';
            const badgeTone = isUrgent
              ? 'border-rose-300/30 bg-rose-500/10 text-rose-200'
              : isStale
                ? 'border-amber-300/30 bg-amber-500/10 text-amber-200'
                : 'border-emerald-300/30 bg-emerald-500/10 text-emerald-200';
            return (
              <button
                key={`${ticketNumber}-${idx}`}
                type="button"
                onClick={() => onOpenDetails(row)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900/70 p-3 text-left transition hover:border-cyan-300/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs text-slate-400">{ticketNumber}</p>
                    <p className="truncate text-sm font-semibold text-white">{String(value(row, 'title') || '(No title)')}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] ${badgeTone}`}>{badge}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <p><span className="text-slate-500">Priority:</span> {String(value(row, 'priority'))}</p>
                  <p><span className="text-slate-500">State:</span> {String(value(row, 'status'))}</p>
                  <p><span className="text-slate-500">Assigned:</span> {String(value(row, 'assignee') || '-')}</p>
                  <p><span className="text-slate-500">Updated:</span> {Math.floor(lastUpdateDays)}d ago</p>
                </div>
                <div className="mt-2 flex items-center justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2 py-1 text-[11px] text-white"
                    disabled={!sysId}
                    onClick={(event) => {
                      event.stopPropagation();
                      window.open(serviceNowUrl(sysId), '_blank', 'noopener,noreferrer');
                    }}
                    aria-label={`Open ${ticketNumber} in ServiceNow`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open in SN
                  </button>
                </div>
              </button>
            );
          })}
          {pageRows.length === 0 ? <p className="rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-6 text-center text-sm text-slate-500">No tickets match current filters.</p> : null}
        </div>
      </div>

      <div className="hidden w-full overflow-x-auto rounded-lg border border-white/10 md:block">
        <table className="min-w-full text-sm text-slate-200">
          <thead className="sticky top-0 z-10 bg-zinc-900">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-3 py-2 text-left">
                  <button className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-slate-300" onClick={() => onSort(column.key)}>
                    {column.label}
                    {sortKey === column.key ? (sortDir === 'asc' ? <ArrowUpAZ className="h-3.5 w-3.5" /> : <ArrowDownAZ className="h-3.5 w-3.5" />) : null}
                  </button>
                </th>
              ))}
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-slate-300">Action</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, idx) => {
              const ticketNumber = String(value(row, 'ticket_number') || `TKT-${idx + 1}`);
              const sysId = String(row.sys_id || '');
              const lastUpdateDays = Number(row.last_update_days || 0);
              const isUrgent = Boolean(row.is_urgent);
              const isStale = Boolean(row.is_stale);
              return (
                <tr
                  key={`${ticketNumber}-${idx}`}
                  onClick={() => onOpenDetails(row)}
                  className={`cursor-pointer border-t border-white/5 transition hover:bg-zinc-900/70 ${isUrgent ? 'bg-rose-500/5' : isStale ? 'bg-amber-500/5' : ''}`}
                >
                  <td className="px-3 py-2 font-semibold text-cyan-100">{ticketNumber}</td>
                  <td className="max-w-[360px] truncate px-3 py-2 text-white">{String(value(row, 'title'))}</td>
                  <td className="px-3 py-2">{String(value(row, 'assignee'))}</td>
                  <td className="px-3 py-2">{String(value(row, 'status'))}</td>
                  <td className="px-3 py-2">{String(value(row, 'priority'))}</td>
                  <td className="px-3 py-2">{String(value(row, 'created_at'))}</td>
                  <td className="px-3 py-2">{Math.floor(lastUpdateDays)}d ago</td>
                  <td className="px-3 py-2">{Number(value(row, 'age_days') || 0).toFixed(1)}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2 py-1 text-xs text-white"
                      disabled={!sysId}
                      onClick={(event) => {
                        event.stopPropagation();
                        window.open(serviceNowUrl(sysId), '_blank', 'noopener,noreferrer');
                      }}
                      aria-label={`Open ${ticketNumber} in ServiceNow`}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open in SN
                    </button>
                  </td>
                </tr>
              );
            })}
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-6 text-center text-slate-500">No tickets match current filters.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <span>Showing {pageRows.length} of {rows.length}</span>
        <div className="flex items-center gap-2">
          <button
            className="rounded border border-white/10 px-2 py-1 disabled:opacity-50"
            onClick={() => onPage(clampedPage - 1)}
            disabled={clampedPage <= 1}
          >
            Prev
          </button>
          <span>Page {clampedPage} / {totalPages}</span>
          <button
            className="rounded border border-white/10 px-2 py-1 disabled:opacity-50"
            onClick={() => onPage(clampedPage + 1)}
            disabled={clampedPage >= totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
