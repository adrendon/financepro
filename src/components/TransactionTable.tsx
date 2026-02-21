import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import {
  Coffee,
  Briefcase,
  Car,
  ShoppingBag,
  ArrowRight,
  Receipt,
} from "lucide-react";
import { formatCurrencyCOP } from "@/utils/formatters";

// Función auxiliar para asignar iconos basados en el comercio o categoría
const getIcon = (merchant: string, category: string) => {
  const text = `${merchant} ${category}`.toLowerCase();
  if (
    text.includes("coffee") ||
    text.includes("comida") ||
    text.includes("restaurant")
  )
    return Coffee;
  if (
    text.includes("salary") ||
    text.includes("ingreso") ||
    text.includes("salario")
  )
    return Briefcase;
  if (
    text.includes("uber") ||
    text.includes("transport") ||
    text.includes("car")
  )
    return Car;
  if (
    text.includes("amazon") ||
    text.includes("compra") ||
    text.includes("shop")
  )
    return ShoppingBag;
  return Receipt;
};

export default async function TransactionTable() {
  const supabase = await createClient();
  // Consultar datos reales desde Supabase (Server Component)
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    console.error("Error al cargar transacciones:", error);
  }

  // Usar arreglo vacío como respaldo si no hay datos
  const allTransactions = transactions || [];
  const now = new Date();
  const currentDay = now.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
  const startOfWeekISO = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, "0")}-${String(startOfWeek.getDate()).padStart(2, "0")}`;
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const txs = allTransactions.filter((tx) => tx.date >= startOfWeekISO && tx.date <= todayISO);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h3 className="text-lg font-bold">Transacciones Recientes</h3>
        <Link
          href="/transacciones"
          className="text-primary text-sm font-semibold hover:underline flex items-center gap-1"
        >
          Ver Todo
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase text-slate-500 dark:text-slate-400 font-bold bg-slate-50 dark:bg-slate-800/30">
              <th className="px-6 py-4">Comercio / Tipo</th>
              <th className="px-6 py-4">Categoría</th>
              <th className="px-6 py-4">Fecha</th>
              <th className="px-6 py-4 text-right">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {txs.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-8 text-center text-slate-500"
                >
                  No hay transacciones registradas.
                </td>
              </tr>
            ) : (
              txs.map((tx) => {
                const Icon = getIcon(tx.merchant, tx.category);
                const isIncome = tx.type === "income";

                // Asegurar formato de fecha correcto evitando problemas de zona horaria
                const dateObj = new Date(tx.date + "T00:00:00");
                const formattedDate = dateObj.toLocaleDateString("es-ES", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });

                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isIncome
                              ? "bg-accent-emerald/10 text-accent-emerald dark:bg-slate-800"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="font-medium">{tx.merchant}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isIncome
                            ? "bg-accent-emerald/10 text-accent-emerald"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {tx.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 capitalize">
                      {formattedDate.replace(".", "")}
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-bold ${
                        isIncome ? "text-accent-emerald" : "text-accent-coral"
                      }`}
                    >
                      {isIncome ? "+" : "-"}
                      {formatCurrencyCOP(Math.abs(Number(tx.amount) || 0))}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
