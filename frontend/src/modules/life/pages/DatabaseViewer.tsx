import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCcw } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { Button, Card, SectionHeader } from '../components/ui';
import { getDatabaseTableData, getDatabaseTables } from '../services/api';

export function DatabaseViewer() {
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const previousRowsRef = useRef<string[]>([]);

  const {
    data: tables = [],
    isLoading: loadingTables,
    error: tablesError,
    refetch: refetchTables,
  } = useQuery({
    queryKey: ['db-tables'],
    queryFn: getDatabaseTables,
    refetchInterval: autoRefresh ? 10_000 : false,
  });

  useEffect(() => {
    if (!selectedTable && tables.length > 0) {
      setSelectedTable(tables[0]);
    }
  }, [selectedTable, tables]);

  const {
    data: rows = [],
    isLoading: loadingRows,
    error: rowsError,
    refetch: refetchRows,
  } = useQuery({
    queryKey: ['db-table-data', selectedTable],
    queryFn: () => getDatabaseTableData(selectedTable),
    enabled: Boolean(selectedTable),
    refetchInterval: autoRefresh ? 10_000 : false,
  });

  const highlightedRows = useMemo(() => {
    const previousRows = previousRowsRef.current;
    const currentRows = rows.map((row) => JSON.stringify(row));
    const changedIndexes = new Set<number>();
    currentRows.forEach((rowValue, index) => {
      if (previousRows[index] !== rowValue) {
        changedIndexes.add(index);
      }
    });
    previousRowsRef.current = currentRows;
    return changedIndexes;
  }, [rows]);

  const tableError = tablesError instanceof Error ? tablesError.message : null;
  const rowsErrorMessage = rowsError instanceof Error ? rowsError.message : null;

  const handleRefresh = async () => {
    console.log('Refreshing...');
    await Promise.all([refetchTables(), refetchRows()]);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Developer Tool"
        title="Database Viewer"
        description="Inspect live PostgreSQL tables and rows in real-time."
        actions={
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} />
              Auto refresh
            </label>
            <Button onClick={() => void handleRefresh()}>
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card>
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Tables</h3>
          {loadingTables ? <p className="mt-3 text-sm text-slate-400">Loading tables...</p> : null}
          {tableError ? <p className="mt-3 text-sm text-rose-300">{tableError}</p> : null}
          <div className="mt-4 space-y-2">
            {tables.map((tableName) => (
              <button
                key={tableName}
                type="button"
                onClick={() => setSelectedTable(tableName)}
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                  tableName === selectedTable
                    ? 'border-emerald-400/40 bg-emerald-500/10 text-white'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {tableName}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">{selectedTable || 'No table selected'}</h3>
              <p className="text-sm text-slate-400">Row count: {rows.length}</p>
            </div>
          </div>

          <DataTable
            rows={rows}
            loading={loadingRows}
            error={rowsErrorMessage}
            highlightedRows={highlightedRows}
          />
        </Card>
      </div>
    </div>
  );
}

