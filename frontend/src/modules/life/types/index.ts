export type ProjectStatus = 'New' | 'Backlog' | 'In Progress' | 'Blocked' | 'Complete';

export interface Project {
  id: string;
  name: string;
  description?: string;
  type?: 'custom' | 'example' | string;
  status: ProjectStatus;
  notes: string;
  link?: string;
  tags: string[];
  updatedAt: string;
}

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'completed';

export interface Task {
  id: string;
  title: string;
  description?: string;
  details?: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  completed: boolean;
  category?: string;
  dependsOn?: string[];
  autoCompleteRule?: string | null;
  notes?: string;
  projectId?: string;
}

export type GoalCadence = 'weekly' | 'monthly' | 'quarterly';

export interface PlanningItem {
  id: string;
  title: string;
  scenario?: string;
  notes?: string;
  cadence: GoalCadence;
  targetDate: string;
  progress: number;
}

export interface HomePlanInput {
  currentSavings: number;
  monthlySavings: number;
  targetHomePrice: number;
  downPaymentPercent: number;
  interestRate: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  loanTermYears: number;
  propertyTaxRate: number;
  insuranceMonthly: number;
}

export interface HomePlanScenario {
  label: string;
  multiplier: number;
}

export interface HomePlanResult {
  downPaymentRequired: number;
  closingCostsEstimate: number;
  upfrontCashTarget: number;
  fundedPercent: number;
  remainingToGoal: number;
  monthsUntilReady: number;
  estimatedPurchaseDate: string;
  principalAndInterest: number;
  taxesMonthly: number;
  insuranceMonthly: number;
  totalMonthlyPayment: number;
  frontEndRatio: number;
  affordabilityStatus: 'Healthy' | 'Tight' | 'Risky';
}

// Backward-compatible aliases used by existing module code.
export type ProjectItem = Project;
