import { MoreHorizontal } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { formatCurrencyCOP } from "@/utils/formatters";

const segmentColors = ["#144bb8", "#10b981", "#fb7185", "#64748b"];

export default async function SpendingBreakdown() {
  const supabase = await createClient();
  const { data: transactions } = await supabase
    .from("transactions")
    .select("category, amount, type, date");

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const expenseByCategory = new Map<string, number>();

  (transactions || []).forEach((tx) => {
    if (tx.type !== "expense") return;
    const txDate = new Date(`${tx.date}T00:00:00`);
    const isCurrentMonth = txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
    if (!isCurrentMonth) return;

    const category = tx.category || "Sin categoría";
    const amount = Math.abs(Number(tx.amount) || 0);
    expenseByCategory.set(category, (expenseByCategory.get(category) || 0) + amount);
  });

  const fullTotal = Array.from(expenseByCategory.values()).reduce((sum, value) => sum + value, 0);
  const fullTotalLabel = formatCurrencyCOP(fullTotal);
  const totalDigits = fullTotalLabel.replace(/\D/g, "").length;
  const totalClass = totalDigits >= 12
    ? "text-sm"
    : totalDigits >= 10
      ? "text-base"
      : totalDigits >= 8
        ? "text-lg"
        : "text-xl";

  const categories = Array.from(expenseByCategory.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);

  const topFourTotal = categories.reduce((sum, item) => sum + item.amount, 0);
  const otherAmount = Math.max(0, fullTotal - topFourTotal);

  const gradient =
    fullTotal > 0
      ? (() => {
          const segments = categories.map((item, index) => ({
            color: segmentColors[index % segmentColors.length],
            amount: item.amount,
          }));
          if (otherAmount > 0) {
            segments.push({ color: "#cbd5e1", amount: otherAmount });
          }

          let current = 0;
          return `conic-gradient(${segments
            .map((segment) => {
              const start = current;
              const portion = (segment.amount / fullTotal) * 100;
              current += portion;
              return `${segment.color} ${start.toFixed(2)}% ${current.toFixed(2)}%`;
            })
            .join(", ")})`;
        })()
      : "conic-gradient(#e2e8f0 0% 100%)";

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-lg font-bold">Desglose de Gastos</h3>
        <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-12">
        <div
          className="relative w-48 h-48 rounded-full flex items-center justify-center shrink-0"
          style={{ background: gradient }}
        >
          <div className="w-32 h-32 bg-white dark:bg-slate-900 rounded-full flex flex-col items-center justify-center shadow-inner z-10">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              Total mes
            </span>
            <span className={`w-full max-w-full px-2 text-center whitespace-nowrap leading-none tracking-tight font-bold ${totalClass}`}>
              {fullTotalLabel}
            </span>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {categories.length === 0 ? (
            <p className="text-sm text-slate-500">No hay gastos registrados.</p>
          ) : (
            categories.map((category, index) => (
              <div
                key={category.name}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: segmentColors[index % segmentColors.length] }}
                  ></div>
                  <span className="text-sm font-medium">{category.name}</span>
                </div>
                <span className="text-sm font-bold">
                  {formatCurrencyCOP(category.amount)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
