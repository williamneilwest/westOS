import { useState } from 'react';
import { Button, Input } from '../../../components/ui';
import type { TaskItem, TaskPriority } from '../types';

interface TaskFormProps {
  onSubmit: (task: TaskItem) => void;
}

export function TaskForm({ onSubmit }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [priority, setPriority] = useState<TaskPriority>('medium');

  return (
    <form
      className="grid gap-3 md:grid-cols-3"
      onSubmit={(event) => {
        event.preventDefault();

        onSubmit({
          id: crypto.randomUUID(),
          title,
          dueDate,
          priority,
          status: 'todo',
        });

        setTitle('');
        setPriority('medium');
      }}
    >
      <Input label="Task" value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="Capture next action" />
      <Input label="Due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required />
      <label className="flex flex-col gap-2 text-sm text-slate-200">
        <span className="font-medium">Priority</span>
        <select
          className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white"
          value={priority}
          onChange={(event) => setPriority(event.target.value as TaskPriority)}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </label>
      <div className="md:col-span-3 flex justify-end">
        <Button type="submit">Add Task</Button>
      </div>
    </form>
  );
}
