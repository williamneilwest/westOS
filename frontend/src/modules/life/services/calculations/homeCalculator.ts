import type { HomePlanInput, HomePlanResult } from '../../types';

function calculateMonthlyMortgage(principal: number, annualRate: number, termYears: number) {
  const monthlyRate = annualRate / 100 / 12;
  const months = termYears * 12;
  if (monthlyRate === 0) return principal / months;
  return (
    (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1)
  );
}

export function calculateHomePlan(input: HomePlanInput): HomePlanResult {
  const downPaymentRequired = input.targetHomePrice * (input.downPaymentPercent / 100);
  const closingCostsEstimate = input.targetHomePrice * 0.03;
  const upfrontCashTarget = downPaymentRequired + closingCostsEstimate;
  const remainingToGoal = Math.max(upfrontCashTarget - input.currentSavings, 0);
  const fundedPercent = Math.min((input.currentSavings / upfrontCashTarget) * 100, 100);
  const monthsUntilReady = input.monthlySavings > 0 ? Math.ceil(remainingToGoal / input.monthlySavings) : 0;

  const purchaseDate = new Date();
  purchaseDate.setMonth(purchaseDate.getMonth() + monthsUntilReady);

  const loanPrincipal = Math.max(input.targetHomePrice - downPaymentRequired, 0);
  const principalAndInterest = calculateMonthlyMortgage(loanPrincipal, input.interestRate, input.loanTermYears);
  const taxesMonthly = (input.targetHomePrice * (input.propertyTaxRate / 100)) / 12;
  const insuranceMonthly = input.insuranceMonthly;
  const totalMonthlyPayment = principalAndInterest + taxesMonthly + insuranceMonthly;
  const frontEndRatio = input.monthlyIncome > 0 ? totalMonthlyPayment / input.monthlyIncome : 0;

  let affordabilityStatus: HomePlanResult['affordabilityStatus'] = 'Healthy';
  if (frontEndRatio > 0.36) affordabilityStatus = 'Risky';
  else if (frontEndRatio > 0.28) affordabilityStatus = 'Tight';

  return {
    downPaymentRequired,
    closingCostsEstimate,
    upfrontCashTarget,
    fundedPercent,
    remainingToGoal,
    monthsUntilReady,
    estimatedPurchaseDate: purchaseDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
    }),
    principalAndInterest,
    taxesMonthly,
    insuranceMonthly,
    totalMonthlyPayment,
    frontEndRatio,
    affordabilityStatus,
  };
}
