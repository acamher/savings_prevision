export type Frequency = 'monthly' | 'quarterly' | 'semiannual' | 'annual'

export interface MonthlyIncome {
  id: string
  label: string
  amount: number
}

export interface ExtraIncome {
  id: string
  label: string
  amount: number
  month: number
}

export interface RecurringExpense {
  id: string
  label: string
  amount: number
  frequency: Frequency
  startMonth: string
  endMonth?: string
}

export interface OneTimeExpense {
  id: string
  label: string
  amount: number
  date: string
}

export interface SavingsPlanInput {
  startMonth: string
  initialSavings: number
  monthlyIncomes: MonthlyIncome[]
  extraIncomes: ExtraIncome[]
  recurringExpenses: RecurringExpense[]
  oneTimeExpenses: OneTimeExpense[]
  projectionMonths?: number
}

export interface ProjectionMonth {
  monthId: string
  label: string
  openingSavings: number
  monthlyIncome: number
  extraIncome: number
  totalIncome: number
  recurringExpenses: number
  oneTimeExpenses: number
  totalExpenses: number
  net: number
  closingSavings: number
}

export interface SavingsProjection {
  months: ProjectionMonth[]
  finalSavings: number
  lowestSavings: number
  lowestSavingsMonth: string
  totalIncome: number
  totalExpenses: number
  totalRecurringExpenses: number
  totalOneTimeExpenses: number
  minimumEmergencySavings: number
  emergencyMonthlyAverage: number
}

const PROJECTION_MONTHS = 60
const EMERGENCY_WINDOW_MONTHS = 8

const FREQUENCY_MONTHS: Record<Frequency, number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
}

