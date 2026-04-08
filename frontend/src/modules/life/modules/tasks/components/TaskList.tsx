import { Badge, Card } from '../../../components/ui';
import type { TaskItem, TaskStatus } from '../types';

interface TaskListProps {
  tasks: TaskItem[];
  onStatusChange: (id: string, status: TaskStatus) => void;
}

function priorityVariant(priority: TaskItem['priority']) {
  if (priority === 'high') {
    return 'warning' as const;
  }
  if (priority === 'medium') {
    return 'info' as const;
  }
  return 'neutral' as const;
}

export function TaskList({ tasks, onStatusChange }: TaskListProps) {
  return (
    <Card>
      <h3 className="text-lg font-semibold text-white">Task Queue</h3>
      <div className="mt-4 space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">{task.title}</p>
                <p className="text-xs text-slate-400">Due: {task.dueDate}</p>
              </div>
              <Badge variant={priorityVariant(task.priority)}>{task.priority}</Badge>
            </div>
            <div className="mt-3">
              <select
                value={task.status}
                onChange={(event) => onStatusChange(task.id, event.target.value as TaskStatus)}
                className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white"
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
