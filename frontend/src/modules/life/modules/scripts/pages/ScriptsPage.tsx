import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Badge, Button, SectionHeader } from '../../../components/ui';
import { ScriptCard } from '../components/ScriptCard';
import { ScriptModal } from '../components/ScriptModal';
import { scriptsService } from '../services/scriptsService';
import type { ScriptPayload, ScriptRecord } from '../types';

export function ScriptsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<ScriptRecord | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['scripts'],
    queryFn: scriptsService.list,
    refetchInterval: 30_000,
  });

  const scripts = useMemo(() => data || [], [data]);

  const createMutation = useMutation({
    mutationFn: (payload: ScriptPayload) => scriptsService.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['scripts'] });
      setModalOpen(false);
      setEditingScript(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ScriptPayload }) => scriptsService.update(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['scripts'] });
      setModalOpen(false);
      setEditingScript(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => scriptsService.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['scripts'] });
    },
  });

  const activeSubmit = createMutation.isPending || updateMutation.isPending;

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  };

  const handleCopy = async (script: ScriptRecord) => {
    await navigator.clipboard.writeText(script.script);
    showToast('Script copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Module"
        title="Scripts"
        description="Copy-only script library for operational runbooks."
        actions={<Badge variant="info">Copy Only</Badge>}
      />

      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => {
            setEditingScript(null);
            setModalOpen(true);
          }}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Script
        </Button>
      </div>

      {isLoading ? <p className="text-sm text-slate-400">Loading scripts...</p> : null}
      {error instanceof Error ? <p className="text-sm text-rose-300">{error.message}</p> : null}

      {!isLoading && !error && scripts.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-8 text-center text-sm text-slate-400">
          No scripts yet. Add your first script.
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {scripts.map((script) => (
          <ScriptCard
            key={script.id}
            script={script}
            onCopy={(item) => {
              void handleCopy(item);
            }}
            onEdit={(item) => {
              setEditingScript(item);
              setModalOpen(true);
            }}
            onDelete={(item) => {
              if (!window.confirm(`Delete "${item.name}"?`)) return;
              deleteMutation.mutate(item.id);
            }}
          />
        ))}
      </div>

      <ScriptModal
        open={modalOpen}
        mode={editingScript ? 'edit' : 'add'}
        initialScript={editingScript}
        submitting={activeSubmit}
        onClose={() => {
          setModalOpen(false);
          setEditingScript(null);
        }}
        onSubmit={(payload) => {
          if (editingScript) {
            updateMutation.mutate({ id: editingScript.id, payload });
            return;
          }
          createMutation.mutate(payload);
        }}
      />

      {toast ? (
        <div className="pointer-events-none fixed bottom-5 right-5 z-50 rounded-lg border border-emerald-300/30 bg-emerald-500/20 px-4 py-2 text-sm text-emerald-100 shadow-lg backdrop-blur">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
