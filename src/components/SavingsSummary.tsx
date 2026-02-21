import { Target, PiggyBank, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { formatCurrencyCOP } from "@/utils/formatters";

export default async function SavingsSummary() {
  const supabase = await createClient();
  const { data: goals } = await supabase
    .from("savings_goals")
    .select("current_amount, target_amount, status");

  const goalList = goals || [];

  const totalSavings = goalList.reduce(
    (sum, goal) => sum + Number(goal.current_amount || 0),
    0
  );
  const globalGoal = goalList.reduce(
    (sum, goal) => sum + Number(goal.target_amount || 0),
    0
  );
  const activeGoals = goalList.length;
  const completedGoals = goalList.filter((goal) => goal.status === "Completado").length;
  const globalPercentage = globalGoal > 0 ? Math.round((totalSavings / globalGoal) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">
          Ahorro Total
        </p>
        <p className="text-slate-900 dark:text-white text-3xl font-bold">
          {formatCurrencyCOP(totalSavings)}
        </p>
        <div className="flex items-center gap-1 text-emerald-500">
          <PiggyBank className="w-4 h-4" />
          <p className="text-sm font-semibold">Saldo acumulado en metas</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">
          Meta Global
        </p>
        <p className="text-slate-900 dark:text-white text-3xl font-bold">
          {formatCurrencyCOP(globalGoal)}
        </p>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
          {globalPercentage}% del objetivo total
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">
          Metas Activas
        </p>
        <p className="text-slate-900 dark:text-white text-3xl font-bold">{activeGoals}</p>
        <div className="flex items-center gap-1 text-primary">
          <Target className="w-4 h-4" />
          <p className="text-sm font-semibold">Objetivos registrados</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-xl p-6 bg-primary/10 border border-primary/20 shadow-sm">
        <p className="text-primary text-sm font-bold uppercase tracking-wider">
          Metas Completadas
        </p>
        <p className="text-primary dark:text-white text-3xl font-bold">{completedGoals}</p>
        <div className="text-primary/70 dark:text-slate-400 text-sm font-medium italic">
          <CheckCircle2 className="w-4 h-4" />
          <p className="text-sm font-medium">Cumplidas hasta hoy</p>
        </div>
      </div>
    </div>
  );
}
