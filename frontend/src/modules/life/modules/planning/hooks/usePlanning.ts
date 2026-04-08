import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPlanning, getPlanning, updatePlanning } from '../../../services/api';
import type { PlanningItem } from '../../../types';
import type { PlanningOverview } from '../types';

export function usePlanning() {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    data: planningPayload,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['planning'],
    queryFn: getPlanning,
    refetchInterval: 10_000,
  });

  const createMutation = useMutation({
    mutationFn: createPlanning,
    onSuccess: async () => {
      setSuccessMessage('Planning item created');
      await queryClient.invalidateQueries({ queryKey: ['planning'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PlanningItem> }) => updatePlanning(id, updates),
    onSuccess: async () => {
      setSuccessMessage('Planning item updated');
      await queryClient.invalidateQueries({ queryKey: ['planning'] });
    },
  });

  const goals = planningPayload?.data || [];
  const lastUpdated = planningPayload?.lastUpdated || '';
  const error = queryError instanceof Error ? queryError.message : null;

  const overview = useMemo<PlanningOverview>(() => {
    const safeGoalsCount = goals.length || 1;

    return {
      weeklyGoals: goals.filter((goal) => goal.cadence === 'weekly').length,
      monthlyGoals: goals.filter((goal) => goal.cadence === 'monthly').length,
      quarterlyGoals: goals.filter((goal) => goal.cadence === 'quarterly').length,
      averageProgress: Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / safeGoalsCount),
    };
  }, [goals]);

  const createGoal = useCallback(async (goal: PlanningItem) => {
    return createMutation.mutateAsync(goal);
  }, [createMutation]);

  const updateGoal = useCallback(async (id: string, updates: Partial<PlanningItem>) => {
    return updateMutation.mutateAsync({ id, updates });
  }, [updateMutation]);

  const refresh = useCallback(async () => {
    console.log('Refreshing...');
    await refetch();
  }, [refetch]);

  return {
    goals,
    overview,
    loading,
    isMutating: createMutation.isPending || updateMutation.isPending,
    error,
    successMessage,
    lastUpdated,
    refresh,
    createGoal,
    updateGoal,
    addGoal: createGoal,
    updateProgress: (id: string, progress: number) => updateGoal(id, { progress }),
  };
}
