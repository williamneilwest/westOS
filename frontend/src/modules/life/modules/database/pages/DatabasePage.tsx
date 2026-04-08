import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Copy, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { Button, Card, Modal, SectionHeader } from '../../../components/ui';
import {
  createDatabaseRecord,
  deleteDatabaseRecord,
  getDatabaseTableData,
  getDatabaseTables,
  updateDatabaseRecord,
} from '../../../services/api';

type Row = Record<string, unknown>;

type ModalMode = 'create' | 'edit';

function parseInputValue(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed === '') return '';
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
}

function toFormData(row: Row): Record<string, string> {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      value === null || value === undefined
        ? ''
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value),
    ]),
  );
}

function resolveRecordId(row: Row): string | null {
  if (row.id !== undefined && row.id !== null) return String(row.id);
  if (row._id !== undefined && row._id !== null) return String(row._id);
  const firstKey = Object.keys(row)[0];
  if (!firstKey) return null;
  const value = row[firstKey];
  return value === undefined || value === null ? null : String(value);
}

export function DatabasePage() {
  const [selectedTable, setSelectedTable] = useState('');
  const [search, setSearch] = useState('');
  const [showJson, setShowJson] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [newFieldKey, setNewFieldKey] = useState('');

  const tablesQuery = useQuery({
    queryKey: ['db-tables'],
    queryFn: getDatabaseTables,
  });

  useEffect(() => {
    if (!selectedTable && tablesQuery.data?.length) {
      setSelectedTable(tablesQuery.data[0]);
    }
  }, [selectedTable, tablesQuery.data]);

  const rowsQuery = useQuery({
    queryKey: ['db-table-data', selectedTable],
    queryFn: () => getDatabaseTableData(selectedTable),
    enabled: Boolean(selectedTable),
  });

  const rows = rowsQuery.data || [];

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const term = search.toLowerCase();
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(term));
  }, [rows, search]);

  const createMutation = useMutation({
    mutationFn: (payload: Row) => createDatabaseRecord(selectedTable, payload),
    onSuccess: async () => {
      await rowsQuery.refetch();
      setToast('Saved');
      setModalOpen(false);
    },
    onError: (error) => setToast(error instanceof Error ? error.message : 'Create failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Row }) => updateDatabaseRecord(selectedTable, id, payload),
    onSuccess: async () => {
      await rowsQuery.refetch();
      setToast('Saved');
      setModalOpen(false);
    },
    onError: (error) => setToast(error instanceof Error ? error.message : 'Update failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDatabaseRecord(selectedTable, id),
    onSuccess: async () => {
      await rowsQuery.refetch();
      setToast('Deleted');
    },
    onError: (error) => setToast(error instanceof Error ? error.message : 'Delete failed'),
  });

  const openCreate = () => {
    setModalMode('create');
    setEditingId(null);
    const template = rows[0] ? Object.fromEntries(Object.keys(rows[0]).map((key) => [key, ''])) : {};
    setFormData(template);
    setNewFieldKey('');
    setModalOpen(true);
  };

  const openEdit = (row: Row) => {
    setModalMode('edit');
    setEditingId(resolveRecordId(row));
    setFormData(toFormData(row));
    setNewFieldKey('');
    setModalOpen(true);
  };

  const saveRecord = () => {
    const payload = Object.fromEntries(Object.entries(formData).map(([key, value]) => [key, parseInputValue(value)]));

    if (modalMode === 'edit') {
      if (!editingId) {
        setToast('Cannot update without a record id');
        return;
      }
      updateMutation.mutate({ id: editingId, payload });
      return;
    }

    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6 overflow-x-hidden pb-6">
      <SectionHeader
        eyebrow="Developer Tool"
        title="Database Management"
        description="Manage table records with create, edit, and delete workflows."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => void Promise.all([tablesQuery.refetch(), rowsQuery.refetch()])}>
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add Record
            </Button>
          </div>
        }
      />

      {toast ? <p className="text-sm text-emerald-300">{toast}</p> : null}
      {tablesQuery.error instanceof Error ? <p className="text-sm text-rose-300">{tablesQuery.error.message}</p> : null}
      {rowsQuery.error instanceof Error ? <p className="text-sm text-rose-300">{rowsQuery.error.message}</p> : null}

      <Card>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="block text-xs uppercase tracking-wide text-slate-400">
            Table
            <select
              value={selectedTable}
              onChange={(event) => setSelectedTable(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none"
            >
              {tablesQuery.data?.map((table) => (
                <option key={table} value={table}>{table}</option>
              ))}
            </select>
          </label>

          <label className="block text-xs uppercase tracking-wide text-slate-400">
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter records"
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none"
            />
          </label>

          <label className="inline-flex items-end gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={showJson}
              onChange={(event) => setShowJson(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-zinc-900"
            />
            JSON view
          </label>
        </div>
      </Card>

      {!rowsQuery.isLoading && filteredRows.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-400">No records found for this table.</p>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredRows.map((row, index) => {
          const id = resolveRecordId(row) || `row-${index}`;
          const entries = Object.entries(row);
          const preview = entries.slice(0, 5);

          return (
            <Card key={`${id}-${index}`} variant="compact" className="overflow-hidden">
              <div className="space-y-2">
                {preview.map(([key, value]) => (
                  <div key={key} className="grid grid-cols-[100px_1fr] gap-2">
                    <p className="truncate text-[11px] uppercase tracking-wide text-slate-500">{key}</p>
                    <p className="line-clamp-2 break-words text-xs text-slate-200">{typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')}</p>
                  </div>
                ))}

                <details>
                  <summary className="cursor-pointer text-xs text-cyan-300">Expand all fields ({entries.length})</summary>
                  <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-white/10 bg-zinc-950/60 p-2">
                    {entries.map(([key, value]) => (
                      <div key={key} className="mb-1 grid grid-cols-[100px_1fr] gap-2 last:mb-0">
                        <p className="truncate text-[11px] uppercase tracking-wide text-slate-500">{key}</p>
                        <p className="break-words text-xs text-slate-200">{typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')}</p>
                      </div>
                    ))}
                  </div>
                </details>

                {showJson ? (
                  <pre className="max-h-40 overflow-auto rounded-lg border border-white/10 bg-zinc-950/70 p-2 text-[11px] text-slate-200">
                    {JSON.stringify(row, null, 2)}
                  </pre>
                ) : null}

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button variant="outline" onClick={() => openEdit(row)}>Edit</Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!window.confirm('Delete this record?')) return;
                      const recordId = resolveRecordId(row);
                      if (!recordId) {
                        setToast('Cannot delete record without an id');
                        return;
                      }
                      deleteMutation.mutate(recordId);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const duplicate = { ...row };
                      delete duplicate.id;
                      delete duplicate._id;
                      setModalMode('create');
                      setEditingId(null);
                      setFormData(toFormData(duplicate));
                      setModalOpen(true);
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Duplicate
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal title={modalMode === 'create' ? 'Add Record' : 'Edit Record'} open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="space-y-3">
          <div className="max-h-[58vh] space-y-3 overflow-y-auto pr-1">
            {Object.keys(formData).map((key) => (
              <label key={key} className="block text-xs uppercase tracking-wide text-slate-400">
                {key}
                <input
                  value={formData[key] ?? ''}
                  onChange={(event) => setFormData((prev) => ({ ...prev, [key]: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none"
                />
              </label>
            ))}

            {Object.keys(formData).length === 0 ? (
              <p className="text-xs text-slate-400">No inferred fields for this table yet. Add a field below.</p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-zinc-950/40 p-2">
              <input
                value={newFieldKey}
                onChange={(event) => setNewFieldKey(event.target.value)}
                placeholder="new_field_name"
                className="rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none"
              />
              <Button
                variant="outline"
                onClick={() => {
                  const key = newFieldKey.trim();
                  if (!key) return;
                  if (formData[key] !== undefined) return;
                  setFormData((prev) => ({ ...prev, [key]: '' }));
                  setNewFieldKey('');
                }}
              >
                Add Field
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              onClick={saveRecord}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default DatabasePage;
