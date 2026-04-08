import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createProject, getProjects, updateProject } from '../../../services/api';
import type { Project, ProjectStatus } from '../../../types';

export function useProjects() {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    data: projectPayload,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
    refetchInterval: 10_000,
  });

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async () => {
      setSuccessMessage('Project created');
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Project> }) => updateProject(id, updates),
    onSuccess: async () => {
      setSuccessMessage('Project updated');
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const updateStatus = useCallback((id: string, status: ProjectStatus) => {
    return updateMutation.mutateAsync({
      id,
      updates: {
        status,
        updatedAt: new Date().toISOString(),
      },
    });
  }, [updateMutation]);

  const projects = projectPayload?.data || [];
  const lastUpdated = projectPayload?.lastUpdated || '';
  const error = queryError instanceof Error ? queryError.message : null;
  const isMutating = createMutation.isPending || updateMutation.isPending;
  const refresh = useCallback(async () => {
    console.log('Refreshing...');
    await refetch();
  }, [refetch]);

  const createProjectWrapped = useCallback(async (project: Project) => {
    return createMutation.mutateAsync(project);
  }, [createMutation]);

  return {
    projects,
    loading,
    isMutating,
    error,
    successMessage,
    lastUpdated,
    refresh,
    createProject: createProjectWrapped,
    addProject: createProjectWrapped,
    updateStatus,
  };
}
