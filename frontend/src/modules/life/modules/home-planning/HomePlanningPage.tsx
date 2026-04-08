import { ResponsiveContainer, BarChart, CartesianGrid, Tooltip, XAxis, YAxis, Bar } from 'recharts';
import { Card } from '../../components/ui/Card';
import { ChartCard } from '../../components/charts/ChartCard';
import { calculateHomePlan } from '../../services/calculations/homeCalculator';
import { HomePlanForm } from './components/HomePlanForm';
import { ScenarioTable } from './components/ScenarioTable';
import { useHomePlanning } from './hooks/useHomePlanning';

export function HomePlanningPage() {
  const { input, scenarios, loading, error, updateInput } = useHomePlanning();

  if (loading || !input) {
    return <div className="text-sm text-slate-400">Loading home planning...</div>;
  }

  const result = calculateHomePlan(input);

  const breakdown = [
    { name: 'P&I', value: Math.round(result.principalAndInterest) },
    { name: 'Taxes', value: Math.round(result.taxesMonthly) },
    { name: 'Insurance', value: Math.round(result.insuranceMonthly) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Home Planning</p>
        <h2 className="section-title mt-2">Average time to buy a home, without lying to yourself</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><p className="text-sm text-slate-400">Upfront cash target</p><p className="mt-3 text-3xl font-semibold text-white">${Math.round(result.upfrontCashTarget).toLocaleString()}</p></Card>
        <Card><p className="text-sm text-slate-400">Remaining to goal</p><p className="mt-3 text-3xl font-semibold text-white">${Math.round(result.remainingToGoal).toLocaleString()}</p></Card>
        <Card><p className="text-sm text-slate-400">Months until ready</p><p className="mt-3 text-3xl font-semibold text-white">{result.monthsUntilReady}</p></Card>
        <Card><p className="text-sm text-slate-400">Affordability</p><p className="mt-3 text-3xl font-semibold text-white">{result.affordabilityStatus}</p></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <h3 className="text-lg font-semibold text-white">Planning inputs</h3>
          <p className="mt-1 text-sm text-slate-400">Changes are persisted to the backend so your planning data is shared and durable.</p>
          {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
          <div className="mt-6">
            <HomePlanForm input={input} onChange={updateInput} />
          </div>
        </Card>

        <ChartCard title="Estimated monthly payment" subtitle={`Front-end ratio: ${(result.frontEndRatio * 100).toFixed(1)}% of gross monthly income`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={breakdown}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="name" stroke="rgba(148,163,184,0.7)" />
              <YAxis stroke="rgba(148,163,184,0.7)" />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Goal progress</h3>
            <p className="mt-1 text-sm text-slate-400">Estimated purchase date: {result.estimatedPurchaseDate}</p>
          </div>
          <p className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300">{result.fundedPercent.toFixed(1)}% funded</p>
        </div>
        <div className="mt-5 h-4 rounded-full bg-white/10">
          <div className="h-4 rounded-full bg-gradient-to-r from-blue-500 to-violet-500" style={{ width: `${result.fundedPercent}%` }} />
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-white/5 p-4"><p className="text-sm text-slate-400">Down payment</p><p className="mt-2 text-xl font-semibold text-white">${Math.round(result.downPaymentRequired).toLocaleString()}</p></div>
          <div className="rounded-2xl bg-white/5 p-4"><p className="text-sm text-slate-400">Closing costs</p><p className="mt-2 text-xl font-semibold text-white">${Math.round(result.closingCostsEstimate).toLocaleString()}</p></div>
          <div className="rounded-2xl bg-white/5 p-4"><p className="text-sm text-slate-400">Total monthly payment</p><p className="mt-2 text-xl font-semibold text-white">${Math.round(result.totalMonthlyPayment).toLocaleString()}</p></div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-white">Scenario comparison</h3>
        <p className="mt-1 text-sm text-slate-400">Check how average timing shifts when your monthly savings pace changes.</p>
        <div className="mt-5">
          <ScenarioTable input={input} scenarios={scenarios} />
        </div>
      </Card>
    </div>
  );
}
