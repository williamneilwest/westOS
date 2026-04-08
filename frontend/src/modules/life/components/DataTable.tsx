import { useMemo, useState } from 'react';

interface DataTableProps {
  rows: Record<string, unknown>[];
  loading: boolean;
  error: string | null;
  highlightedRows?: Set<number>;
}

function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function DataTable({ rows, loading, error, highlightedRows }: DataTableProps) {
  const [sortBy, setSortBy] = useState<string>('');
  const [sortAsc, setSortAsc] = useState(true);
  const [search, setSearch] = useState('');

  const columns = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((row) => Object.keys(row).forEach((key) => set.add(key)));
    return Array.from(set);
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (!query) return true;
      return Object.values(row).some((value) => stringifyCell(value).toLowerCase().includes(query));
    });
  }, [rows, search]);

  const sortedRows = useMemo(() => {
    if (!sortBy) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const left = stringifyCell(a[sortBy]);
      const right = stringifyCell(b[sortBy]);
      const compare = left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
      return sortAsc ? compare : -compare;
    });
  }, [filteredRows, sortBy, sortAsc]);

  if (loading) return <p className="text-sm text-slate-400">Loading table data...</p>;
  if (error) return <p className="text-sm text-rose-300">{error}</p>;

  return (
    <div className="space-y-4">
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Filter rows..."
        className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/50"
      />

      <div className="overflow-auto rounded-2xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-900/95 text-xs uppercase tracking-[0.16em] text-slate-400">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (sortBy === column) {
                        setSortAsc((prev) => !prev);
                      } else {
                        setSortBy(column);
                        setSortAsc(true);
                      }
                    }}
                    className="inline-flex items-center gap-2"
                  >
                    <span>{column}</span>
                    {sortBy === column ? <span>{sortAsc ? '▲' : '▼'}</span> : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-slate-950/30 text-slate-200">
            {sortedRows.map((row, rowIndex) => (
              <tr key={`${rowIndex}-${JSON.stringify(row)}`} className={highlightedRows?.has(rowIndex) ? 'bg-emerald-500/10' : ''}>
                {columns.map((column) => (
                  <td key={`${rowIndex}-${column}`} className="whitespace-nowrap px-4 py-3 align-top">
                    {stringifyCell(row[column]) || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

