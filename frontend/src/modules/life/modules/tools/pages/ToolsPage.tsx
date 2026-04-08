import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ExternalLink, Pencil, Plus, QrCode, Server, Trash2, Wrench } from 'lucide-react';
import ApiModuleView from '../../api/ApiModule';
import { Badge, Button, Card, Modal, SectionHeader } from '../../../components/ui';
import { toolsService } from '../../../services/toolsService';
import type { ApiModuleConfig, QrHistoryEntry, QrModuleConfig, ShortcutModuleConfig, ToolModule, ToolModuleType } from '../types';

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizeQrConfig(config: Record<string, unknown>): QrModuleConfig {
  const parsed = asObject(config);
  const historyRaw = Array.isArray(parsed.history) ? parsed.history : [];
  const history: QrHistoryEntry[] = historyRaw
    .map((item) => {
      const row = asObject(item);
      const text = String(row.text || '').trim();
      if (!text) return null;
      return {
        id: String(row.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`),
        text,
        createdAt: String(row.createdAt || new Date().toISOString()),
      };
    })
    .filter((item): item is QrHistoryEntry => Boolean(item));

  return {
    defaultText: String(parsed.defaultText || ''),
    history,
  };
}

function normalizeShortcutConfig(config: Record<string, unknown>, moduleName = ''): ShortcutModuleConfig {
  const parsed = asObject(config);
  return {
    label: String(parsed.label || moduleName || 'Shortcut'),
    url: String(parsed.url || '/'),
    newTab: parsed.newTab !== false,
    method: String(parsed.method || 'GET').toUpperCase() === 'POST' ? 'POST' : 'GET',
  };
}

function normalizeApiConfig(config: Record<string, unknown>): ApiModuleConfig {
  const parsed = asObject(config);
  const refreshRaw = Number(parsed.refreshInterval || 0);
  const displayRaw = String(parsed.display || 'raw').toLowerCase();
  return {
    endpoint: String(parsed.endpoint || ''),
    method: String(parsed.method || 'GET').toUpperCase() === 'POST' ? 'POST' : 'GET',
    refreshInterval: Number.isFinite(refreshRaw) && refreshRaw > 0 ? refreshRaw : undefined,
    display: displayRaw === 'table' || displayRaw === 'card' || displayRaw === 'raw' ? (displayRaw as 'table' | 'card' | 'raw') : 'raw',
  };
}

function getUsageCount(module: ToolModule): number {
  const config = asObject(module.config);
  const usageCount = Number(config.usage_count || 0);
  return Number.isFinite(usageCount) && usageCount > 0 ? usageCount : 0;
}

function getLastUsedTimestamp(module: ToolModule): number {
  const config = asObject(module.config);
  const lastUsedRaw = String(config.last_used_at || '');
  const parsed = Date.parse(lastUsedRaw);
  return Number.isFinite(parsed) ? parsed : 0;
}

type ToolCategory = 'all' | 'most-used' | 'utilities' | 'api-dev' | 'quick-actions';

const CATEGORY_TABS: Array<{ id: ToolCategory; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'most-used', label: 'Most Used' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'api-dev', label: 'API / Dev' },
  { id: 'quick-actions', label: 'Quick Actions' },
];

function matchesCategory(module: ToolModule, category: ToolCategory): boolean {
  if (category === 'all') return true;
  if (category === 'most-used') return getUsageCount(module) > 0;
  if (category === 'utilities') return module.type === 'qr' || module.type === 'shortcut' || module.type === 'api';
  if (category === 'api-dev') return module.type === 'api' || module.type === 'api_tester';
  if (category === 'quick-actions') return module.type === 'shortcut';
  return true;
}

function QrToolModule({
  module,
  onSaveConfig,
  onUse,
}: {
  module: ToolModule;
  onSaveConfig: (module: ToolModule, config: Record<string, unknown>) => Promise<void>;
  onUse: (module: ToolModule) => Promise<void>;
}) {
  const config = normalizeQrConfig(module.config);
  const [text, setText] = useState(config.defaultText || '');
  const [savingError, setSavingError] = useState<string | null>(null);
  const lastSavedText = useRef((config.defaultText || '').trim());

  useEffect(() => {
    setText(config.defaultText || '');
    lastSavedText.current = (config.defaultText || '').trim();
  }, [module.id, config.defaultText]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const cleanText = text.trim();
      if (!cleanText || cleanText === lastSavedText.current) return;

      const nextHistory = [
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          text: cleanText,
          createdAt: new Date().toISOString(),
        },
        ...(config.history || []).filter((entry) => entry.text !== cleanText),
      ].slice(0, 40);

      void onSaveConfig(module, {
        ...module.config,
        defaultText: cleanText,
        history: nextHistory,
      })
        .then(() => {
          lastSavedText.current = cleanText;
          setSavingError(null);
        })
        .catch((error) => {
          setSavingError(error instanceof Error ? error.message : 'Failed to auto-save QR history');
        });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [config.history, module, onSaveConfig, text]);

  const qrUrl = useMemo(
    () => `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(text || ' ')}`,
    [text],
  );

  const history = useMemo(() => (config.history || []).slice(0, 10), [config.history]);

  return (
    <Card title={module.name} description="Generate QR codes instantly.">
      <div className="space-y-3">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Enter text or URL"
          className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
        />
        <div className="flex justify-center rounded-xl border border-white/10 bg-zinc-950/60 p-4">
          <img src={qrUrl} alt="Generated QR code" className="h-52 w-52 rounded-lg bg-white p-2" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              void navigator.clipboard.writeText(text);
              void onUse(module);
            }}
          >
            Copy Text
          </Button>
          <a
            href={qrUrl}
            download="qr-code.png"
            onClick={() => void onUse(module)}
            className="inline-flex items-center rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
          >
            Download QR
          </a>
        </div>

        {savingError ? <p className="text-xs text-rose-300">{savingError}</p> : null}

        <details className="rounded-xl border border-white/10 bg-zinc-950/50 p-3">
          <summary className="cursor-pointer list-none text-sm font-medium text-slate-200">QR History ({config.history?.length || 0})</summary>
          <div className="mt-3 space-y-2">
            {!history.length ? <p className="text-xs text-slate-400">No saved QR codes yet.</p> : null}
            {history.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-white/10 bg-zinc-900/60 p-2">
                <p className="truncate text-sm text-slate-200">{entry.text}</p>
                <p className="mt-1 text-[11px] text-slate-500">{new Date(entry.createdAt).toLocaleString()}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setText(entry.text);
                      void onUse(module);
                    }}
                  >
                    Load
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>
    </Card>
  );
}

function ShortcutToolModule({ module, onUse }: { module: ToolModule; onUse: (module: ToolModule) => Promise<void> }) {
  const config = normalizeShortcutConfig(module.config, module.name);
  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState<string | null>(null);

  const runPostShortcut = async () => {
    if (!config.url.trim()) {
      setPostResult('Shortcut URL is missing.');
      return;
    }
    setPosting(true);
    setPostResult(null);
    try {
      const result = await toolsService.fetchProxy(config.url, 'POST');
      setPostResult(`POST complete. Upstream status: ${result.status}`);
      await onUse(module);
    } catch (error) {
      setPostResult(error instanceof Error ? error.message : 'Shortcut POST failed');
    } finally {
      setPosting(false);
    }
  };

  return (
    <Card title={module.name} description="Quick launch utility.">
      <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-3">
        <p className="text-sm text-slate-300">{config.label}</p>
        <p className="mt-1 break-words text-xs text-slate-500">{config.url}</p>
        <p className="mt-1 text-[11px] text-slate-500">Method: {config.method}</p>

        <div className="mt-3">
          {config.method === 'POST' ? (
            <Button variant="outline" onClick={() => void runPostShortcut()} disabled={posting}>
              {posting ? 'Running...' : 'Run POST'}
            </Button>
          ) : (
            <a
              href={config.url}
              target={config.newTab ? '_blank' : '_self'}
              rel={config.newTab ? 'noreferrer' : undefined}
              onClick={() => void onUse(module)}
              className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-3 py-2 text-sm text-white"
            >
              <ExternalLink className="h-4 w-4" />
              Open
            </a>
          )}
        </div>

        {postResult ? <p className="mt-2 text-xs text-slate-300">{postResult}</p> : null}
      </div>
    </Card>
  );
}

function ApiToolModule({ module, onUse }: { module: ToolModule; onUse: (module: ToolModule) => Promise<void> }) {
  const config = normalizeApiConfig(module.config);
  return (
    <Card title={module.name} description="Fetch and render API endpoint data.">
      <ApiModuleView moduleId={module.id} title={module.name} config={config} onUse={() => void onUse(module)} />
    </Card>
  );
}

function ApiTesterToolModule({ module }: { module: ToolModule }) {
  return (
    <Card title={module.name} description="Legacy API tester module.">
      <p className="text-sm text-slate-300">This module is preserved for compatibility. Edit and run from its legacy workflow.</p>
    </Card>
  );
}

function LegacyModule({ module }: { module: ToolModule }) {
  console.warn('Unknown module type:', module.type);
  return (
    <Card title={module.name} description="Unsupported module type">
      <p className="text-sm text-slate-400">Type `{module.type}` is not yet supported by the typed renderer.</p>
    </Card>
  );
}

function ModuleRenderer({
  module,
  onSaveConfig,
  onUse,
}: {
  module: ToolModule;
  onSaveConfig: (module: ToolModule, config: Record<string, unknown>) => Promise<void>;
  onUse: (module: ToolModule) => Promise<void>;
}) {
  if (module.type === 'qr') return <QrToolModule module={module} onSaveConfig={onSaveConfig} onUse={onUse} />;
  if (module.type === 'shortcut') return <ShortcutToolModule module={module} onUse={onUse} />;
  if (module.type === 'api') return <ApiToolModule module={module} onUse={onUse} />;
  if (module.type === 'api_tester') return <ApiTesterToolModule module={module} />;
  return <LegacyModule module={module} />;
}

const DEFAULT_QR_CONFIG: QrModuleConfig = { defaultText: '', history: [] };
const DEFAULT_SHORTCUT_CONFIG: ShortcutModuleConfig = { label: 'Shortcut', url: 'https://example.com', newTab: true, method: 'GET' };
const DEFAULT_API_CONFIG: ApiModuleConfig = { endpoint: 'https://api.github.com', method: 'GET', display: 'raw' };

export function ToolsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ToolModule | null>(null);
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('all');
  const [name, setName] = useState('');
  const [type, setType] = useState<ToolModuleType>('qr');

  const [qrConfig, setQrConfig] = useState<QrModuleConfig>(DEFAULT_QR_CONFIG);
  const [shortcutConfig, setShortcutConfig] = useState<ShortcutModuleConfig>(DEFAULT_SHORTCUT_CONFIG);
  const [apiConfig, setApiConfig] = useState<ApiModuleConfig>(DEFAULT_API_CONFIG);
  const [rawConfig, setRawConfig] = useState('{}');

  const [error, setError] = useState<string | null>(null);
  const [apiTestResult, setApiTestResult] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const modulesQuery = useQuery({
    queryKey: ['tool-modules'],
    queryFn: toolsService.getModules,
  });

  useEffect(() => {
    void modulesQuery.refetch();
    // Explicit initial fetch to keep backend as source of truth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onExternalAdd = () => {
      setEditing(null);
      setName('');
      setType('qr');
      setQrConfig(DEFAULT_QR_CONFIG);
      setShortcutConfig(DEFAULT_SHORTCUT_CONFIG);
      setApiConfig(DEFAULT_API_CONFIG);
      setRawConfig('{}');
      setApiTestResult(null);
      setError(null);
      setSuccessMessage(null);
      setModalOpen(true);
    };
    window.addEventListener('tools:add-requested', onExternalAdd);
    return () => window.removeEventListener('tools:add-requested', onExternalAdd);
  }, []);

  const utilityModules = useMemo(() => {
    const modules = (modulesQuery.data?.modules || []).filter((module) => module.type !== 'services');
    const sorted = [...modules].sort((left, right) => {
      const usageDelta = getUsageCount(right) - getUsageCount(left);
      if (usageDelta !== 0) return usageDelta;

      const lastUsedDelta = getLastUsedTimestamp(right) - getLastUsedTimestamp(left);
      if (lastUsedDelta !== 0) return lastUsedDelta;

      const rightCreated = Date.parse(right.created_at || '') || 0;
      const leftCreated = Date.parse(left.created_at || '') || 0;
      return rightCreated - leftCreated;
    });

    return sorted.filter((module) => matchesCategory(module, activeCategory));
  }, [activeCategory, modulesQuery.data?.modules]);

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; type: ToolModuleType; config: Record<string, unknown> }) => {
      console.log('Creating tool:', payload);
      return toolsService.createTool(payload);
    },
    onSuccess: async (created) => {
      console.log('Created tool response:', created);
      await modulesQuery.refetch();
      setModalOpen(false);
      setEditing(null);
      setSuccessMessage(`Tool created: ${created.name}`);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : 'Failed to create tool module');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name: string; type: ToolModuleType; config: Record<string, unknown> } }) =>
      toolsService.updateModule(id, payload),
    onSuccess: async (updated) => {
      await modulesQuery.refetch();
      setModalOpen(false);
      setEditing(null);
      setSuccessMessage(`Tool updated: ${updated.name}`);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : 'Failed to update tool module');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => toolsService.deleteModule(id),
    onSuccess: async () => {
      await modulesQuery.refetch();
      setSuccessMessage('Tool deleted');
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : 'Failed to delete tool module');
    },
  });

  const persistModuleConfig = async (module: ToolModule, config: Record<string, unknown>) => {
    await toolsService.updateModule(module.id, {
      name: module.name,
      type: module.type,
      config,
    });
    await modulesQuery.refetch();
  };

  const markModuleUsed = async (module: ToolModule) => {
    const currentConfig = asObject(module.config);
    const usageCount = getUsageCount(module);
    await toolsService.updateModule(module.id, {
      name: module.name,
      type: module.type,
      config: {
        ...currentConfig,
        usage_count: usageCount + 1,
        last_used_at: new Date().toISOString(),
      },
    });
    await modulesQuery.refetch();
  };

  const openAdd = () => {
    setEditing(null);
    setName('');
    setType('qr');
    setQrConfig(DEFAULT_QR_CONFIG);
    setShortcutConfig(DEFAULT_SHORTCUT_CONFIG);
    setApiConfig(DEFAULT_API_CONFIG);
    setRawConfig('{}');
    setApiTestResult(null);
    setError(null);
    setSuccessMessage(null);
    setModalOpen(true);
  };

  const openEdit = (module: ToolModule) => {
    setEditing(module);
    setName(module.name);
    setType(module.type);
    setQrConfig(normalizeQrConfig(module.config));
    setShortcutConfig(normalizeShortcutConfig(module.config, module.name));
    setApiConfig(normalizeApiConfig(module.config));
    setRawConfig(JSON.stringify(module.config || {}, null, 2));
    setApiTestResult(null);
    setError(null);
    setSuccessMessage(null);
    setModalOpen(true);
  };

  const selectedConfig = (): Record<string, unknown> => {
    if (type === 'qr') return { defaultText: qrConfig.defaultText || '', history: qrConfig.history || [] };
    if (type === 'shortcut') return {
      label: shortcutConfig.label,
      url: shortcutConfig.url,
      newTab: shortcutConfig.newTab !== false,
      method: shortcutConfig.method === 'POST' ? 'POST' : 'GET',
    };
    if (type === 'api') return {
      endpoint: apiConfig.endpoint,
      method: apiConfig.method === 'POST' ? 'POST' : 'GET',
      refreshInterval: apiConfig.refreshInterval,
      display: apiConfig.display || 'raw',
    };
    return JSON.parse(rawConfig || '{}') as Record<string, unknown>;
  };

  const runApiConfigTest = async () => {
    if (!apiConfig.endpoint.trim()) {
      setApiTestResult('Endpoint is required.');
      return;
    }
    setApiTestResult('Testing endpoint...');
    try {
      const result = await toolsService.fetchProxy(apiConfig.endpoint, apiConfig.method === 'POST' ? 'POST' : 'GET');
      setApiTestResult(`Success: upstream status ${result.status}`);
    } catch (testError) {
      setApiTestResult(testError instanceof Error ? testError.message : 'Endpoint test failed');
    }
  };

  return (
    <div className="w-full max-w-full space-y-5 overflow-x-hidden">
      <SectionHeader
        eyebrow="Module"
        title="Tools"
        description="Utility modules for daily workflows."
        actions={<Badge variant="info">Mobile First</Badge>}
      />

      <div className="flex justify-end">
        <Button variant="outline" onClick={openAdd}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Tool Module
        </Button>
      </div>

      {modulesQuery.isLoading ? <p className="text-sm text-slate-400">Loading tool modules...</p> : null}
      {modulesQuery.error instanceof Error ? <p className="text-sm text-rose-300">{modulesQuery.error.message}</p> : null}
      {successMessage ? <p className="text-sm text-emerald-300">{successMessage}</p> : null}

      <div className="overflow-x-auto pb-1">
        <div className="inline-flex min-w-full gap-2 sm:min-w-0">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategory(tab.id)}
              className={`rounded-full border px-3 py-2 text-xs transition-all ${
                activeCategory === tab.id
                  ? 'border-cyan-300/40 bg-cyan-500/15 text-cyan-100 shadow-[0_0_18px_rgba(6,182,212,0.18)]'
                  : 'border-white/10 bg-zinc-900/40 text-slate-300 hover:border-white/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {utilityModules.map((module) => (
          <div key={module.id} className="rounded-2xl border border-white/10 bg-zinc-900/40 p-2">
            <div className="mb-2 flex items-center justify-between gap-2 px-2">
              <div className="inline-flex items-center gap-2 text-sm text-slate-200">
                {module.type === 'qr' ? <QrCode className="h-4 w-4 text-cyan-300" /> : null}
                {module.type === 'api' ? <Server className="h-4 w-4 text-cyan-300" /> : null}
                {module.type === 'api_tester' ? <Server className="h-4 w-4 text-cyan-300" /> : null}
                {module.type !== 'qr' && module.type !== 'api' && module.type !== 'api_tester' ? <Wrench className="h-4 w-4 text-cyan-300" /> : null}
                <span>{module.name}</span>
                <span className="rounded-full border border-white/10 bg-zinc-950/80 px-2 py-0.5 text-[11px] text-slate-400">
                  used {getUsageCount(module)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="rounded-lg border border-white/10 p-1.5 text-slate-300 hover:text-cyan-200"
                  onClick={() => openEdit(module)}
                  aria-label={`Edit ${module.name}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  className="rounded-lg border border-white/10 p-1.5 text-slate-300 hover:text-rose-200"
                  onClick={() => {
                    if (!window.confirm(`Remove ${module.name}?`)) return;
                    deleteMutation.mutate(module.id);
                  }}
                  aria-label={`Delete ${module.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <ModuleRenderer module={module} onSaveConfig={persistModuleConfig} onUse={markModuleUsed} />
          </div>
        ))}
      </div>

      {!modulesQuery.isLoading && !utilityModules.length ? (
        <Card>
          <p className="text-sm text-slate-400">No utility modules yet. Add QR, Shortcut, or API modules.</p>
        </Card>
      ) : null}

      <Modal title={editing ? 'Edit Tool Module' : 'Add Tool Module'} open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="space-y-3">
          <label className="block text-xs uppercase tracking-wide text-slate-400">
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
            />
          </label>

          <label className="block text-xs uppercase tracking-wide text-slate-400">
            Type
            <select
              value={type}
              onChange={(event) => setType(event.target.value as ToolModuleType)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
            >
              <option value="qr">qr</option>
              <option value="shortcut">shortcut</option>
              <option value="api">api</option>
              <option value="api_tester">api_tester</option>
            </select>
          </label>

          {type === 'qr' ? (
            <label className="block text-xs uppercase tracking-wide text-slate-400">
              Default Text
              <input
                value={qrConfig.defaultText || ''}
                onChange={(event) => setQrConfig((prev) => ({ ...prev, defaultText: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
              />
            </label>
          ) : null}

          {type === 'shortcut' ? (
            <div className="space-y-3">
              <label className="block text-xs uppercase tracking-wide text-slate-400">
                Label
                <input
                  value={shortcutConfig.label}
                  onChange={(event) => setShortcutConfig((prev) => ({ ...prev, label: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
                />
              </label>

              <label className="block text-xs uppercase tracking-wide text-slate-400">
                URL
                <input
                  value={shortcutConfig.url}
                  onChange={(event) => setShortcutConfig((prev) => ({ ...prev, url: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
                />
              </label>

              <label className="block text-xs uppercase tracking-wide text-slate-400">
                Method
                <select
                  value={shortcutConfig.method || 'GET'}
                  onChange={(event) => setShortcutConfig((prev) => ({ ...prev, method: event.target.value as 'GET' | 'POST' }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={shortcutConfig.newTab !== false}
                  onChange={(event) => setShortcutConfig((prev) => ({ ...prev, newTab: event.target.checked }))}
                  className="h-4 w-4 rounded border-white/20 bg-zinc-900"
                />
                Open GET links in new tab
              </label>
            </div>
          ) : null}

          {type === 'api' ? (
            <div className="space-y-3">
              <label className="block text-xs uppercase tracking-wide text-slate-400">
                Endpoint URL
                <input
                  value={apiConfig.endpoint}
                  onChange={(event) => setApiConfig((prev) => ({ ...prev, endpoint: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
                />
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs uppercase tracking-wide text-slate-400">
                  Method
                  <select
                    value={apiConfig.method || 'GET'}
                    onChange={(event) => setApiConfig((prev) => ({ ...prev, method: event.target.value as 'GET' | 'POST' }))}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                  </select>
                </label>

                <label className="block text-xs uppercase tracking-wide text-slate-400">
                  Display
                  <select
                    value={apiConfig.display || 'raw'}
                    onChange={(event) => setApiConfig((prev) => ({ ...prev, display: event.target.value as 'table' | 'card' | 'raw' }))}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
                  >
                    <option value="table">table</option>
                    <option value="card">card</option>
                    <option value="raw">raw</option>
                  </select>
                </label>
              </div>

              <label className="block text-xs uppercase tracking-wide text-slate-400">
                Refresh Interval (seconds, optional)
                <input
                  type="number"
                  min={0}
                  value={apiConfig.refreshInterval || ''}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setApiConfig((prev) => ({ ...prev, refreshInterval: Number.isFinite(value) && value > 0 ? value : undefined }));
                  }}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
                />
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={() => void runApiConfigTest()}>Test Endpoint</Button>
                {apiTestResult ? <p className="text-xs text-slate-300">{apiTestResult}</p> : null}
              </div>
            </div>
          ) : null}

          {type !== 'qr' && type !== 'shortcut' && type !== 'api' ? (
            <label className="block text-xs uppercase tracking-wide text-slate-400">
              Legacy Config (JSON)
              <textarea
                value={rawConfig}
                onChange={(event) => setRawConfig(event.target.value)}
                rows={8}
                className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 font-mono text-xs text-white outline-none focus:border-cyan-300/40"
              />
            </label>
          ) : null}

          {error ? <p className="rounded-lg border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={createMutation.isPending || updateMutation.isPending}
              onClick={() => {
                if (!name.trim()) {
                  setError('Name is required');
                  return;
                }

                try {
                  const payload = { name: name.trim(), type, config: selectedConfig() };
                  setError(null);
                  if (editing) {
                    updateMutation.mutate({ id: editing.id, payload });
                    return;
                  }
                  createMutation.mutate(payload);
                } catch {
                  setError('Config is invalid');
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
