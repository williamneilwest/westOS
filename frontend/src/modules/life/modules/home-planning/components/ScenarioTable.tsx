import { calculateHomePlan } from '../../../services/calculations/homeCalculator';
import type { HomePlanInput, HomePlanScenario } from '../../../types';

interface ScenarioTableProps {
  input: HomePlanInput;
  scenarios: HomePlanScenario[];
}

export function ScenarioTable({ input, scenarios }: ScenarioTableProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10">
      <table className="min-w-full divide-y divide-white/10 text-left">
        <thead className="bg-white/5 text-xs uppercase tracking-[0.2em] text-slate-400">
          <tr>
            <th className="px-4 py-3">Scenario</th>
            <th className="px-4 py-3">Monthly Save</th>
            <th className="px-4 py-3">Months</th>
            <th className="px-4 py-3">Purchase Target</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 bg-slate-950/30">
          {scenarios.map((scenario) => {
            const result = calculateHomePlan({ ...input, monthlySavings: input.monthlySavings * scenario.multiplier });
            return (
              <tr key={scenario.label}>
                <td className="px-4 py-4 font-medium text-white">{scenario.label}</td>
                <td className="px-4 py-4 text-slate-300">${Math.round(input.monthlySavings * scenario.multiplier).toLocaleString()}</td>
                <td className="px-4 py-4 text-slate-300">{result.monthsUntilReady}</td>
                <td className="px-4 py-4 text-slate-300">{result.estimatedPurchaseDate}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
