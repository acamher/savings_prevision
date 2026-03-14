import datetime
import json
from dateutil.relativedelta import relativedelta
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.gridspec import GridSpec 
import matplotlib.ticker as mtick

## -------- DATA --------
with open('data.json', 'r') as f:
    data = json.load(f)

year_begining = data['year_begining']
month_begining = data['month_begining']
year_end = data['year_end']
minimum_savings_months = data['minimum_savings_months']
salario_mensual = data['salario_mensual']
salario_extra = data['salario_extra']
ahorros = data['ahorros']

df_montly_payment = pd.DataFrame(data['monthly_payment'])
df_payments = pd.DataFrame(data['payments'])

df_montly_payment['Start'] = pd.to_datetime(df_montly_payment['Start'], dayfirst=True)
df_montly_payment['End'] = pd.to_datetime(df_montly_payment['End'], dayfirst=True)
df_payments['Date'] = pd.to_datetime(df_payments['Date'], dayfirst=True)

## -------------- Operations --------------
## Inicializo
total_gastos_mensuales = df_montly_payment["Quantity"].sum(axis=0)

Dates = np.arange(datetime.datetime(year_begining, month_begining, 1), datetime.datetime(year_end, 12, 1), np.timedelta64(1, 'M'), dtype='datetime64[M]').astype('datetime64[D]')
d = {"Date": Dates, "Ahorro GASTO": np.zeros((Dates.size)), "Ahorro NO_GASTO" : np.zeros((Dates.size)), "Balance" : np.zeros((Dates.size)), 'Minimo' : np.zeros((Dates.size))}
savings = pd.DataFrame(data=d)

def calculateIngress(datetime64):
    # Calculo ingreso del mes (SIN GASTOS)
    if((datetime64.month == 6) or (datetime64.month == 12)):
        ingreso = salario_mensual + salario_extra
    else:
        ingreso = salario_mensual
    return ingreso

def calculatePayments(datetime64):
    #initialize
    payments = 0
    # iterating to check regular payments
    for index, row2 in df_montly_payment.iterrows():
        if ((datetime64 >= pd.to_datetime(row2["Start"])) & (datetime64 <= pd.to_datetime(row2['End']))):
            payments += df_montly_payment.loc[index, 'Quantity']

    # iterating to check regular payments
    for index, row2 in df_payments.iterrows():
        if ((datetime64.year == pd.to_datetime(row2['Date']).year) & (datetime64.month == pd.to_datetime(row2['Date']).month)):
            payments += row2['Quantity']
    
    return payments

def calculateMinimumSavings(datetime64):
    expectedPayments = 0
    # Compute expected payments in the next months
    for month in np.arange(minimum_savings_months):
        expectedPayments += calculatePayments(datetime64 + relativedelta(months = month))
    
    return expectedPayments
    

# Initialize data
savings.loc[0, "Ahorro GASTO"] = ahorros
savings.loc[0, "Ahorro NO_GASTO"] = ahorros

# Iterate the data
for index, row in savings.iterrows():
    if index != 0:
        ingreso_del_mes = calculateIngress(pd.to_datetime(savings.loc[index, "Date"]))
        gastos_del_mes = calculatePayments(pd.to_datetime(savings.loc[index, "Date"]))
        savings.loc[index, "Ahorro GASTO"] = savings.loc[index -1, "Ahorro GASTO"] + ingreso_del_mes - gastos_del_mes
        savings.loc[index, "Ahorro NO_GASTO"] = savings.loc[index -1, "Ahorro NO_GASTO"] + ingreso_del_mes
        savings.loc[index, 'Balance'] = ingreso_del_mes - gastos_del_mes
        savings.loc[index, 'Minimo'] = calculateMinimumSavings(pd.to_datetime(savings.loc[index, "Date"]))

## --------- PLOTTING ---------
# Config
fig = plt.figure(figsize=(12, 8), dpi=200)
grid = plt.GridSpec(4, 4, hspace=0.15) # Reduced hspace for a tighter look
main_ax = fig.add_subplot(grid[:-1, :])
x_hist = fig.add_subplot(grid[-1, :], sharex=main_ax)

# --- Style Main Plot ---
main_ax.grid(axis='both', linestyle="--", linewidth=0.5, alpha=0.5)
main_ax.tick_params(axis='x', labelbottom=False)

# Currency Formatting
fmt = '{x:,.0f} €' # Using .0f for cleaner labels if cents aren't vital
tick = mtick.StrMethodFormatter(fmt)
main_ax.yaxis.set_major_formatter(tick)

main_ax.plot(savings['Date'], savings['Ahorro GASTO'], label='Ahorro', linewidth=2)
main_ax.plot(savings['Date'], savings['Ahorro NO_GASTO'], label='Teorico', linestyle = '--', linewidth=2)
main_ax.plot(savings['Date'], savings['Minimo'], label='Minimum', linestyle = ':', color = 'red', linewidth=1)
main_ax.legend(loc='upper left', frameon=True)

# --- Style Balance Plot (Bottom) ---
# Logic for color-coding: Green for positive, Red for negative
colors = ['#2ecc71' if x > 0 else '#e74c3c' for x in savings['Balance']]

x_hist.bar(savings['Date'], savings['Balance'], color=colors, edgecolor='white', linewidth=0.5, width=20)

# Add a horizontal baseline at 0 for clarity
x_hist.axhline(0, color='black', linewidth=0.8, alpha=0.7)

# Format the bottom Y-axis as currency too
x_hist.yaxis.set_major_formatter(tick)

# Add vertical grids to match the top plot
x_hist.grid(linestyle="--", linewidth=0.5, alpha=0.5)

# Clean up spines
for ax in [main_ax, x_hist]:
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)

# --- Add Trimester Vertical Lines ---
# Generate dates for the start of each quarter within your data range
start_date = savings['Date'].min()
end_date = savings['Date'].max()
trimesters = pd.date_range(start=start_date, end=end_date, freq='QS') # 'QS' = Quarter Start
years = pd.date_range(start=start_date, end=end_date, freq='YS') # 'YS' = Year Start

for ax in [main_ax, x_hist]:
    for date in trimesters:
        ax.axvline(date, color='gray', linestyle=':', linewidth=1, alpha=0.4, zorder=1)

for ax in [main_ax, x_hist]:
    for date in years:
        ax.axvline(date, color='gray', linestyle='-', linewidth=1, zorder=0)

# Finally
fig.savefig("savings.png", bbox_inches='tight')
plt.show()