import { useState, type FormEvent } from 'react'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend } from 'chart.js'
import { Chart } from 'react-chartjs-2'

import './App.css'
import {
  formatCurrency,
  projectSavings,
  type ExtraIncome,
  type Frequency,
  type MonthlyIncome,
  type ProjectionMonth,
  type RecurringExpense,
  type SavingsPlanInput,
  type OneTimeExpense,
} from './lib/finance'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend)

interface YearSummary {
  year: string
  income: number
  expenses: number
  closingSavings: number
}

const monthOptions = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
] as const

const frequencyOptions: Array<{ value: Frequency; label: string }> = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semiannual', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
]

const defaultPlan = createDefaultPlan()

function App() {
  const [draftPlan, setDraftPlan] = useState<SavingsPlanInput>(defaultPlan)
  const [submittedPlan, setSubmittedPlan] = useState<SavingsPlanInput | null>(null)

  const projection = submittedPlan ? projectSavings(submittedPlan) : null
  const yearSummaries = projection ? buildYearSummaries(projection.months) : []
  const lowestMonths = projection
    ? [...projection.months]
      .sort((left, right) => left.closingSavings - right.closingSavings)
      .slice(0, 5)
    : []
  const nextYear = projection ? projection.months.slice(0, 12) : []
  const emergencyGap =
    projection && submittedPlan
      ? submittedPlan.initialSavings - projection.minimumEmergencySavings
      : 0

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmittedPlan(clonePlan(draftPlan))
  }

  const patchMonthlyIncome = (id: string, patch: Partial<MonthlyIncome>) => {
    setDraftPlan((current) => ({
      ...current,
      monthlyIncomes: current.monthlyIncomes.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry,
      ),
    }))
  }

  const patchExtraIncome = (id: string, patch: Partial<ExtraIncome>) => {
    setDraftPlan((current) => ({
      ...current,
      extraIncomes: current.extraIncomes.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry,
      ),
    }))
  }

  const patchRecurringExpense = (id: string, patch: Partial<RecurringExpense>) => {
    setDraftPlan((current) => ({
      ...current,
      recurringExpenses: current.recurringExpenses.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry,
      ),
    }))
  }

  const patchOneTimeExpense = (id: string, patch: Partial<OneTimeExpense>) => {
    setDraftPlan((current) => ({
      ...current,
      oneTimeExpenses: current.oneTimeExpenses.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry,
      ),
    }))
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Planificador de ahorros a cinco años</h1>
          <p>
            Define tus ingresos, pagas extra y compromisos futuros antes de calcular
            el saldo mes a mes y el colchón mínimo para aguantar ocho meses.
          </p>
        </div>
        <button className="primary-button" type="submit" form="planner-form">
          Calcular escenario
        </button>
      </header>

      <main className="workspace">
        <form id="planner-form" className="editor-column" onSubmit={handleSubmit}>
          <section className="panel">
            <div className="panel-heading">
              <h2>Punto de partida</h2>
              <p>El cálculo arranca en el mes que indiques y se proyecta durante 60 meses.</p>
            </div>

            <div className="two-column-grid">
              <label className="field">
                <span>Mes inicial</span>
                <input
                  type="month"
                  value={draftPlan.startMonth}
                  onChange={(event) =>
                    setDraftPlan((current) => ({
                      ...current,
                      startMonth: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="field">
                <span>Ahorro actual</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={draftPlan.initialSavings}
                  onChange={(event) =>
                    setDraftPlan((current) => ({
                      ...current,
                      initialSavings: toAmount(event.target.value),
                    }))
                  }
                />
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="section-header">
              <div className="panel-heading">
                <h2>Ingresos mensuales</h2>
                <p>Añade tantas fuentes recurrentes como necesites.</p>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={() =>
                  setDraftPlan((current) => ({
                    ...current,
                    monthlyIncomes: [...current.monthlyIncomes, createMonthlyIncome()],
                  }))
                }
              >
                Añadir ingreso
              </button>
            </div>

            <div className="entry-stack">
              {draftPlan.monthlyIncomes.map((entry) => (
                <div className="entry-grid income-grid" key={entry.id}>
                  <label className="field grow">
                    <span>Concepto</span>
                    <input
                      type="text"
                      value={entry.label}
                      onChange={(event) =>
                        patchMonthlyIncome(entry.id, { label: event.target.value })
                      }
                    />
                  </label>

                  <label className="field amount-field">
                    <span>Importe mensual</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={entry.amount}
                      onChange={(event) =>
                        patchMonthlyIncome(entry.id, {
                          amount: toAmount(event.target.value),
                        })
                      }
                    />
                  </label>

                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() =>
                      setDraftPlan((current) => ({
                        ...current,
                        monthlyIncomes: current.monthlyIncomes.filter(
                          (income) => income.id !== entry.id,
                        ),
                      }))
                    }
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-header">
              <div className="panel-heading">
                <h2>Pagas extra</h2>
                <p>Se repiten cada año en el mes elegido.</p>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={() =>
                  setDraftPlan((current) => ({
                    ...current,
                    extraIncomes: [...current.extraIncomes, createExtraIncome()],
                  }))
                }
              >
                Añadir paga
              </button>
            </div>

            <div className="entry-stack">
              {draftPlan.extraIncomes.map((entry) => (
                <div className="entry-grid extra-grid" key={entry.id}>
                  <label className="field grow">
                    <span>Concepto</span>
                    <input
                      type="text"
                      value={entry.label}
                      onChange={(event) =>
                        patchExtraIncome(entry.id, { label: event.target.value })
                      }
                    />
                  </label>

                  <label className="field amount-field">
                    <span>Importe</span>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={entry.amount}
                      onChange={(event) =>
                        patchExtraIncome(entry.id, { amount: toAmount(event.target.value) })
                      }
                    />
                  </label>

                  <label className="field select-field">
                    <span>Mes</span>
                    <select
                      value={entry.month}
                      onChange={(event) =>
                        patchExtraIncome(entry.id, {
                          month: Number(event.target.value),
                        })
                      }
                    >
                      {monthOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() =>
                      setDraftPlan((current) => ({
                        ...current,
                        extraIncomes: current.extraIncomes.filter(
                          (income) => income.id !== entry.id,
                        ),
                      }))
                    }
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-header">
              <div className="panel-heading">
                <h2>Gastos recurrentes</h2>
                <p>Puedes mezclar cuotas mensuales, trimestrales, semestrales o anuales.</p>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={() =>
                  setDraftPlan((current) => ({
                    ...current,
                    recurringExpenses: [
                      ...current.recurringExpenses,
                      createRecurringExpense(current.startMonth),
                    ],
                  }))
                }
              >
                Añadir gasto
              </button>
            </div>

            <div className="entry-stack">
              {draftPlan.recurringExpenses.map((entry) => (
                <div className="entry-grid recurring-grid" key={entry.id}>
                  <label className="field grow">
                    <span>Concepto</span>
                    <input
                      type="text"
                      value={entry.label}
                      onChange={(event) =>
                        patchRecurringExpense(entry.id, { label: event.target.value })
                      }
                    />
                  </label>

                  <label className="field amount-field">
                    <span>Importe</span>
                    <input
                      type="number"
                      min="0"
                      step=".50"
                      value={entry.amount}
                      onChange={(event) =>
                        patchRecurringExpense(entry.id, {
                          amount: toAmount(event.target.value),
                        })
                      }
                    />
                  </label>

                  <label className="field select-field">
                    <span>Frecuencia</span>
                    <select
                      value={entry.frequency}
                      onChange={(event) =>
                        patchRecurringExpense(entry.id, {
                          frequency: event.target.value as Frequency,
                        })
                      }
                    >
                      {frequencyOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Empieza</span>
                    <input
                      type="month"
                      value={entry.startMonth}
                      onChange={(event) =>
                        patchRecurringExpense(entry.id, {
                          startMonth: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Termina</span>
                    <input
                      type="month"
                      value={entry.endMonth ?? ''}
                      onChange={(event) =>
                        patchRecurringExpense(entry.id, {
                          endMonth: event.target.value || undefined,
                        })
                      }
                    />
                  </label>

                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() =>
                      setDraftPlan((current) => ({
                        ...current,
                        recurringExpenses: current.recurringExpenses.filter(
                          (expense) => expense.id !== entry.id,
                        ),
                      }))
                    }
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-header">
              <div className="panel-heading">
                <h2>Pagos puntuales</h2>
                <p>Úsalos para compras concretas, entradas o desembolsos únicos.</p>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={() =>
                  setDraftPlan((current) => ({
                    ...current,
                    oneTimeExpenses: [
                      ...current.oneTimeExpenses,
                      createOneTimeExpense(current.startMonth),
                    ],
                  }))
                }
              >
                Añadir pago
              </button>
            </div>

            <div className="entry-stack">
              {draftPlan.oneTimeExpenses.map((entry) => (
                <div className="entry-grid one-time-grid" key={entry.id}>
                  <label className="field grow">
                    <span>Concepto</span>
                    <input
                      type="text"
                      value={entry.label}
                      onChange={(event) =>
                        patchOneTimeExpense(entry.id, { label: event.target.value })
                      }
                    />
                  </label>

                  <label className="field amount-field">
                    <span>Importe</span>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={entry.amount}
                      onChange={(event) =>
                        patchOneTimeExpense(entry.id, { amount: toAmount(event.target.value) })
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Mes del pago</span>
                    <input
                      type="month"
                      value={entry.date}
                      onChange={(event) =>
                        patchOneTimeExpense(entry.id, { date: event.target.value })
                      }
                    />
                  </label>

                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() =>
                      setDraftPlan((current) => ({
                        ...current,
                        oneTimeExpenses: current.oneTimeExpenses.filter(
                          (expense) => expense.id !== entry.id,
                        ),
                      }))
                    }
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          </section>

          <div className="form-actions">
            <button className="primary-button" type="submit">
              Calcular escenario
            </button>
          </div>
        </form>

        <section className="results-column">
          {!projection && (
            <section className="panel placeholder-panel">
              <h2>Resultados pendientes</h2>
              <p>
                Ajusta primero tus ingresos y gastos, y después pulsa en
                <strong> Calcular escenario</strong> para ver la proyección completa.
              </p>
            </section>
          )}

          {projection && (
            <>
              <section className="summary-grid">
                <article className="summary-card highlighted">
                  <span className="summary-label">Saldo al cabo de cinco años</span>
                  <strong>{formatCurrency(projection.finalSavings)}</strong>
                  <p>
                    Balance acumulado tras {projection.months.length} meses desde{' '}
                    {projection.months[0].label}.
                  </p>
                </article>

                <article className="summary-card">
                  <span className="summary-label">Mes más delicado</span>
                  <strong>{formatCurrency(projection.lowestSavings)}</strong>
                  <p>El saldo más bajo aparece en {formatMonthLabel(projection.lowestSavingsMonth)}.</p>
                </article>

                <article className="summary-card">
                  <span className="summary-label">Gasto total previsto</span>
                  <strong>{formatCurrency(projection.totalExpenses)}</strong>
                  <p>
                    {formatCurrency(projection.totalOneTimeExpenses)} son pagos puntuales ya
                    planificados.
                  </p>
                </article>

                <article className="summary-card">
                  <span className="summary-label">Colchón para 8 meses</span>
                  <strong>{formatCurrency(projection.minimumEmergencySavings)}</strong>
                  <p className={emergencyGap >= 0 ? 'status-good' : 'status-alert'}>
                    {emergencyGap >= 0
                      ? `Tus ahorros iniciales cubren ese mínimo y sobran ${formatCurrency(emergencyGap)}.`
                      : `Te faltan ${formatCurrency(Math.abs(emergencyGap))} para cubrir ese mínimo.`}
                  </p>
                </article>
              </section>

              <section className="panel">
                <div className="section-header static">
                  <div className="panel-heading">
                    <h2>Evolución del saldo</h2>
                    <p>
                      Se muestra el cierre de cada mes, incluyendo las pagas extra y los gastos
                      puntuales en el momento en que ocurren.
                    </p>
                  </div>
                  <div className="chart-meta">
                    <span>Media mensual necesaria para el colchón: </span>
                    <strong>{formatCurrency(projection.emergencyMonthlyAverage)}</strong>
                  </div>
                </div>

                <SavingsChart months={projection.months} />
              </section>

              <section className="split-layout">
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Cierre por año</h2>
                    <p>Resumen anual para detectar si el plan mantiene tracción.</p>
                  </div>

                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Año</th>
                          <th>Ingresos</th>
                          <th>Gastos</th>
                          <th>Saldo al cierre</th>
                        </tr>
                      </thead>
                      <tbody>
                        {yearSummaries.map((year) => (
                          <tr key={year.year}>
                            <td>{year.year}</td>
                            <td>{formatCurrency(year.income)}</td>
                            <td>{formatCurrency(year.expenses)}</td>
                            <td>{formatCurrency(year.closingSavings)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="panel">
                  <div className="panel-heading">
                    <h2>Meses más exigentes</h2>
                    <p>Sirven para anticipar cuándo necesitarás más caja.</p>
                  </div>

                  <ul className="stress-list">
                    {lowestMonths.map((month) => (
                      <li key={month.monthId}>
                        <div>
                          <strong>{month.label}</strong>
                          <span>{formatCurrency(month.totalExpenses)} de salidas ese mes</span>
                        </div>
                        <strong className={month.closingSavings < 0 ? 'status-alert' : undefined}>
                          {formatCurrency(month.closingSavings)}
                        </strong>
                      </li>
                    ))}
                  </ul>
                </section>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <h2>Próximos 12 meses</h2>
                  <p>Detalle operativo del primer año de la proyección.</p>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Mes</th>
                        <th>Ingresos</th>
                        <th>Gastos</th>
                        <th>Neto</th>
                        <th>Saldo final</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nextYear.map((month) => (
                        <tr key={month.monthId}>
                          <td>{month.label}</td>
                          <td>{formatCurrency(month.totalIncome)}</td>
                          <td>{formatCurrency(month.totalExpenses)}</td>
                          <td className={month.net < 0 ? 'status-alert' : 'status-good'}>
                            {formatCurrency(month.net)}
                          </td>
                          <td>{formatCurrency(month.closingSavings)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </section>
      </main>
    </div>
  )
}

function SavingsChart({ months }: { months: ProjectionMonth[] }) {
  const labels = months.map((month) => formatMonthLabel(month.monthId))
  const values = months.map((month) => month.closingSavings)
  const netValues = months.map((month) => month.net)
  
  // Calculate nice grid lines
  const minimum = Math.min(...values, 0)
  const maximum = Math.max(...values, 0)
  const range = maximum - minimum || 1
  let interval = Math.pow(10, Math.floor(Math.log10(range)))
  if (range / interval < 3) interval /= 2
  if (range / interval < 3) interval /= 2.5
  
  const dataLine = {
    labels,
    datasets: [
      {
        label: 'Saldo',
        data: values,
        borderColor: 'rgb(195, 93, 33)',
        backgroundColor: 'rgba(195, 93, 33, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(195, 93, 33)',
      },
    ],
  }

  const dataBar = {
    labels,
    datasets: [
      {
        label: 'Resultado mensual',
        data: netValues,
        backgroundColor: netValues.map((val) => val >= 0 ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'),
        borderColor: netValues.map((val) => val >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)'),
        borderWidth: 1,
      },
    ],
  }

  const optionsLine = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return formatCurrency(context.parsed.y)
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        min: Math.floor(minimum / interval) * interval,
        max: Math.ceil(maximum / interval) * interval,
        ticks: {
          stepSize: interval,
          callback: function(value: any) {
            return formatCurrency(value)
          },
        },
        grid: {
          color: 'rgba(229, 229, 229, 0.6)',
          drawBorder: true,
        },
      },
      x: {
        grid: {
          color: 'rgba(229, 229, 229, 0.4)',
          drawBorder: true,
        },
        ticks: {
          maxTicksLimit: 7,
        },
      },
    },
  }

  const optionsBar = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return formatCurrency(context.parsed.y)
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value)
          },
        },
        grid: {
          color: 'rgba(229, 229, 229, 0.6)',
          drawBorder: true,
        },
      },
      x: {
        grid: {
          color: 'rgba(229, 229, 229, 0.4)',
          drawBorder: true,
        },
        ticks: {
          maxTicksLimit: 7,
        },
      },
    },
  }

  return (
    <>
      <div className="chart-frame" style={{ marginBottom: '2rem' }}>
        <Chart type="line" data={dataLine} options={optionsLine} />
      </div>
      <div className="chart-frame" style={{ height: '150px' }}>
        <Chart type="bar" data={dataBar} options={optionsBar} />
      </div>
    </>
  )
}

function buildYearSummaries(months: ProjectionMonth[]): YearSummary[] {
  const summaries: YearSummary[] = []

  for (let index = 0; index < months.length; index += 12) {
    const slice = months.slice(index, index + 12)
    const income = slice.reduce((total, month) => total + month.totalIncome, 0)
    const expenses = slice.reduce((total, month) => total + month.totalExpenses, 0)
    const closingSavings = slice[slice.length - 1]?.closingSavings ?? 0

    summaries.push({
      year: `Año ${Math.floor(index / 12) + 1}`,
      income,
      expenses,
      closingSavings,
    })
  }

  return summaries
}

function createDefaultPlan(): SavingsPlanInput {
  const startMonth = getCurrentMonthId()

  return {
    startMonth,
    initialSavings: 5000,
    projectionMonths: 60,
    monthlyIncomes: [
      { id: createId('income'), label: 'Nómina neta', amount: 1500 },
      { id: createId('income'), label: 'Alquiler de plaza', amount: 90 },
    ],
    extraIncomes: [
      { id: createId('extra'), label: 'Paga de verano', amount: 2000, month: 6 },
      { id: createId('extra'), label: 'Paga de navidad', amount: 2000, month: 12 },
    ],
    recurringExpenses: [
      {
        id: createId('expense'),
        label: 'Vivienda y suministros',
        amount: 600,
        frequency: 'monthly',
        startMonth,
      },
      {
        id: createId('expense'),
        label: 'Seguro del coche',
        amount: 500,
        frequency: 'annual',
        startMonth,
      },
      {
        id: createId('expense'),
        label: 'Mantenimiento y ocio',
        amount: 250,
        frequency: 'monthly',
        startMonth,
      },
    ],
    oneTimeExpenses: [
      {
        id: createId('payment'),
        label: 'Pago final del coche',
        amount: 6500,
        date: shiftMonth(startMonth, 2),
      },
    ],
  }
}

function createMonthlyIncome(): MonthlyIncome {
  return {
    id: createId('income'),
    label: '',
    amount: 0,
  }
}

function createExtraIncome(): ExtraIncome {
  return {
    id: createId('extra'),
    label: '',
    amount: 0,
    month: 1,
  }
}

function createRecurringExpense(startMonth: string): RecurringExpense {
  return {
    id: createId('expense'),
    label: '',
    amount: 0,
    frequency: 'monthly',
    startMonth,
  }
}

function createOneTimeExpense(monthId: string): OneTimeExpense {
  return {
    id: createId('payment'),
    label: '',
    amount: 0,
    date: monthId,
  }
}

function clonePlan(plan: SavingsPlanInput): SavingsPlanInput {
  return {
    ...plan,
    monthlyIncomes: [...plan.monthlyIncomes],
    extraIncomes: [...plan.extraIncomes],
    recurringExpenses: [...plan.recurringExpenses],
    oneTimeExpenses: [...plan.oneTimeExpenses],
  }
}

function createId(prefix: string): string {
  const randomPart =
    globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10)

  return `${prefix}-${randomPart}`
}

function getCurrentMonthId(): string {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
}

function shiftMonth(monthId: string, offset: number): string {
  const [year, month] = monthId.split('-').map(Number)
  const absoluteMonth = year * 12 + (month - 1) + offset
  const nextYear = Math.floor(absoluteMonth / 12)
  const nextMonth = (absoluteMonth % 12) + 1
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`
}

function toAmount(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0
}

function formatMonthLabel(monthId: string): string {
  const [year, month] = monthId.split('-').map(Number)
  return new Intl.DateTimeFormat('es-ES', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

export default App
