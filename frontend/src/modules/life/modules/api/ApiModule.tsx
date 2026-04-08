import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toolsService } from '../../services/toolsService';
import { Button } from '../../components/ui';
import type { ApiModuleConfig } from '../tools/types';

interface ApiModuleProps {
  moduleId: string;
  title: string;
  config: ApiModuleConfig;
  onUse?: () => void;
}

interface ApiState {
  status: number | null;
  data: unknown;
  contentType?: string;
}

function formatUnknown(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function renderCardData(data: unknown) {
  if (Array.isArray(data)) {
    return (
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="rounded-lg border border-white/10 bg-zinc-950/60 p-2">
            <pre className="whitespace-pre-wrap break-words text-xs text-slate-200">{formatUnknown(item)}</pre>
          </div>
        ))}
      </div>
    );
  }
  if (data && typeof data === 'object') {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {Object.entries(data as Record<string, unknown>).map(([key, value]) => (
          <div key={key} className="rounded-lg border border-white/10 bg-zinc-950/60 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">{key}</p>
            <p className="mt-1 break-words text-sm text-slate-200">{typeof value === 'string' ? value : formatUnknown(value)}</p>
          </div>
        ))}
      </div>
    );
  }
  return <p className="text-sm text-slate-300">{formatUnknown(data)}</p>;
}

function renderTableData(data: unknown) {
  if (!data || typeof data !== 'object') {
    return <p className="text-sm text-slate-300">{formatUnknown(data)}</p>;
  }
  const entries: Array<[string, unknown]> = Array.isArray(data)
    ? data.map((value, index) => [String(index), value] as [string, unknown])
    : Object.entries(data as Record<string, unknown>);
  return (
    <div className="rounded-lg border border-white/10">
      {Array.from(entries).map(([key, value]) => (
        <div key={String(key)} className="grid grid-cols-[minmax(80px,120px)_1fr] gap-2 border-b border-white/10 p-2 last:border-b-0">
          <p className="break-words text-xs font-medium text-slate-400">{String(key)}</p>
          <p className="break-words text-xs text-slate-200">{typeof value === 'string' ? value : formatUnknown(value)}</p>
        </div>
      ))}
    </div>
  );
}

export default function ApiModule({ moduleId, title, config, onUse }: ApiModuleProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<ApiState | null>(null);
  const onUseRef = useRef(onUse);

  const endpoint = (config.endpoint || '').trim();
  const method = config.method === 'POST' ? 'POST' : 'GET';
  const display = config.display || 'raw';
  const intervalSec = Number(config.refreshInterval);
  const refreshMs = Number.isFinite(intervalSec) && intervalSec >= 3 ? intervalSec * 1000 : 0;
  const cacheKey = useMemo(() => `api-module-cache:${moduleId}`, [moduleId]);

  useEffect(() => {
    onUseRef.current = onUse;
  }, [onUse]);

  const runFetch = useCallback(async (trackUsage = false) => {
    if (!endpoint) {
      setError('Endpoint is required.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await toolsService.fetchProxy(endpoint, method);
      const nextState = { status: result.status, data: result.data, contentType: result.contentType };
      setState(nextState);
      localStorage.setItem(cacheKey, JSON.stringify(nextState));
      if (trackUsage) onUseRef.current?.();
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch endpoint');
    } finally {
      setLoading(false);
    }
  }, [cacheKey, endpoint, method]);

  useEffect(() => {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return;
    try {
      const parsed = JSON.parse(cached) as ApiState;
      setState(parsed);
    } catch {
      // Ignore cache parse failures.
    }
  }, [cacheKey]);

  useEffect(() => {
    void runFetch(false);
  }, [endpoint, method, runFetch]);

  useEffect(() => {
    if (!refreshMs) return undefined;
    const timer = window.setInterval(() => {
      void runFetch(false);
    }, refreshMs);
    return () => window.clearInterval(timer);
  }, [refreshMs, runFetch]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-300">{title}</p>
        <Button variant="outline" onClick={() => void runFetch(true)} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      <div className="rounded-lg border border-white/10 bg-zinc-950/50 p-3">
        <p className="text-xs text-slate-400">
          {method} {endpoint || '(missing endpoint)'}
          {state?.status ? ` • status ${state.status}` : ''}
        </p>
        {error ? <p className="mt-1 text-xs text-rose-300">{error}</p> : null}
      </div>

      {display === 'table' ? renderTableData(state?.data) : null}
      {display === 'card' ? renderCardData(state?.data) : null}
      {display === 'raw' ? (
        <pre className="max-h-[28rem] overflow-auto rounded-lg border border-white/10 bg-zinc-950/70 p-3 text-xs text-slate-200">
          {formatUnknown(state?.data)}
        </pre>
      ) : null}
    </div>
  );
}
