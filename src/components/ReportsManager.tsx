"use client";

import { useMemo, useState } from "react";
const MONTH_SHORT_ES = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];
import Link from "next/link";
import { Download, FileSpreadsheet, FileText, MoreHorizontal } from "lucide-react";
import { exportToCSV, exportToExcel, exportToPDF } from "@/utils/export";
import { formatCurrencyCOP } from "@/utils/formatters";

type Tx = {
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  merchant?: string;
};

type Investment = {
  name: string;
  investment_type: string;
  invested_amount: number;
  started_at: string | null;
  created_at?: string | null;
};

type Bill = {
  title: string;
  amount: number;
  due_date: string;
  status: string;
};

type Movement = {
  date: string;
  type: "income" | "expense";
  category: string;
  description: string;
  amount: number;
};

type Range = "3m" | "6m" | "12m";

type DonutSlice = {
  name: string;
  amount: number;
  percentage: number;
  color: string;
};

type DonutTooltip = {
  slice: DonutSlice;
  x: number;
  y: number;
};

// date filtering is handled by `dateWindow` below; keep this small helper if needed in future

function getSegmentColor(index: number, total: number) {
  const hue = Math.round((index * (360 / Math.max(total, 1))) % 360);
  return `hsl(${hue} 72% 52%)`;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  const x = cx + radius * Math.cos(angleRad);
  const y = cy + radius * Math.sin(angleRad);
  const round = (v: number) => Number(v.toFixed(3));
  return { x: round(x), y: round(y) };
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${Number(radius.toFixed(3))} ${Number(radius.toFixed(3))} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function lastMonths(referenceNow: Date, count: number) {
  const MONTHS = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];
  return Array.from({ length: count }, (_, idx) => {
    const d = new Date(referenceNow.getFullYear(), referenceNow.getMonth() - (count - 1 - idx), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = MONTHS[d.getMonth()];
    return { key, label };
  });
}

export default function ReportsManager({
  initialTransactions,
  initialInvestments,
  initialBills,
  todayISO,
}: {
  initialTransactions: Tx[];
  initialInvestments: Investment[];
  initialBills: Bill[];
  todayISO: string;
}) {
  const [range, setRange] = useState<Range>("6m");
  const [visibleRecentRows, setVisibleRecentRows] = useState(20);
  const [hoveredSlice, setHoveredSlice] = useState<DonutSlice | null>(null);
  const [tooltip, setTooltip] = useState<DonutTooltip | null>(null);
  const [barTooltip, setBarTooltip] = useState<{ label: string; amount: number; x: number; y: number } | null>(null);
  const referenceNow = useMemo(() => new Date(`${todayISO}T00:00:00`), [todayISO]);

  const allMovements = useMemo<Movement[]>(() => {
    const txRows: Movement[] = initialTransactions.map((tx) => ({
      date: tx.date,
      type: tx.type,
      category: tx.category || "General",
      description: tx.merchant || (tx.type === "income" ? "Ingreso registrado" : "Gasto registrado"),
      amount: Math.abs(Number(tx.amount) || 0),
    }));

    const investmentRows = initialInvestments
      .map((inv): Movement | null => {
        const date = inv.started_at || inv.created_at?.slice(0, 10);
        if (!date) return null;
        return {
          date,
          type: "expense" as const,
          category: inv.investment_type || "Inversiones",
          description: inv.name || "Inversión",
          amount: Math.abs(Number(inv.invested_amount) || 0),
        };
      })
      .filter((row): row is Movement => Boolean(row));

    const billRows: Movement[] = initialBills
      .filter((bill) => bill.status !== "Pagado")
      .map((bill) => ({
        date: bill.due_date,
        type: "expense" as const,
        category: "Facturas",
        description: bill.title || "Factura",
        amount: Math.abs(Number(bill.amount) || 0),
      }));

    return [...txRows, ...investmentRows, ...billRows];
  }, [initialTransactions, initialInvestments, initialBills]);

  const dateWindow = useMemo(() => {
    const end = new Date(`${todayISO}T23:59:59`);
    let start = new Date(end.getFullYear(), end.getMonth(), 1);

    if (range === "3m") start = new Date(end.getFullYear(), end.getMonth() - 2, 1);
    else if (range === "6m") start = new Date(end.getFullYear(), end.getMonth() - 5, 1);
    else if (range === "12m") start = new Date(end.getFullYear(), end.getMonth() - 11, 1);

    return { start, end };
  }, [range, todayISO]);

    const filtered = useMemo(() => {
    const { start, end } = dateWindow;
    return allMovements.filter((row) => {
      const d = new Date(`${row.date}T00:00:00`);
      if (Number.isNaN(d.getTime())) return false;
      return d >= start && d <= end;
    });
  }, [allMovements, dateWindow]);

  const totalIncome = filtered
    .filter((row) => row.type === "income")
    .reduce((sum, row) => sum + row.amount, 0);
  const totalExpense = filtered
    .filter((row) => row.type === "expense")
    .reduce((sum, row) => sum + row.amount, 0);

  const monthMap = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();

    filtered.forEach((row) => {
      const d = new Date(`${row.date}T00:00:00`);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, { income: 0, expense: 0 });
      const item = map.get(key)!;
      if (row.type === "income") item.income += row.amount;
      if (row.type === "expense") item.expense += row.amount;
    });

    return map;
  }, [filtered]);
  // Build monthSeries based on the computed date window (start..end)
  const monthSeries = useMemo(() => {
    const { start, end } = dateWindow;
    // compute number of months between start and end inclusive
    const months = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1);
    const items: { key: string; label: string; income: number; expense: number }[] = [];

    for (let i = 0; i < months; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = MONTH_SHORT_ES[d.getMonth()];
      const values = monthMap.get(key) || { income: 0, expense: 0 };
      items.push({ key, label, income: values.income, expense: values.expense });
    }

    return items;
  }, [monthMap, dateWindow]);

  const monthlyExpenses = monthSeries.map((row) => ({ label: row.label, value: row.expense }));
  const maxMonthlyExpense = Math.max(1, ...monthlyExpenses.map((row) => row.value));
  const maxComparisonValue = Math.max(1, ...monthSeries.flatMap((row) => [row.income, row.expense]));

  const categoryDistribution = useMemo(() => {
    const byCategory = new Map<string, number>();
    filtered.forEach((row) => {
      if (row.type !== "expense") return;
      byCategory.set(row.category, (byCategory.get(row.category) || 0) + row.amount);
    });

    const total = Array.from(byCategory.values()).reduce((sum, value) => sum + value, 0);
    const ordered: DonutSlice[] = Array.from(byCategory.entries())
      .map(([name, amount], index) => ({
        name,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
        color: getSegmentColor(index, byCategory.size),
      }))
      .sort((a, b) => b.amount - a.amount);

    return { ordered, total };
  }, [filtered]);

  const categoryTotalLabel = useMemo(() => formatCurrencyCOP(categoryDistribution.total), [categoryDistribution.total]);

  const recentRows = [...filtered]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((row) => {
      const dateValue = new Date(`${row.date}T00:00:00`);
      const isRecent = Math.ceil((referenceNow.getTime() - dateValue.getTime()) / (24 * 60 * 60 * 1000)) <= 7;
      const status = row.type === "income" ? "Completado" : isRecent ? "Pendiente" : "Completado";
      return {
        dateLabel: `${String(dateValue.getDate()).padStart(2, "0")} ${MONTH_SHORT_ES[dateValue.getMonth()]} ${dateValue.getFullYear()}`,
        category: row.category,
        description: row.description,
        amount: row.amount,
        type: row.type,
        status,
      };
    });

  const exportRows = filtered.map((row) => ({
    Fecha: (() => { const d = new Date(`${row.date}T00:00:00`); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}` })(),
    Tipo: row.type === "income" ? "Ingreso" : "Gasto",
    Categoria: row.category,
    Descripcion: row.description,
    Monto: Math.round(row.amount),
  }));

  const donutSize = 208;
  const donutStroke = 20;
  const donutRadius = donutSize / 2 - donutStroke / 2;
  let cursorAngle = 0;

  return (
    <>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">Informes y Analítica</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Visualiza tendencias, categorías y comparativas de tus finanzas.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => exportToCSV(exportRows, "informe.csv")} className="px-3 py-2 rounded-lg border text-sm font-bold flex items-center gap-2"><Download className="w-4 h-4" /> CSV</button>
            <button type="button" onClick={() => exportToExcel(exportRows, "informe.xlsx")} className="px-3 py-2 rounded-lg border text-sm font-bold flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" /> Excel</button>
            <button type="button" onClick={() => exportToPDF(exportRows, "informe.pdf", "Informe Financiero")} className="px-3 py-2 rounded-lg border text-sm font-bold flex items-center gap-2"><FileText className="w-4 h-4" /> PDF</button>
        </div>
      </header>

      <div className="flex flex-wrap gap-3 mb-6 overflow-x-auto pb-1">
        <button type="button" onClick={() => { setRange("3m"); setVisibleRecentRows(20); }} className={`h-11 px-5 rounded-xl border text-base font-bold ${range === "3m" ? "bg-primary/10 border-primary/30 text-primary" : "bg-white dark:bg-slate-900"}`}>Últimos 3 meses</button>
        <button type="button" onClick={() => { setRange("6m"); setVisibleRecentRows(20); }} className={`h-11 px-5 rounded-xl border text-base font-bold ${range === "6m" ? "bg-primary/10 border-primary/30 text-primary" : "bg-white dark:bg-slate-900"}`}>Últimos 6 meses</button>
        <button type="button" onClick={() => { setRange("12m"); setVisibleRecentRows(20); }} className={`h-11 px-5 rounded-xl border text-base font-bold ${range === "12m" ? "bg-primary/10 border-primary/30 text-primary" : "bg-white dark:bg-slate-900"}`}>Últimos 12 meses</button>
      </div>

      

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <section className="lg:col-span-2 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-black">Tendencia de Gastos Mensuales</h3>
            <MoreHorizontal className="w-5 h-5 text-slate-400" />
          </div>

          <div className="overflow-x-auto">
            <div className="h-72 min-w-[420px] grid grid-cols-6 items-end gap-3 border-b border-slate-200 dark:border-slate-800 pb-6">
              {monthlyExpenses.map((row) => (
                <div key={row.label} className="flex flex-col items-center gap-3 h-full justify-end">
                  <div
                    className="w-full rounded-t-md bg-rose-500"
                    style={{ height: `${(row.value / maxMonthlyExpense) * 100}%` }}
                    onMouseEnter={(e) => setBarTooltip({ label: `Gastos ${row.label}`, amount: row.value, x: e.clientX + 12, y: e.clientY - 12 })}
                    onMouseMove={(e) => setBarTooltip((prev) => prev ? { ...prev, x: e.clientX + 12, y: e.clientY - 12 } : { label: `Gastos ${row.label}`, amount: row.value, x: e.clientX + 12, y: e.clientY - 12 })}
                    onMouseLeave={() => setBarTooltip(null)}
                  />
                  <span className="text-sm font-semibold text-slate-500">{row.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border shadow-sm">
          <h3 className="text-2xl font-black mb-4">Distribución por Categoría</h3>
          <div className="flex items-center justify-center mb-5">
            <div className="relative w-[208px] h-[208px]">
              <svg width={donutSize} height={donutSize} viewBox={`0 0 ${donutSize} ${donutSize}`}>
                {categoryDistribution.ordered.length === 0 ? (
                  <circle cx={donutSize / 2} cy={donutSize / 2} r={donutRadius} fill="none" stroke="#1e293b" strokeWidth={donutStroke} />
                ) : (
                  categoryDistribution.ordered.map((slice) => {
                    const start = cursorAngle;
                    const sweep = (slice.percentage / 100) * 360;
                    const end = start + sweep;
                    cursorAngle = end;

                    return (
                      <path
                        key={slice.name}
                        d={describeArc(donutSize / 2, donutSize / 2, donutRadius, start, end)}
                        fill="none"
                        stroke={slice.color}
                        strokeWidth={donutStroke}
                        strokeLinecap="butt"
                        className="cursor-pointer transition-opacity hover:opacity-85"
                        onMouseEnter={(event) => {
                          setHoveredSlice(slice);
                          setTooltip({ slice, x: event.clientX + 12, y: event.clientY - 12 });
                        }}
                        onMouseMove={(event) => {
                          setTooltip({ slice, x: event.clientX + 12, y: event.clientY - 12 });
                        }}
                        onMouseLeave={() => {
                          setHoveredSlice(null);
                          setTooltip(null);
                        }}
                      />
                    );
                  })
                )}
              </svg>

              <div className="absolute inset-4 rounded-full bg-white dark:bg-slate-900 flex flex-col items-center justify-center text-center px-3">
                {hoveredSlice ? (
                  <>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Categoría</p>
                    <p className="text-sm font-black wrap-break-word">{hoveredSlice.name}</p>
                    <p className="text-xs text-slate-500">{formatCurrencyCOP(hoveredSlice.amount)} ({hoveredSlice.percentage.toFixed(1)}%)</p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-black">{categoryTotalLabel}</p>
                    <p className="text-sm text-slate-500">TOTAL GASTADO</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="max-h-52 overflow-auto space-y-2 text-sm pr-1">
            {categoryDistribution.ordered.map((slice) => (
              <div
                key={slice.name}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                onMouseEnter={() => setHoveredSlice(slice)}
                onMouseLeave={() => setHoveredSlice(null)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: slice.color }}></span>
                  <span className="truncate">{slice.name}</span>
                </div>
                <span className="font-semibold whitespace-nowrap">{slice.percentage.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border shadow-sm mb-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h3 className="text-2xl font-black">Ingresos vs. Gastos</h3>
            <p className="text-slate-500 dark:text-slate-400">Comparativa semestral detallada</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-sm bg-primary"></span>Ingresos</span>
            <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-sm bg-rose-500"></span>Gastos</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="h-80 min-w-[420px] grid grid-cols-6 items-end gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
            {monthSeries.map((row) => (
              <div key={row.key} className="flex flex-col items-center gap-3 h-full justify-end">
                <div className="w-full h-full flex items-end gap-1">
                  <div
                    className="w-1/2 bg-primary rounded-t-md"
                    style={{ height: `${(row.income / maxComparisonValue) * 100}%` }}
                    onMouseEnter={(e) => setBarTooltip({ label: `Ingresos ${row.label}`, amount: row.income, x: e.clientX + 12, y: e.clientY - 12 })}
                    onMouseMove={(e) => setBarTooltip((prev) => prev ? { ...prev, x: e.clientX + 12, y: e.clientY - 12 } : { label: `Ingresos ${row.label}`, amount: row.income, x: e.clientX + 12, y: e.clientY - 12 })}
                    onMouseLeave={() => setBarTooltip(null)}
                  />
                  <div
                    className="w-1/2 bg-rose-500 rounded-t-md"
                    style={{ height: `${(row.expense / maxComparisonValue) * 100}%` }}
                    onMouseEnter={(e) => setBarTooltip({ label: `Gastos ${row.label}`, amount: row.expense, x: e.clientX + 12, y: e.clientY - 12 })}
                    onMouseMove={(e) => setBarTooltip((prev) => prev ? { ...prev, x: e.clientX + 12, y: e.clientY - 12 } : { label: `Gastos ${row.label}`, amount: row.expense, x: e.clientX + 12, y: e.clientY - 12 })}
                    onMouseLeave={() => setBarTooltip(null)}
                  />
                </div>
                <span className="text-sm font-semibold text-slate-500">{row.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden mb-2">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-2xl font-black">Resumen de Transacciones Recientes</h3>
          <Link href="/transacciones" className="text-primary font-semibold hover:underline">Ver todo</Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-slate-500 text-xs uppercase bg-slate-50/80 dark:bg-slate-800/30">
              <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4">Descripción</th>
                <th className="px-6 py-4">Monto</th>
                <th className="px-6 py-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentRows.slice(0, visibleRecentRows).map((row, index) => (
                <tr key={`${row.dateLabel}-${row.description}-${index}`}>
                  <td className="px-6 py-4 font-medium">{row.dateLabel}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-800 font-semibold">{row.category}</span>
                  </td>
                  <td className="px-6 py-4 font-semibold">{row.description}</td>
                  <td className={`px-6 py-4 font-black ${row.type === "income" ? "text-emerald-500" : "text-rose-500"}`}>
                    {row.type === "income" ? "+" : "-"}
                    {formatCurrencyCOP(Math.abs(row.amount))}
                  </td>
                  <td className={`px-6 py-4 font-bold ${row.status === "Completado" ? "text-emerald-500" : "text-amber-500"}`}>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {visibleRecentRows < recentRows.length ? (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-center">
            <button
              type="button"
              onClick={() => setVisibleRecentRows((prev) => prev + 20)}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-white dark:hover:bg-slate-900"
            >
              Cargar más
            </button>
          </div>
        ) : null}
      </section>

      {(tooltip || barTooltip) ? (
        <div
          className="fixed z-[70] pointer-events-none px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 shadow-xl backdrop-blur-sm"
          style={{ left: (tooltip || barTooltip)!.x, top: (tooltip || barTooltip)!.y }}
        >
          {tooltip ? (
            <>
              <p className="text-xs font-bold">{tooltip.slice.name}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {formatCurrencyCOP(tooltip.slice.amount)} ({tooltip.slice.percentage.toFixed(1)}%)
              </p>
            </>
          ) : null}
          {barTooltip ? (
            <>
              <p className="text-xs font-bold">{barTooltip.label}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">{formatCurrencyCOP(barTooltip.amount)}</p>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="sr-only">
        Totales: {formatCurrencyCOP(totalIncome)} / {formatCurrencyCOP(totalExpense)}
      </div>
    </>
  );
}
