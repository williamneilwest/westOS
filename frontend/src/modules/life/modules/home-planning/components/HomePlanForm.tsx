import { Input } from '../../../components/ui/Input';
import type { HomePlanInput } from '../../../types';

interface HomePlanFormProps {
  input: HomePlanInput;
  onChange: (patch: Partial<HomePlanInput>) => void;
}

const numericFields: Array<{ key: keyof HomePlanInput; label: string; helper?: string }> = [
  { key: 'currentSavings', label: 'Current savings' },
  { key: 'monthlySavings', label: 'Monthly savings contribution' },
  { key: 'targetHomePrice', label: 'Target home price' },
  { key: 'downPaymentPercent', label: 'Target down payment %' },
  { key: 'interestRate', label: 'Estimated interest rate' },
  { key: 'monthlyIncome', label: 'Monthly income' },
  { key: 'monthlyExpenses', label: 'Monthly expenses' },
  { key: 'loanTermYears', label: 'Loan term (years)' },
  { key: 'propertyTaxRate', label: 'Property tax rate %', helper: 'Rough annual property tax percentage' },
  { key: 'insuranceMonthly', label: 'Insurance per month' },
];

export function HomePlanForm({ input, onChange }: HomePlanFormProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {numericFields.map((field) => (
        <Input
          key={field.key}
          type="number"
          label={field.label}
          helper={field.helper}
          value={input[field.key]}
          min="0"
          step="0.01"
          onChange={(event) =>
            onChange({ [field.key]: Number(event.target.value) } as Partial<HomePlanInput>)
          }
        />
      ))}
    </div>
  );
}
