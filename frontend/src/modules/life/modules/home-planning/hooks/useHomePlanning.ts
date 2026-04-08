import { useCallback, useEffect, useState } from 'react';
import { homePlanningService } from '../../../services/homePlanningService';
import type { HomePlanInput, HomePlanScenario } from '../../../types';

export function useHomePlanning() {
  const [input, setInput] = useState<HomePlanInput | null>(null);
  const [scenarios, setScenarios] = useState<HomePlanScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profile, scenarioData] = await Promise.all([homePlanningService.getProfile(), homePlanningService.getScenarios()]);
      setInput(profile);
      setScenarios(scenarioData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load home planning data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateInput = useCallback(async (patch: Partial<HomePlanInput>) => {
    setInput((prev) => {
      if (!prev) {
        return prev;
      }

      const next = { ...prev, ...patch };
      void homePlanningService.saveProfile(next).catch(() => {
        // keep optimistic value and allow user to continue editing
      });
      return next;
    });
  }, []);

  return {
    input,
    scenarios,
    loading,
    error,
    refresh: load,
    updateInput,
  };
}
