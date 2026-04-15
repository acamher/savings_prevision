import { describe, expect, it } from 'vitest'

import { projectSavings } from './finance'

describe('projectSavings', () => {
  it('combina ingresos mensuales, pagas extra, pagos recurrentes y gastos puntuales', () => {
    const projection = projectSavings({
      startMonth: '2026-01',
      initialSavings: 5000,
      monthlyIncomes: [{ id: 'salary', label: 'Nómina', amount: 2000 }],
      extraIncomes: [
        { id: 'june', label: 'Paga de verano', amount: 2000, month: 6 },
        { id: 'december', label: 'Paga de navidad', amount: 2000, month: 12 },
      ],
      recurringExpenses: [
        {
          id: 'rent',
          label: 'Alquiler',
          amount: 900,
          frequency: 'monthly',
          startMonth: '2026-01',
        },
        {
          id: 'insurance',
          label: 'Seguro del coche',
          amount: 600,
          frequency: 'annual',
          startMonth: '2026-03',
        },
      ],
      oneTimeExpenses: [
        { id: 'deposit', label: 'Entrada del coche', amount: 3000, date: '2026-02' },
      ],
      projectionMonths: 12,
    })

    expect(projection.months[0]).toMatchObject({
      monthId: '2026-01',
      totalIncome: 2000,
      totalExpenses: 900,
      closingSavings: 6100,
    })

    expect(projection.months[1]).toMatchObject({
      monthId: '2026-02',
      totalIncome: 2000,
      totalExpenses: 3900,
      closingSavings: 4200,
    })

    expect(projection.months[2]).toMatchObject({
      monthId: '2026-03',
      recurringExpenses: 1500,
      closingSavings: 4700,
    })

    expect(projection.months[5]).toMatchObject({
      monthId: '2026-06',
      extraIncome: 2000,
      totalIncome: 4000,
    })

    expect(projection.finalSavings).toBe(18600)
    expect(projection.lowestSavings).toBe(4200)
    expect(projection.lowestSavingsMonth).toBe('2026-02')
    expect(projection.minimumEmergencySavings).toBe(7800)
    expect(projection.emergencyMonthlyAverage).toBe(975)
  })

  it('respeta frecuencias y fin de vigencia en gastos recurrentes', () => {
    const projection = projectSavings({
      startMonth: '2026-01',
      initialSavings: 0,
      monthlyIncomes: [],
      extraIncomes: [],
      recurringExpenses: [
        {
          id: 'course',
          label: 'Curso trimestral',
          amount: 150,
          frequency: 'quarterly',
          startMonth: '2026-02',
          endMonth: '2026-08',
        },
      ],
      oneTimeExpenses: [],
      projectionMonths: 9,
    })

    const chargedMonths = projection.months
      .filter((month) => month.recurringExpenses > 0)
      .map((month) => month.monthId)

    expect(chargedMonths).toEqual(['2026-02', '2026-05', '2026-08'])
    expect(projection.totalRecurringExpenses).toBe(450)
    expect(projection.finalSavings).toBe(-450)
    expect(projection.minimumEmergencySavings).toBe(450)
  })
})
