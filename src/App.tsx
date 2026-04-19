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
import { translations, type Language } from './translations'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend)

interface YearSummary {
  year: string
  income: number
  expenses: number
  closingSavings: number
}

const getMonthOptions = (t: typeof translations['es']) => t.monthLabels.map((lbl, i) => ({ value: i + 1, label: lbl }))
const getFrequencyOptions = (t: typeof translations['es']): Array<{ value: Frequency; label: string }> => [
  { value: 'monthly', label: t.freqLabels.monthly },
  { value: 'quarterly', label: t.freqLabels.quarterly },
  { value: 'semiannual', label: t.freqLabels.semiannual },
  { value: 'annual', label: t.freqLabels.annual },
]

function App() {
  const [lang, setLang] = useState<Language>('es')
  const t = translations[lang]
  const monthOptions = getMonthOptions(t)
  const frequencyOptions = getFrequencyOptions(t)

  const [draftPlan, setDraftPlan] = useState<SavingsPlanInput>(() => createDefaultPlan(translations['es']))
  const [submittedPlan, setSubmittedPlan] = useState<SavingsPlanInput | null>(null)

  const projection = submittedPlan ? projectSavings(submittedPlan) : null
  const yearSummaries = projection ? buildYearSummaries(projection.months, lang) : []
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
          <h1>{t.appTitle}</h1>
          <p>{t.appDesc}</p>
        </div>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
            <span>{t.langSelector}</span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Language)}
              style={{ minHeight: '36px', padding: '6px 12px' }}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </label>
          <button className="primary-button" type="submit" form="planner-form">
            {t.calcBtn}
          </button>
        </div>
      </header>

      <main className="workspace">
        <form id="planner-form" className="editor-column" onSubmit={handleSubmit}>
          <section className="panel">
            <div className="panel-heading">
              <h2>{t.startHead}</h2>
              <p>{t.startDesc}</p>
            </div>

            <div className="two-column-grid">
              <label className="field">
                <span>{t.startMonth}</span>
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
                <span>{t.currentSavings}</span>
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
                <h2>{t.monthlyHead}</h2>
                <p>{t.monthlyDesc}</p>
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
                {t.addIncome}
              </button>
            </div>

            <div className="entry-stack">
              {draftPlan.monthlyIncomes.map((entry) => (
                <div className="entry-grid income-grid" key={entry.id}>
                  <label className="field grow">
                    <span>{t.concept}</span>
                    <input
                      type="text"
                      value={entry.label}
                      onChange={(event) =>
                        patchMonthlyIncome(entry.id, { label: event.target.value })
                      }
                    />
                  </label>

                  <label className="field amount-field">
                    <span>{t.monthlyAmount}</span>
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
                    {t.remove}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-header">
              <div className="panel-heading">
                <h2>{t.extraHead}</h2>
                <p>{t.extraDesc}</p>
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
                {t.addExtra}
              </button>
            </div>

            <div className="entry-stack">
              {draftPlan.extraIncomes.map((entry) => (
                <div className="entry-grid extra-grid" key={entry.id}>
                  <label className="field grow">
                    <span>{t.concept}</span>
                    <input
                      type="text"
                      value={entry.label}
                      onChange={(event) =>
                        patchExtraIncome(entry.id, { label: event.target.value })
                      }
                    />
                  </label>

                  <label className="field amount-field">
                    <span>{t.amount}</span>
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
                    <span>{t.month}</span>
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
                    {t.remove}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-header">
              <div className="panel-heading">
                <h2>{t.recurHead}</h2>
                <p>{t.recurDesc}</p>
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
                {t.addExpense}
              </button>
            </div>

            <div className="entry-stack">
              {draftPlan.recurringExpenses.map((entry) => (
                <div className="entry-grid recurring-grid" key={entry.id}>
                  <label className="field grow">
                    <span>{t.concept}</span>
                    <input
                      type="text"
                      value={entry.label}
                      onChange={(event) =>
                        patchRecurringExpense(entry.id, { label: event.target.value })
                      }
                    />
                  </label>

                  <label className="field amount-field">
                    <span>{t.amount}</span>
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
                    <span>{t.freq}</span>
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
                    <span>{t.starts}</span>
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
                    <span>{t.ends}</span>
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
                    {t.remove}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-header">
              <div className="panel-heading">
                <h2>{t.onetimeHead}</h2>
                <p>{t.onetimeDesc}</p>
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
                    <span>{t.concept}</span>
                    <input
                      type="text"
                      value={entry.label}
                      onChange={(event) =>
                        patchOneTimeExpense(entry.id, { label: event.target.value })
                      }
                    />
                  </label>

                  <label className="field amount-field">
                    <span>{t.amount}</span>
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
                    <span>{t.paymentMonth}</span>
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
                    {t.remove}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <div className="form-actions">
            <button className="primary-button" type="submit">
              {t.calcBtn}
            </button>
          </div>
        </form>

        <section className="results-column">
          {!projection && (
            <section className="panel placeholder-panel">
              <h2>{t.pendingHead}</h2>
              <p>
                {t.pendingDesc1}
                <strong>{t.pendingResultsCalc}</strong>{t.pendingDesc2}
              </p>
            </section>
          )}

          {projection && (
            <>
              <section className="summary-grid">
                <article className="summary-card highlighted">
                  <span className="summary-label">{t.balanceFive}</span>
                  <strong>{formatCurrency(projection.finalSavings)}</strong>
                  <p>
                    {t.balanceAcc1} {projection.months.length} {t.balanceAcc2}{' '}
                    {projection.months[0].label}.
                  </p>
                </article>

                <article className="summary-card">
                  <span className="summary-label">{t.lowestMonth}</span>
                  <strong>{formatCurrency(projection.lowestSavings)}</strong>
                  <p>{t.lowestMonthDesc} {formatMonthLabel(projection.lowestSavingsMonth, lang)}.</p>
                </article>

                <article className="summary-card">
                  <span className="summary-label">{t.totalExp}</span>
                  <strong>{formatCurrency(projection.totalExpenses)}</strong>
                  <p>
                    {formatCurrency(projection.totalOneTimeExpenses)} {t.totalExpDesc}
                  </p>
                </article>

                <article className="summary-card">
                  <span className="summary-label">{t.cushion}</span>
                  <strong>{formatCurrency(projection.minimumEmergencySavings)}</strong>
                  <p className={emergencyGap >= 0 ? 'status-good' : 'status-alert'}>
                    {emergencyGap >= 0
                      ? `${t.cushionGood} ${formatCurrency(emergencyGap)}.`
                      : `${t.cushionAlert1} ${formatCurrency(Math.abs(emergencyGap))} ${t.cushionAlert2}`}
                  </p>
                </article>
              </section>

              <section className="panel">
                <div className="section-header static">
                  <div className="panel-heading">
                    <h2>{t.chartHead}</h2>
                    <p>{t.chartDesc}</p>
                  </div>
                  <div className="chart-meta">
                    <span>{t.avgCushion} </span>
                    <strong>{formatCurrency(projection.emergencyMonthlyAverage)}</strong>
                  </div>
                </div>

                <SavingsChart months={projection.months} lang={lang} />
              </section>

              <section className="split-layout">
                <section className="panel">
                  <div className="panel-heading">
                    <h2>{t.yearCloseHead}</h2>
                    <p>{t.yearCloseDesc}</p>
                  </div>

                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>{t.thYear}</th>
                          <th>{t.thIncome}</th>
                          <th>{t.thExp}</th>
                          <th>{t.thClose}</th>
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
                    <h2>{t.stressHead}</h2>
                    <p>{t.stressDesc}</p>
                  </div>

                  <ul className="stress-list">
                    {lowestMonths.map((month) => (
                      <li key={month.monthId}>
                        <div>
                          <strong>{month.label}</strong>
                          <span>{formatCurrency(month.totalExpenses)} {t.outflowsLabel}</span>
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
                  <h2>{t.next12Head}</h2>
                  <p>{t.next12Desc}</p>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{t.thMonth}</th>
                        <th>{t.thIncome}</th>
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

function SavingsChart({ months, lang }: { months: ProjectionMonth[], lang: Language }) {
  const t = translations[lang]
  const labels = months.map((month) => formatMonthLabel(month.monthId, lang))
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
        label: t.colChartBalance,
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
        label: t.colChartNet,
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
          label: function (context: any) {
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
          callback: function (value: any) {
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
          label: function (context: any) {
            return formatCurrency(context.parsed.y)
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value: any) {
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

function buildYearSummaries(months: ProjectionMonth[], lang: Language): YearSummary[] {
  const t = translations[lang]
  const summaries: YearSummary[] = []

  for (let index = 0; index < months.length; index += 12) {
    const slice = months.slice(index, index + 12)
    const income = slice.reduce((total, month) => total + month.totalIncome, 0)
    const expenses = slice.reduce((total, month) => total + month.totalExpenses, 0)
    const closingSavings = slice[slice.length - 1]?.closingSavings ?? 0

    summaries.push({
      year: `${t.thYear} ${Math.floor(index / 12) + 1}`,
      income,
      expenses,
      closingSavings,
    })
  }

  return summaries
}

function createDefaultPlan(t: typeof translations['es']): SavingsPlanInput {
  const startMonth = getCurrentMonthId()

  return {
    startMonth,
    initialSavings: 5000,
    projectionMonths: 60,
    monthlyIncomes: [
      { id: createId('income'), label: t.defIncomes[0], amount: 1500 },
      { id: createId('income'), label: t.defIncomes[1], amount: 90 },
    ],
    extraIncomes: [
      { id: createId('extra'), label: t.defExtras[0], amount: 2000, month: 6 },
      { id: createId('extra'), label: t.defExtras[1], amount: 2000, month: 12 },
    ],
    recurringExpenses: [
      {
        id: createId('expense'),
        label: t.defExpenses[0],
        amount: 600,
        frequency: 'monthly',
        startMonth,
      },
      {
        id: createId('expense'),
        label: t.defExpenses[1],
        amount: 500,
        frequency: 'annual',
        startMonth,
      },
      {
        id: createId('expense'),
        label: t.defExpenses[2],
        amount: 250,
        frequency: 'monthly',
        startMonth,
      },
    ],
    oneTimeExpenses: [
      {
        id: createId('payment'),
        label: t.defPayment,
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

function formatMonthLabel(monthId: string, lang: Language): string {
  const [year, month] = monthId.split('-').map(Number)
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-ES', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

export default App
