import { useState } from 'react';
import { Button, Input } from '../../../components/ui';
import type { GoalCadence, PlanningGoal } from '../types';

interface PlanningGoalFormProps {
  onSubmit: (goal: PlanningGoal) => void;
}

export function PlanningGoalForm({ onSubmit }: PlanningGoalFormProps) {
  const [title, setTitle] = useState('');
  const [cadence, setCadence] = useState<GoalCadence>('weekly');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().slice(0, 10));

  return (
    <form
      className="grid gap-3 md:grid-cols-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          id: crypto.randomUUID(),
          title,
          cadence,
          targetDate,
          progress: 0,
        });

        setTitle('');
        setCadence('weekly');
      }}
    >
      <Input label="Goal" value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="Define a target" />
      <label className="flex flex-col gap-2 text-sm text-slate-200">
        <span className="font-medium">Cadence</span>
        <select
          className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white"
          value={cadence}
          onChange={(event) => setCadence(event.target.value as GoalCadence)}
        >
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
        </select>
      </label>
      <Input label="Target Date" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} required />
      <div className="md:col-span-3 flex justify-end">
        <Button type="submit">Add Goal</Button>
      </div>
    </form>
  );
}
