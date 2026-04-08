import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTask, getTasks, updateTask } from '../../../services/api';
import type { Task, TaskStatus } from '../../../types';
import type { TaskItem, TasksOverview } from '../types';

function toTaskItem(task: Task): TaskItem {
  const today = new Date().toISOString().slice(0, 10);
  const normalizedStatus = task.status === 'completed' ? 'done' : (task.status || 'todo');
  return {
    id: task.id,
    title: task.title,
    dueDate: task.dueDate || today,
    priority: task.priority || 'medium',
    status: normalizedStatus,
    notes: task.notes,
    projectId: task.projectId,
  };
}

function fromTaskItem(task: TaskItem): Task {
  return {
    ...task,
    completed: task.status === 'done',
  };
}

export function useTasks() {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    data: tasksPayload,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['tasks'],
    queryFn: getTasks,
    refetchInterval: 10_000,
  });

  const createMutation = useMutation({
    mutationFn: (task: TaskItem) => createTask(fromTaskItem(task)),
    onSuccess: async () => {
      setSuccessMessage('Task created');
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) => updateTask(id, updates),
    onSuccess: async () => {
      setSuccessMessage('Task updated');
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const tasks = useMemo(() => (tasksPayload?.data || []).map(toTaskItem), [tasksPayload?.data]);
  const lastUpdated = tasksPayload?.lastUpdated || '';
  const error = queryError instanceof Error ? queryError.message : null;

  const updateTaskStatus = useCallback((id: string, status: TaskStatus) => {
    return updateMutation.mutateAsync({
      id,
      updates: { status, completed: status === 'done' },
    });
  }, [updateMutation]);

  const overview = useMemo<TasksOverview>(() => {
    const today = new Date().toISOString().slice(0, 10);

    return {
      inbox: tasks.filter((task) => task.status !== 'done').length,
      today: tasks.filter((task) => task.dueDate === today && task.status !== 'done').length,
      overdue: tasks.filter((task) => task.dueDate < today && task.status !== 'done').length,
      done: tasks.filter((task) => task.status === 'done').length,
    };
  }, [tasks]);

  const createTaskWrapped = useCallback(async (task: TaskItem) => {
    const created = await createMutation.mutateAsync(task);
    return toTaskItem(created);
  }, [createMutation]);

  const refresh = useCallback(async () => {
    console.log('Refreshing...');
    await refetch();
  }, [refetch]);

  return {
    tasks,
    overview,
    loading,
    isMutating: createMutation.isPending || updateMutation.isPending,
    error,
    successMessage,
    lastUpdated,
    refresh,
    createTask: createTaskWrapped,
    addTask: createTaskWrapped,
    updateTaskStatus,
  };
}
