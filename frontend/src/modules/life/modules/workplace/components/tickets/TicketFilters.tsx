import { FilterDropdown } from '../../../../components/ui';

interface TicketFiltersProps {
  search: string;
  status: string;
  assignee: string;
  priority: string;
  staleOnly: boolean;
  urgentOnly: boolean;
  statuses: string[];
  assignees: string[];
  priorities: string[];
  onSearch: (value: string) => void;
  onStatus: (value: string) => void;
  onAssignee: (value: string) => void;
  onPriority: (value: string) => void;
  onStaleOnly: (value: boolean) => void;
  onUrgentOnly: (value: boolean) => void;
}

export function TicketFilters({
  search,
  status,
  assignee,
  priority,
  staleOnly,
  urgentOnly,
  statuses,
  assignees,
  priorities,
  onSearch,
  onStatus,
  onAssignee,
  onPriority,
  onStaleOnly,
  onUrgentOnly,
}: TicketFiltersProps) {
  return (
    <div className="grid w-full gap-3 overflow-visible rounded-xl border border-white/10 bg-zinc-950/60 p-3 md:grid-cols-6">
      <input
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        placeholder="Search title or ticket #"
        className="w-full rounded-lg border border-white/10 bg-zinc-900/70 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/40"
      />
      <FilterDropdown
        value={status}
        onChange={onStatus}
        placeholder="All Status"
        options={[
          { value: '', label: 'All Status' },
          ...statuses.map((option) => ({ value: option, label: option })),
        ]}
      />
      <FilterDropdown
        value={assignee}
        onChange={onAssignee}
        placeholder="All Assignees"
        options={[
          { value: '', label: 'All Assignees' },
          ...assignees.map((option) => ({ value: option, label: option })),
        ]}
      />
      <FilterDropdown
        value={priority}
        onChange={onPriority}
        placeholder="All Priorities"
        options={[
          { value: '', label: 'All Priorities' },
          ...priorities.map((option) => ({ value: option, label: option })),
        ]}
      />
      <label className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-zinc-900/70 px-3 py-2 text-sm text-slate-200">
        <input type="checkbox" checked={staleOnly} onChange={(event) => onStaleOnly(event.target.checked)} />
        Stale (3+d)
      </label>
      <label className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
        <input type="checkbox" checked={urgentOnly} onChange={(event) => onUrgentOnly(event.target.checked)} />
        Urgent (5+d)
      </label>
    </div>
  );
}