const monthFormatter = new Intl.DateTimeFormat('es-ES', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

interface ParsedMonth {
  year: number
  month: number
}

export function projectSavings(plan: SavingsPlanInput): SavingsProjection {
  const projectionMonths = plan.projectionMonths ?? PROJECTION_MONTHS
  const normalizedPlan = normalizePlan(plan)
  const months: ProjectionMonth[] = []

  let runningSavings = normalizedPlan.initialSavings
  let lowestSavings = normalizedPlan.initialSavings
  let lowestSavingsMonth = normalizedPlan.startMonth
  let totalIncome = 0
  let totalRecurringExpenses = 0
  let totalOneTimeExpenses = 0

  for (let index = 0; index < projectionMonths; index += 1) {
    const monthId = addMonths(normalizedPlan.startMonth, index)
    const openingSavings = runningSavings
    const monthlyIncome = sumAmounts(normalizedPlan.monthlyIncomes)
    const extraIncome = sumAmounts(
      normalizedPlan.extraIncomes.filter((entry) => entry.month === getMonthNumber(monthId)),
    )
    const recurringExpenses = sumAmounts(
      normalizedPlan.recurringExpenses.filter((expense) =>
        occursOnMonth(expense.startMonth, expense.endMonth, expense.frequency, monthId),
      ),
    )
    const oneTimeExpenses = sumAmounts(
      normalizedPlan.oneTimeExpenses.filter((expense) => expense.date === monthId),
    )

    const totalMonthIncome = monthlyIncome + extraIncome
    const totalMonthExpenses = recurringExpenses + oneTimeExpenses
    const net = totalMonthIncome - totalMonthExpenses
    runningSavings += net

    totalIncome += totalMonthIncome
    totalRecurringExpenses += recurringExpenses
    totalOneTimeExpenses += oneTimeExpenses

    if (runningSavings < lowestSavings) {
      lowestSavings = runningSavings
      lowestSavingsMonth = monthId
    }

    months.push({
      monthId,
      label: formatMonthLabel(monthId),
      openingSavings,
      monthlyIncome,
      extraIncome,
      totalIncome: totalMonthIncome,
      recurringExpenses,
      oneTimeExpenses,
      totalExpenses: totalMonthExpenses,
      net,
      closingSavings: runningSavings,
    })
  }

  const minimumEmergencySavings = calculateEmergencySavings(
    normalizedPlan.recurringExpenses,
    normalizedPlan.startMonth,
    EMERGENCY_WINDOW_MONTHS,
  )

  return {
    months,
    finalSavings: runningSavings,
    lowestSavings,
    lowestSavingsMonth,
    totalIncome,
    totalExpenses: totalRecurringExpenses + totalOneTimeExpenses,
    totalRecurringExpenses,
    totalOneTimeExpenses,
    minimumEmergencySavings,
    emergencyMonthlyAverage: minimumEmergencySavings / EMERGENCY_WINDOW_MONTHS,
  }
}

export function addMonths(monthId: string, offset: number): string {
  const parsed = parseMonth(monthId)
  const absoluteMonth = parsed.year * 12 + (parsed.month - 1) + offset
  const year = Math.floor(absoluteMonth / 12)
  const month = (absoluteMonth % 12) + 1

  return stringifyMonth({ year, month })
}

export function formatCurrency(value: number, locale = 'es-ES', currency = 'EUR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function normalizePlan(plan: SavingsPlanInput): SavingsPlanInput {
  return {
    ...plan,
    initialSavings: sanitizeAmount(plan.initialSavings),
    monthlyIncomes: plan.monthlyIncomes.map((entry) => ({
      ...entry,
      amount: sanitizeAmount(entry.amount),
    })),
    extraIncomes: plan.extraIncomes.map((entry) => ({
      ...entry,
      amount: sanitizeAmount(entry.amount),
      month: clampMonth(entry.month),
    })),
    recurringExpenses: plan.recurringExpenses.map((entry) => ({
      ...entry,
      amount: sanitizeAmount(entry.amount),
    })),
    oneTimeExpenses: plan.oneTimeExpenses.map((entry) => ({
      ...entry,
      amount: sanitizeAmount(entry.amount),
    })),
  }
}

function calculateEmergencySavings(
  recurringExpenses: RecurringExpense[],
  startMonth: string,
  monthWindow: number,
): number {
  let total = 0

  for (let index = 0; index < monthWindow; index += 1) {
    const monthId = addMonths(startMonth, index)
    total += sumAmounts(
      recurringExpenses.filter((expense) =>
        occursOnMonth(expense.startMonth, expense.endMonth, expense.frequency, monthId),
      ),
    )
  }

  return total
}

function occursOnMonth(
  startMonth: string,
  endMonth: string | undefined,
  frequency: Frequency,
  monthId: string,
): boolean {
  if (compareMonths(monthId, startMonth) < 0) {
    return false
  }

  if (endMonth && compareMonths(monthId, endMonth) > 0) {
    return false
  }

  const distance = diffMonths(startMonth, monthId)
  return distance % FREQUENCY_MONTHS[frequency] === 0
}

function parseMonth(monthId: string): ParsedMonth {
  const match = /^(\d{4})-(\d{2})$/.exec(monthId)

  if (!match) {
    throw new Error(`Invalid month format: ${monthId}`)
  }

  const year = Number(match[1])
  const month = Number(match[2])

  if (month < 1 || month > 12) {
    throw new Error(`Invalid month number: ${monthId}`)
  }

  return { year, month }
}

function stringifyMonth(month: ParsedMonth): string {
  return `${month.year}-${String(month.month).padStart(2, '0')}`
}

function compareMonths(left: string, right: string): number {
  const leftMonth = parseMonth(left)
  const rightMonth = parseMonth(right)
  return leftMonth.year * 12 + leftMonth.month - (rightMonth.year * 12 + rightMonth.month)
}

function diffMonths(from: string, to: string): number {
  return compareMonths(to, from)
}

function clampMonth(value: number): number {
  if (value < 1) {
    return 1
  }

  if (value > 12) {
    return 12
  }

  return Math.trunc(value)
}

function sanitizeAmount(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.round(value))
}

function getMonthNumber(monthId: string): number {
  return parseMonth(monthId).month
}

function sumAmounts(entries: Array<{ amount: number }>): number {
  return entries.reduce((total, entry) => total + entry.amount, 0)
}

function formatMonthLabel(monthId: string): string {
  const parsed = parseMonth(monthId)
  return monthFormatter.format(new Date(Date.UTC(parsed.year, parsed.month - 1, 1)))
}
