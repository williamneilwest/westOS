import type { PlanningGoal } from '../planning/types';
import type { ProjectItem } from '../../types';
import type { TaskItem } from '../tasks/types';
import type { HomelabServiceItem } from '../homelab/types';

export interface DashboardData {
  projects: ProjectItem[];
  tasks: TaskItem[];
  homelab: HomelabServiceItem[];
  goals: PlanningGoal[];
}
