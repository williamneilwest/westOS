import type { GoalCadence, PlanningItem } from '../../types';

export type { GoalCadence };
export type PlanningGoal = PlanningItem;

export interface PlanningOverview {
  weeklyGoals: number;
  monthlyGoals: number;
  quarterlyGoals: number;
  averageProgress: number;
}
