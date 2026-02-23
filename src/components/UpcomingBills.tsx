import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { Plus } from "lucide-react";
import { formatCurrencyCOP } from "@/utils/formatters";

export default async function UpcomingBills() {
  const supabase = await createClient();
  const { data: bills, error } = await supabase
    .from("upcoming_bills")
    .select("*")
    .order("due_date", { ascending: true });

  const now = new Date();
  const currentMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthStart = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}-01`;

  const pendingBills = (bills || []).filter((bill) => bill.status !== "Pagado");
  const pendingBillsCurrentMonth = pendingBills.filter(
    (bill) => bill.due_date >= currentMonthStart && bill.due_date < nextMonthStart
  );
  const displayBills = pendingBillsCurrentMonth.slice(0, 5);

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold">Próximas Facturas</h3>
        <div className="flex items-center gap-2">
          <span className="bg-accent-coral/10 text-accent-coral text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
            {pendingBillsCurrentMonth.length} Pendientes
          </span>
          <Link
            href="/facturas?newBill=1"
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
            title="Agregar factura"
          >
            <Plus className="w-4 h-4 text-slate-400" />
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {displayBills.length === 0 && !error ? (
          <p className="text-sm text-slate-500 text-center py-4">
            No hay facturas pendientes.
          </p>
        ) : (
          displayBills.map((bill) => {
            // Asegurar un parseo correcto de fecha evitando la zona horaria local
            const dateObj = new Date(bill.due_date + "T00:00:00");
            const today = new Date();
            const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const diffDays = Math.floor((dateObj.getTime() - dayStart.getTime()) / (1000 * 60 * 60 * 24));
            const isPaid = bill.status === "Pagado";
            const isOverdue = !isPaid && diffDays < 0;
            const isDueToday = !isPaid && diffDays === 0;
            const month = dateObj
              .toLocaleDateString("es-ES", { month: "short" })
              .replace(".", "");
            const day = dateObj.toLocaleDateString("es-ES", { day: "2-digit" });
            const amountFormatted = formatCurrencyCOP(Number(bill.amount));

            const statusLabel = isPaid
              ? "PAGADA"
              : isOverdue
              ? "VENCIDA"
              : isDueToday || bill.is_urgent
              ? "URGENTE"
              : "PENDIENTE";

            return (
              <div
                key={bill.id}
                className={`flex items-center gap-4 p-3 border rounded-lg group transition-colors ${
                  isOverdue
                    ? "bg-rose-50 dark:bg-rose-950/25 border-rose-200 dark:border-rose-900/60"
                    : "border-slate-100 dark:border-slate-800 hover:border-accent-coral/50"
                }`}
              >
                <div
                  className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg text-slate-500 ${
                    isOverdue
                      ? "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300"
                      : "bg-slate-50 dark:bg-slate-800 group-hover:bg-accent-coral/10 group-hover:text-accent-coral"
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase">
                    {month}
                  </span>
                  <span className="text-lg font-bold leading-none">{day}</span>
                </div>

                <div className="flex-1">
                  <p className="text-sm font-bold">{bill.title}</p>
                  <p className="text-xs text-slate-500">
                    {bill.description || "Sin descripción"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold">{amountFormatted}</p>
                  <span
                    className={`text-[10px] font-bold uppercase ${
                      statusLabel === "VENCIDA"
                        ? "text-rose-600 dark:text-rose-400"
                        : statusLabel === "URGENTE"
                        ? "text-accent-coral"
                        : statusLabel === "PAGADA"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-400"
                    }`}
                  >
                    {statusLabel}
                  </span>
                </div>
              </div>
            );
          })
        )}

        {error && (
          <p className="text-sm text-accent-coral text-center py-4">
            Error al cargar las facturas.
          </p>
        )}
      </div>

      <Link
        href="/facturas"
        className="block w-full mt-6 py-2 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-500 hover:text-primary hover:border-primary transition-all"
      >
        Ver todas las facturas
      </Link>
    </div>
  );
}
