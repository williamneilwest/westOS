import { useCallback, useEffect, useMemo, useState } from 'react';
import { toolsService } from '../../../services/toolsService';
import type { CommandSnippet, ToolLink, ToolsOverview } from '../types';

export function useTools() {
  const [links, setLinks] = useState<ToolLink[]>([]);
  const [snippets, setSnippets] = useState<CommandSnippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await toolsService.getAll();
      setLinks(data.links);
      setSnippets(data.snippets);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tools data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addLink = useCallback(async (link: ToolLink) => {
    const created = await toolsService.createLink(link);
    setLinks((prev) => [created, ...prev]);
  }, []);

  const overview = useMemo<ToolsOverview>(
    () => ({
      links: links.length,
      snippets: snippets.length,
    }),
    [links.length, snippets.length],
  );

  return {
    links,
    snippets,
    overview,
    loading,
    error,
    refresh: load,
    addLink,
  };
}
