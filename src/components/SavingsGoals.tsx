import { Plus } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

export default async function SavingsGoals() {
  const supabase = await createClient();
  const { data: goals, error } = await supabase
    .from("savings_goals")
    .select("*")
    .order("created_at", { ascending: false });

  const displayGoals = (goals || []).slice(0, 5);

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold">Metas de Ahorro</h3>
        <Link
          href="/ahorros?newGoal=1"
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
          title="Agregar otra meta"
        >
          <Plus className="w-5 h-5 text-slate-400" />
        </Link>
      </div>

      <div className="space-y-6">
        {displayGoals.map((goal) => {
          const current = Number(goal.current_amount);
          const target = Number(goal.target_amount);
          const percentage = Math.round((current / target) * 100);

          return (
            <div key={goal.id}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">{goal.title}</span>
                <span className="text-xs text-slate-500">{goal.status}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`${goal.color_class} h-2 rounded-full transition-all duration-500`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center mt-2 text-xs">
                <span className="font-bold">
                  ${current.toLocaleString("en-US")}
                </span>
                <span className="text-slate-500">
                  de ${target.toLocaleString("en-US")}
                </span>
              </div>
            </div>
          );
        })}

        {displayGoals.length === 0 && !error && (
          <p className="text-sm text-slate-500 text-center py-4">
            No hay metas de ahorro configuradas.
          </p>
        )}

        {error && (
          <p className="text-sm text-accent-coral text-center py-4">
            Error al cargar las metas de ahorro.
          </p>
        )}
      </div>

      <Link
        href="/ahorros"
        className="block w-full mt-6 py-2 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-500 hover:text-primary hover:border-primary transition-all"
      >
        Ver todas las metas
      </Link>
    </div>
  );
}
