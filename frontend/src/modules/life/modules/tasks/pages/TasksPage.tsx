import { Badge, Card, SectionHeader } from '../../../components/ui';
import { TaskForm } from '../components/TaskForm';
import { TaskList } from '../components/TaskList';
import { TasksSnapshotCard } from '../components/TasksSnapshotCard';
import { useTasks } from '../hooks/useTasks';

export function TasksPage() {
  const { tasks, overview, addTask, updateTaskStatus, loading, error, successMessage } = useTasks();

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Module"
        title="Tasks"
        description="Capture, schedule, and complete important work in a single queue."
        actions={<Badge variant="info">Persistent</Badge>}
      />

      <TasksSnapshotCard overview={overview} />
      {loading ? <p className="text-sm text-slate-400">Loading tasks...</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {successMessage ? <p className="text-sm text-emerald-300">{successMessage}</p> : null}

      <Card>
        <h3 className="text-lg font-semibold text-white">Capture Task</h3>
        <div className="mt-4">
          <TaskForm
            onSubmit={(task) => {
              void addTask(task);
            }}
          />
        </div>
      </Card>

      <TaskList tasks={tasks} onStatusChange={updateTaskStatus} />
    </div>
  );
}
