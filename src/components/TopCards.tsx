import { Banknote, TrendingUp, AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { formatCurrencyCOP } from "@/utils/formatters";

export default async function TopCards() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("monthly_income")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const rawMonthlyIncome = profile?.monthly_income;
  const configuredMonthlyIncome =
    typeof rawMonthlyIncome === "number"
      ? rawMonthlyIncome
      : typeof rawMonthlyIncome === "string" && rawMonthlyIncome.trim()
      ? Number(rawMonthlyIncome)
      : 0;

  // 1. Obtener todas las transacciones de Supabase
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("amount, type, date");

  if (error) {
    console.error("Error cargando totales:", error);
  }

  // 2. Calcular los totales
  let totalIncome = 0;
  let totalExpense = 0;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const month = now.getMonth();
  const year = now.getFullYear();

  if (transactions) {
    transactions.forEach((tx) => {
      const txDate = new Date(`${tx.date}T00:00:00`);
      const isCurrentMonth = txDate.getMonth() === month && txDate.getFullYear() === year;
      const isElapsedDay = txDate <= today;
      if (!isCurrentMonth || !isElapsedDay) return;

      // Nos aseguramos de tratar el monto como número
      const amount = Number(tx.amount);
      if (tx.type === "income") {
        totalIncome += amount;
      } else if (tx.type === "expense") {
        // En base de datos o lógica puedes guardarlo como negativo o positivo,
        // Usamos Math.abs para asegurar una suma limpia de "Gasto Total".
        totalExpense += Math.abs(amount);
      }
    });
  }

  const monthlyIncome = configuredMonthlyIncome > 0 ? configuredMonthlyIncome : totalIncome;

  // El Saldo Total es: Ingreso mensual objetivo - Gastos del mes
  const totalBalance = monthlyIncome - totalExpense;

  // 3. Formatear para visualización
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Saldo Total */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-start mb-4">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Saldo Total
          </p>
          <div className="p-2 bg-primary/10 rounded-lg">
            <Banknote className="w-5 h-5 text-primary" />
          </div>
        </div>
        <h3 className="text-3xl font-bold mb-2">
          {formatCurrencyCOP(totalBalance)}
        </h3>
        <div className="flex items-center gap-1 text-accent-emerald text-sm font-medium">
          <TrendingUp className="w-4 h-4" />
          <span>Calculado en vivo</span>
        </div>
      </div>

      {/* Ingresos Mensuales */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="flex justify-between items-start mb-4">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Ingreso Mensual
          </p>
          <div className="p-2 bg-accent-emerald/10 rounded-lg">
            <Banknote className="w-5 h-5 text-accent-emerald" />
          </div>
        </div>
        <h3 className="text-3xl font-bold mb-2">
          {formatCurrencyCOP(monthlyIncome)}
        </h3>
        <div className="flex items-center gap-1 text-accent-emerald text-sm font-medium">
          <TrendingUp className="w-4 h-4" />
          <span>{configuredMonthlyIncome > 0 ? "Definido en tu perfil" : "Tomado de ingresos registrados"}</span>
        </div>
      </div>

      {/* Gastos Mensuales */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="flex justify-between items-start mb-4">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Gastos Totales
          </p>
          <div className="p-2 bg-accent-coral/10 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-accent-coral" />
          </div>
        </div>
        <h3 className="text-3xl font-bold mb-2">
          {formatCurrencyCOP(totalExpense)}
        </h3>
        <div className="flex items-center gap-1 text-accent-coral text-sm font-medium">
          <AlertTriangle className="w-4 h-4" />
          <span>Gastos del mes actual</span>
        </div>
      </div>
    </div>
  );
}
