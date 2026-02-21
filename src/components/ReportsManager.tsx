"use client";

import { useMemo, useState } from "react";
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

type Range = "3m" | "6m" | "12m" | "10y" | "custom";

const DONUT_COLORS = ["#2563EB", "#14B8A6", "#F59E0B", "#94A3B8"];

function inRange(dateStr: string, range: Range, customFrom: string, customTo: string, now: Date, yearsWindow: number) {
  const dateValue = new Date(`${dateStr}T00:00:00`);

  if (range === "3m") return dateValue >= new Date(now.getFullYear(), now.getMonth() - 2, 1);
  if (range === "6m") return dateValue >= new Date(now.getFullYear(), now.getMonth() - 5, 1);
  if (range === "12m") return dateValue >= new Date(now.getFullYear(), now.getMonth() - 11, 1);
  if (range === "10y") return dateValue >= new Date(now.getFullYear() - Math.min(Math.max(yearsWindow, 1), 10), now.getMonth(), 1);

  if (!customFrom || !customTo) return true;
  return dateValue >= new Date(`${customFrom}T00:00:00`) && dateValue <= new Date(`${customTo}T23:59:59`);
}

export default function ReportsManager({ initialTransactions, todayISO }: { initialTransactions: Tx[]; todayISO: string }) {
  const [range, setRange] = useState<Range>("6m");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [yearsWindow, setYearsWindow] = useState(1);
  const [visibleRecentRows, setVisibleRecentRows] = useState(20);
  const referenceNow = useMemo(() => new Date(`${todayISO}T00:00:00`), [todayISO]);

  const filtered = useMemo(
    () => initialTransactions.filter((tx) => inRange(tx.date, range, customFrom, customTo, referenceNow, yearsWindow)),
    [initialTransactions, range, customFrom, customTo, referenceNow, yearsWindow]
  );

  const totalIncome = filtered
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0);
  const totalExpense = filtered
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0);

  const monthMap = useMemo(() => {
    const map = new Map<string, { key: string; label: string; income: number; expense: number }>();

    filtered.forEach((tx) => {
      const dateValue = new Date(`${tx.date}T00:00:00`);
      const key = `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, "0")}`;
      const label = dateValue
        .toLocaleDateString("es-ES", { month: "short" })
        .replace(".", "")
        .toUpperCase();

      if (!map.has(key)) map.set(key, { key, label, income: 0, expense: 0 });
      const row = map.get(key)!;
      const amount = Math.abs(Number(tx.amount) || 0);

      if (tx.type === "income") row.income += amount;
      if (tx.type === "expense") row.expense += amount;
    });

    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [filtered]);

  const monthlyExpenses = monthMap.slice(-6).map((row) => ({ label: row.label, value: row.expense }));
  const maxMonthlyExpense = Math.max(1, ...monthlyExpenses.map((row) => row.value));

  const comparisonSeries = monthMap.slice(-6);
  const maxComparisonValue = Math.max(1, ...comparisonSeries.flatMap((row) => [row.income, row.expense]));

  const categoryDistribution = useMemo(() => {
    const byCategory = new Map<string, number>();
    filtered.forEach((tx) => {
      if (tx.type !== "expense") return;
      const key = tx.category || "Otros";
      byCategory.set(key, (byCategory.get(key) || 0) + Math.abs(Number(tx.amount) || 0));
    });

    const total = Array.from(byCategory.values()).reduce((sum, value) => sum + value, 0);
    const ordered = Array.from(byCategory.entries())
      .map(([name, amount]) => ({ name, amount, percentage: total > 0 ? Math.round((amount / total) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);

    return { ordered, total };
  }, [filtered]);

  const categoryTotalLabel = useMemo(() => formatCurrencyCOP(categoryDistribution.total), [categoryDistribution.total]);
  const categoryTotalClass = useMemo(() => {
    const textLength = categoryTotalLabel.length;
    if (textLength >= 16) return "text-xs";
    if (textLength >= 14) return "text-sm";
    if (textLength >= 12) return "text-base";
    if (textLength >= 10) return "text-lg";
    if (textLength >= 8) return "text-xl";
    return "text-2xl";
  }, [categoryTotalLabel]);

  const donutGradient = useMemo(() => {
    if (categoryDistribution.ordered.length === 0) {
      return "conic-gradient(#1e293b 0deg 360deg)";
    }

    let current = 0;
    const segments = categoryDistribution.ordered.map((item, index) => {
      const size = (item.percentage / 100) * 360;
      const start = current;
      const end = current + size;
      current = end;
      return `${DONUT_COLORS[index % DONUT_COLORS.length]} ${start}deg ${end}deg`;
    });

    if (current < 360) segments.push(`#1e293b ${current}deg 360deg`);
    return `conic-gradient(${segments.join(", ")})`;
  }, [categoryDistribution.ordered]);

  const recentRows = [...filtered]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((tx) => {
      const dateValue = new Date(`${tx.date}T00:00:00`);
      const isRecent = Math.ceil((referenceNow.getTime() - dateValue.getTime()) / (24 * 60 * 60 * 1000)) <= 7;
      const status = tx.type === "income" ? "Completado" : isRecent ? "Pendiente" : "Completado";
      return {
        dateLabel: dateValue.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }),
        category: tx.category || "General",
        description: tx.merchant || (tx.type === "income" ? "Ingreso registrado" : "Gasto registrado"),
        amount: Number(tx.amount) || 0,
        type: tx.type,
        status,
      };
    });

  const exportRows = filtered.map((tx) => ({
    Fecha: new Date(`${tx.date}T00:00:00`).toLocaleDateString("es-ES"),
    Tipo: tx.type === "income" ? "Ingreso" : "Gasto",
    Categoria: tx.category,
    Monto: Math.round(Number(tx.amount)),
  }));

  return (
    <>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">Informes y Analítica</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Visualiza tendencias, categorías y comparativas de tus finanzas.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => exportToCSV(exportRows, "informe.csv")} className="px-3 py-2 rounded-lg border text-sm font-bold flex items-center gap-2"><Download className="w-4 h-4" /> CSV</button>
          <button onClick={() => exportToExcel(exportRows, "informe.xlsx")} className="px-3 py-2 rounded-lg border text-sm font-bold flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button onClick={() => exportToPDF(exportRows, "informe.pdf", "Informe Financiero")} className="px-3 py-2 rounded-lg border text-sm font-bold flex items-center gap-2"><FileText className="w-4 h-4" /> PDF</button>
        </div>
      </header>

      <div className="flex flex-wrap gap-3 mb-6 overflow-x-auto pb-1">
        <button onClick={() => { setRange("3m"); setVisibleRecentRows(20); }} className={`h-11 px-5 rounded-xl border text-base font-bold ${range === "3m" ? "bg-primary/10 border-primary/30 text-primary" : "bg-white dark:bg-slate-900"}`}>Últimos 3 meses</button>
        <button onClick={() => { setRange("6m"); setVisibleRecentRows(20); }} className={`h-11 px-5 rounded-xl border text-base font-bold ${range === "6m" ? "bg-primary/10 border-primary/30 text-primary" : "bg-white dark:bg-slate-900"}`}>Últimos 6 meses</button>
        <button onClick={() => { setRange("12m"); setVisibleRecentRows(20); }} className={`h-11 px-5 rounded-xl border text-base font-bold ${range === "12m" ? "bg-primary/10 border-primary/30 text-primary" : "bg-white dark:bg-slate-900"}`}>Últimos 12 meses</button>
        <select
          value={yearsWindow}
          onChange={(event) => {
            const next = Math.min(Math.max(Number(event.target.value), 1), 10);
            setYearsWindow(next);
            setRange("10y");
            setVisibleRecentRows(20);
          }}
          className="h-11 px-4 rounded-xl border bg-white dark:bg-slate-900 text-sm font-semibold"
        >
          {Array.from({ length: 10 }, (_, idx) => idx + 1).map((years) => (
            <option key={years} value={years}>Últimos {years} {years === 1 ? "año" : "años"}</option>
          ))}
        </select>
        <button onClick={() => { setRange("custom"); setVisibleRecentRows(20); }} className={`h-11 px-5 rounded-xl border text-base font-bold ${range === "custom" ? "bg-primary/10 border-primary/30 text-primary" : "bg-white dark:bg-slate-900"}`}>Personalizado</button>
      </div>

      {range === "custom" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          <input type="date" value={customFrom} onChange={(event) => { setCustomFrom(event.target.value); setVisibleRecentRows(20); }} className="px-3 py-2 rounded-lg border bg-white dark:bg-slate-900" />
          <input type="date" value={customTo} onChange={(event) => { setCustomTo(event.target.value); setVisibleRecentRows(20); }} className="px-3 py-2 rounded-lg border bg-white dark:bg-slate-900" />
        </div>
      ) : null}

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
                  <div className="w-full rounded-t-md bg-primary/80" style={{ height: `${(row.value / maxMonthlyExpense) * 100}%` }}></div>
                  <span className="text-sm font-semibold text-slate-500">{row.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border shadow-sm">
          <h3 className="text-2xl font-black mb-4">Distribución por Categoría</h3>
          <div className="flex items-center justify-center mb-5">
            <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full" style={{ background: donutGradient }}>
              <div className="absolute inset-4 rounded-full bg-white dark:bg-slate-900 flex flex-col items-center justify-center text-center">
                <p className={`w-full max-w-full px-3 text-center whitespace-nowrap leading-none tracking-tight font-black truncate ${categoryTotalClass}`}>
                  {categoryTotalLabel}
                </p>
                <p className="text-sm text-slate-500">TOTAL GASTADO</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {categoryDistribution.ordered.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}></span>
                <span className="text-slate-600 dark:text-slate-300 truncate">{item.name} ({item.percentage}%)</span>
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
            {comparisonSeries.map((row) => (
              <div key={row.key} className="flex flex-col items-center gap-3 h-full justify-end">
                <div className="w-full h-full flex items-end gap-1">
                  <div className="w-1/2 bg-primary rounded-t-md" style={{ height: `${(row.income / maxComparisonValue) * 100}%` }}></div>
                  <div className="w-1/2 bg-rose-500 rounded-t-md" style={{ height: `${(row.expense / maxComparisonValue) * 100}%` }}></div>
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

      <div className="sr-only">
        Totales: {formatCurrencyCOP(totalIncome)} / {formatCurrencyCOP(totalExpense)}
      </div>
    </>
  );
}
