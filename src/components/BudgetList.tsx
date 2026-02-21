import { Filter } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { formatCurrencyCOP } from "@/utils/formatters";

export default async function BudgetList() {
  const supabase = await createClient();
  const { data: transactions } = await supabase
    .from("transactions")
    .select("category, amount, type, date")
    .order("date", { ascending: false });

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const expenseTx = (transactions || []).filter((tx) => {
    if (tx.type !== "expense") return false;
    const txDate = new Date(`${tx.date}T00:00:00`);
    return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
  });

  const byCategory = new Map<string, number>();
  expenseTx.forEach((tx) => {
    const category = tx.category || "Sin categoría";
    const amount = Math.abs(Number(tx.amount) || 0);
    byCategory.set(category, (byCategory.get(category) || 0) + amount);
  });

  const rows = Array.from(byCategory.entries())
    .map(([title, spent]) => ({ title, spent }))
    .sort((a, b) => b.spent - a.spent);

  const totalSpent = rows.reduce((sum, row) => sum + row.spent, 0);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold">Categorías Activas</h3>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <Filter className="w-5 h-5" />
          Mes actual
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {rows.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-slate-500">
            No hay gastos registrados este mes.
          </div>
        ) : (
          rows.map((row) => {
            const percentage = totalSpent > 0 ? Math.round((row.spent / totalSpent) * 100) : 0;
            return (
              <div
                key={row.title}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-xl font-bold">{row.title}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Gasto acumulado del mes</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-primary">{percentage}%</span>
                    <p className="text-xs text-slate-400">Participación</p>
                  </div>
                </div>

                <div className="flex justify-between text-sm mb-3">
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    Gastado: {formatCurrencyCOP(row.spent)}
                  </span>
                  <span className="font-medium text-slate-400">Total mes: {formatCurrencyCOP(totalSpent)}</span>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
