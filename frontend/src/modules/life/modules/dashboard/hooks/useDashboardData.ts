import { useMemo } from 'react';
import { useHomelab } from '../../homelab/hooks/useHomelab';
import { usePlanning } from '../../planning/hooks/usePlanning';
import { useProjects } from '../../projects/hooks/useProjects';
import { useTasks } from '../../tasks/hooks/useTasks';
import type { DashboardData } from '../types';

export function useDashboardData(): DashboardData {
  const { projects } = useProjects();
  const { tasks } = useTasks();
  const { services: homelab } = useHomelab();
  const { goals } = usePlanning();

  return useMemo(
    () => ({
      projects,
      tasks,
      homelab,
      goals,
    }),
    [projects, tasks, homelab, goals],
  );
}
