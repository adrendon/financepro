import { createClient } from "@/utils/supabase/server";

export default async function SavingsGoalsGrid() {
  const supabase = await createClient();
  const { data: goals, error } = await supabase
    .from("savings_goals")
    .select("id, title, status, current_amount, target_amount, color_class")
    .order("created_at", { ascending: true });

  const displayGoals = goals || [];

  return (
    <div className="flex flex-col gap-6 mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-slate-900 dark:text-white text-2xl font-bold tracking-tight">
          Mis Metas de Ahorro
        </h2>
      </div>

      {error ? (
        <p className="text-sm text-accent-coral">No se pudieron cargar las metas.</p>
      ) : displayGoals.length === 0 ? (
        <p className="text-sm text-slate-500">Aún no tienes metas de ahorro registradas.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayGoals.map((goal) => {
            const currentAmount = Number(goal.current_amount || 0);
            const targetAmount = Number(goal.target_amount || 0);
            const percentage =
              targetAmount > 0
                ? Math.min(Math.round((currentAmount / targetAmount) * 100), 100)
                : 0;

            return (
              <div
                key={goal.id}
                className="flex flex-col rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md"
              >
                <div className="p-5 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {goal.title}
                    </h3>
                    <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {goal.status}
                    </span>
                  </div>
                </div>

                <div className="p-6 flex flex-col gap-4">
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                      <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                        Progreso
                      </span>
                      <span className="text-slate-900 dark:text-white font-bold">
                        ${currentAmount.toLocaleString("es-ES")} / ${targetAmount.toLocaleString("es-ES")}
                      </span>
                    </div>
                    <span className="text-primary font-black text-xl tracking-tight">
                      {percentage}%
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`${goal.color_class || "bg-primary"} h-full rounded-full transition-all duration-700`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
