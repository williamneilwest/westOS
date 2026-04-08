import type { Task, TaskPriority, TaskStatus } from '../../types';

export type { TaskPriority, TaskStatus };
export type TaskItem = Omit<Task, 'completed'>;

export interface TasksOverview {
  inbox: number;
  today: number;
  overdue: number;
  done: number;
}
