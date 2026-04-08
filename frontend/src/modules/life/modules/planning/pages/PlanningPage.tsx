import { Badge, Card, SectionHeader } from '../../../components/ui';
import { GoalsTable } from '../components/GoalsTable';
import { PlanningGoalForm } from '../components/PlanningGoalForm';
import { PlanningSummaryCard } from '../components/PlanningSummaryCard';
import { usePlanning } from '../hooks/usePlanning';

export function PlanningPage() {
  const { goals, overview, addGoal, updateProgress, loading, error, successMessage } = usePlanning();

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Module"
        title="Planning"
        description="Define goals by cadence and keep progress honest with frequent check-ins."
        actions={<Badge variant="info">Persistent</Badge>}
      />

      <PlanningSummaryCard overview={overview} />
      {loading ? <p className="text-sm text-slate-400">Loading planning data...</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {successMessage ? <p className="text-sm text-emerald-300">{successMessage}</p> : null}

      <Card>
        <h3 className="text-lg font-semibold text-white">Add Goal</h3>
        <div className="mt-4">
          <PlanningGoalForm
            onSubmit={(goal) => {
              void addGoal(goal);
            }}
          />
        </div>
      </Card>

      <GoalsTable goals={goals} onProgressChange={updateProgress} />
    </div>
  );
}
