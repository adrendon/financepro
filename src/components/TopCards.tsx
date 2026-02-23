import { Banknote, TrendingUp, AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { formatCurrencyCOP } from "@/utils/formatters";

type TransactionRow = {
  amount: number;
  type: "income" | "expense";
  date: string;
};

type InvestmentRow = {
  invested_amount: number;
  started_at: string | null;
  created_at?: string | null;
};

type BillRow = {
  amount: number;
  due_date: string;
  status: string;
};

type BillImpactMode = "due_or_overdue" | "pending_month" | "all_pending";

function getBillImpactMode(): BillImpactMode {
  const raw = (process.env.NEXT_PUBLIC_PANEL_BILLS_MODE || "pending_month").toLowerCase();
  if (raw === "pending_month" || raw === "all_pending") return raw;
  return "due_or_overdue";
}

function shouldIncludeBill(
  bill: BillRow,
  mode: BillImpactMode,
  todayISO: string,
  monthStartISO: string,
  nextMonthStartISO: string
) {
  const pending = bill.status !== "Pagado";
  if (!pending) return false;

  if (mode === "all_pending") return true;
  if (mode === "pending_month") {
    return bill.due_date >= monthStartISO && bill.due_date < nextMonthStartISO;
  }

  return bill.due_date <= todayISO;
}

export default async function TopCards() {
  const supabase = await createClient();

  const [{ data: transactions, error }, { data: investments }, { data: bills }] = await Promise.all([
    supabase.from("transactions").select("amount, type, date"),
    supabase.from("investments").select("invested_amount, started_at, created_at"),
    supabase.from("upcoming_bills").select("amount, due_date, status"),
  ]);

  if (error) {
    console.error("Error cargando totales:", error);
  }

  // 2. Calcular los totales
  let totalIncome = 0;
  let totalExpense = 0;
  const billImpactMode = getBillImpactMode();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const month = now.getMonth();
  const year = now.getFullYear();
  const monthStartISO = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const nextMonthDate = new Date(year, month + 1, 1);
  const nextMonthStartISO = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}-01`;
  const todayISO = `${year}-${String(month + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  if (transactions) {
    (transactions as TransactionRow[]).forEach((tx) => {
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

  if (investments) {
    (investments as InvestmentRow[]).forEach((item) => {
      const referenceDate = item.started_at || item.created_at?.slice(0, 10);
      if (!referenceDate) return;
      const invDate = new Date(`${referenceDate}T00:00:00`);
      const isCurrentMonth = invDate.getMonth() === month && invDate.getFullYear() === year;
      const isElapsedDay = invDate <= today;
      if (!isCurrentMonth || !isElapsedDay) return;

      totalExpense += Math.abs(Number(item.invested_amount) || 0);
    });
  }

  if (bills) {
    (bills as BillRow[]).forEach((bill) => {
      if (!shouldIncludeBill(bill, billImpactMode, todayISO, monthStartISO, nextMonthStartISO)) return;

      totalExpense += Math.abs(Number(bill.amount) || 0);
    });
  }

  const monthlyIncome = totalIncome;

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
          <span>Tomado de ingresos registrados</span>
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
          <span>
            {billImpactMode === "all_pending"
              ? "Incluye gastos, inversiones y todas las facturas pendientes"
              : billImpactMode === "pending_month"
              ? "Incluye gastos, inversiones y facturas pendientes del mes"
              : "Incluye gastos, inversiones y facturas vencidas/hoy"}
          </span>
        </div>
      </div>
    </div>
  );
}
