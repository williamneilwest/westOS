import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Globe, Pencil, Plus, Server, Trash2 } from 'lucide-react';
import { Badge, Button, Card, Modal, SectionHeader } from '../../../components/ui';
import { toolsService } from '../../../services/toolsService';
import type { ToolModule } from '../../tools/types';

type ServiceItem = {
  id: string;
  name: string;
  url: string;
  icon?: string;
  description?: string;
};

function parseServices(module: ToolModule): ServiceItem[] {
  const raw = module.config.services;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, index) => ({
      id: String(item.id || `${module.id}-${index}`),
      name: String(item.name || 'Service'),
      url: String(item.url || ''),
      icon: String(item.icon || ''),
      description: String(item.description || ''),
    }))
    .filter((item) => item.url);
}

function ServiceModuleCard({
  module,
  onEdit,
  onDelete,
}: {
  module: ToolModule;
  onEdit: (module: ToolModule) => void;
  onDelete: (moduleId: string) => void;
}) {
  const services = parseServices(module);

  return (
    <Card title={module.name} description="Editable service links for your homelab.">
      <div className="mb-3 flex items-center justify-end gap-1">
        <button
          type="button"
          className="rounded-lg border border-white/10 p-1.5 text-slate-300 hover:text-cyan-200"
          onClick={() => onEdit(module)}
          aria-label={`Edit ${module.name}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="rounded-lg border border-white/10 p-1.5 text-slate-300 hover:text-rose-200"
          onClick={() => onDelete(module.id)}
          aria-label={`Delete ${module.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {services.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {services.map((service) => (
            <a
              key={service.id}
              href={service.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-slate-200 hover:border-cyan-300/30"
            >
              <div className="inline-flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-cyan-300" />
                <p className="font-medium text-white">{service.name}</p>
              </div>
              {service.description ? <p className="mt-1 text-xs text-slate-400">{service.description}</p> : null}
              <p className="mt-1 truncate text-[11px] text-slate-500">{service.url}</p>
            </a>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No services configured in this module yet.</p>
      )}
    </Card>
  );
}

export function HomelabPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ToolModule | null>(null);
  const [name, setName] = useState('Services');
  const [servicesJson, setServicesJson] = useState(
    JSON.stringify([
      {
        id: 'portainer',
        name: 'Portainer',
        url: 'https://portainer.pridebytes.com',
        icon: 'server',
        description: 'Docker management',
      },
    ], null, 2),
  );
  const [error, setError] = useState<string | null>(null);

  const modulesQuery = useQuery({
    queryKey: ['homelab-modules'],
    queryFn: toolsService.getModules,
  });

  const serviceModules = useMemo(
    () => (modulesQuery.data?.modules || []).filter((module) => module.type === 'services'),
    [modulesQuery.data?.modules],
  );

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; type: string; config: Record<string, unknown> }) => toolsService.createModule(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['homelab-modules'] });
      setModalOpen(false);
      setEditing(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name?: string; type?: string; config?: Record<string, unknown> } }) =>
      toolsService.updateModule(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['homelab-modules'] });
      setModalOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => toolsService.deleteModule(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['homelab-modules'] });
    },
  });

  const openAdd = () => {
    setEditing(null);
    setName('Services');
    setServicesJson('[]');
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (module: ToolModule) => {
    setEditing(module);
    setName(module.name);
    setServicesJson(JSON.stringify(module.config.services || [], null, 2));
    setError(null);
    setModalOpen(true);
  };

  return (
    <div className="w-full max-w-full space-y-5 overflow-x-hidden">
      <SectionHeader
        eyebrow="Module"
        title="Homelab"
        description="Infrastructure and services modules."
        actions={<Badge variant="info">User Editable</Badge>}
      />

      <div className="flex justify-end">
        <Button variant="outline" onClick={openAdd}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Services Module
        </Button>
      </div>

      {modulesQuery.isLoading ? <p className="text-sm text-slate-400">Loading homelab modules...</p> : null}
      {modulesQuery.error instanceof Error ? <p className="text-sm text-rose-300">{modulesQuery.error.message}</p> : null}

      <div className="grid gap-4">
        {serviceModules.map((module) => (
          <ServiceModuleCard
            key={module.id}
            module={module}
            onEdit={openEdit}
            onDelete={(moduleId) => {
              if (!window.confirm('Remove this services module?')) return;
              deleteMutation.mutate(moduleId);
            }}
          />
        ))}
      </div>

      {!modulesQuery.isLoading && !serviceModules.length ? (
        <Card>
          <div className="inline-flex items-center gap-2 text-sm text-slate-400">
            <Server className="h-4 w-4 text-cyan-300" />
            No services modules yet. Add one to replace the old Services tab.
          </div>
        </Card>
      ) : null}

      <Modal title={editing ? 'Edit Services Module' : 'Add Services Module'} open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="space-y-3">
          <label className="block text-xs uppercase tracking-wide text-slate-400">
            Module Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
            />
          </label>

          <label className="block text-xs uppercase tracking-wide text-slate-400">
            Services (JSON Array)
            <textarea
              value={servicesJson}
              onChange={(event) => setServicesJson(event.target.value)}
              rows={12}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 font-mono text-xs text-white outline-none focus:border-cyan-300/40"
            />
          </label>

          {error ? <p className="rounded-lg border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={createMutation.isPending || updateMutation.isPending}
              onClick={() => {
                if (!name.trim()) {
                  setError('Module name is required');
                  return;
                }
                try {
                  const parsed = JSON.parse(servicesJson || '[]');
                  if (!Array.isArray(parsed)) {
                    setError('Services must be a JSON array');
                    return;
                  }
                  setError(null);
                  const payload = {
                    name: name.trim(),
                    type: 'services',
                    config: { services: parsed },
                  };
                  if (editing) {
                    updateMutation.mutate({ id: editing.id, payload });
                    return;
                  }
                  createMutation.mutate(payload);
                } catch {
                  setError('Services JSON is invalid');
                }
              }}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
