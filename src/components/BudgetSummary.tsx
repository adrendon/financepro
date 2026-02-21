import { createClient } from "@/utils/supabase/server";
import { formatCurrencyCOP } from "@/utils/formatters";

export default async function BudgetSummary() {
  const supabase = await createClient();
  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, type, date");

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthTransactions = (transactions || []).filter((tx) => {
    const txDate = new Date(`${tx.date}T00:00:00`);
    return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
  });

  const totalIncome = monthTransactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0);

  const totalSpent = monthTransactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0);

  const net = totalIncome - totalSpent;
  const spendingRatio = totalIncome > 0 ? Math.min(Math.round((totalSpent / totalIncome) * 100), 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Gastos del Mes</p>
          <span className="text-accent-coral text-xs font-bold bg-accent-coral/10 px-2 py-0.5 rounded-full">
            {spendingRatio}%
          </span>
        </div>
        <p className="text-3xl font-bold">{formatCurrencyCOP(totalSpent)}</p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Ingresos del Mes</p>
        <p className="text-3xl font-bold">{formatCurrencyCOP(totalIncome)}</p>
        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-4 overflow-hidden">
          <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${spendingRatio}%` }}></div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Balance del Mes</p>
          <span className="text-primary text-xs font-bold bg-primary/10 px-2 py-0.5 rounded-full">
            {monthTransactions.length} mov.
          </span>
        </div>
        <p className={`text-3xl font-bold ${net >= 0 ? "text-primary" : "text-accent-coral"}`}>
          {net >= 0 ? "+" : "-"}
          {formatCurrencyCOP(Math.abs(net))}
        </p>
      </div>
    </div>
  );
}
