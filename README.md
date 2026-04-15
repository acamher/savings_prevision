# Planificador de ahorros

Aplicación en React + TypeScript para proyectar tus ahorros durante los próximos cinco años.

## Qué permite hacer

- Definir el mes inicial y el ahorro actual.
- Añadir varios ingresos mensuales recurrentes.
- Configurar dos pagas extra con importe y mes de cobro.
- Registrar gastos recurrentes con frecuencia mensual, trimestral, semestral o anual.
- Añadir pagos puntuales como la entrada de un coche.
- Ver una proyección mensual a 60 meses, un resumen por bloques anuales y el colchón mínimo recomendado para aguantar 8 meses.

## Reglas del cálculo

- Las pagas extra se repiten cada año en el mes configurado.
- Los gastos recurrentes se cargan solo cuando toca según su frecuencia y su rango de vigencia.
- El colchón de 8 meses se calcula sumando los gastos recurrentes previstos durante los ocho primeros meses del escenario.
- Los pagos puntuales aparecen solo en el mes elegido y afectan al saldo de ese momento.

## Scripts

```bash
npm install
npm run dev
```

```bash
npm test
npm run lint
npm run build
```
