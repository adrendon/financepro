import { Sidebar } from "@/components/Sidebar";
import NotificationsManager from "@/components/NotificationsManager";
import { createClient } from "@/utils/supabase/server";
import type { AppNotification } from "@/types/notifications";

export default async function NotificacionesPage() {
  const supabase = await createClient();

  const [{ data: txData }, { data: billData }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, merchant, type, amount, category, date")
      .order("date", { ascending: false })
      .limit(6),
    supabase
      .from("upcoming_bills")
      .select("id, title, amount, due_date, status")
      .order("due_date", { ascending: true })
      .limit(6),
  ]);

  const txNotifications: AppNotification[] = (txData || []).map((item) => ({
    id: `tx-${item.id}`,
    title: item.type === "income" ? "Transferencia recibida" : "Movimiento registrado",
    message:
      item.type === "income"
        ? `Has recibido un ingreso de $${Math.round(Number(item.amount || 0)).toLocaleString("es-CO")} en ${item.merchant}.`
        : `Se registró un gasto de $${Math.round(Number(item.amount || 0)).toLocaleString("es-CO")} en ${item.merchant}.`,
    time: new Date(item.date).toLocaleDateString("es-CO"),
    unread: false,
    kind: "system",
    actionLabel: "Ver transacción",
    actionHref: "/transacciones",
  }));

  const billNotifications: AppNotification[] = (billData || []).map((item) => {
    const dueDate = new Date(`${item.due_date}T00:00:00`);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isPaid = item.status === "Pagado";

    const message = isPaid
      ? `Pagada el ${dueDate.toLocaleDateString("es-CO")}. Importe $${Math.round(Number(item.amount || 0)).toLocaleString("es-CO")}.`
      : diffDays < 0
      ? `Venció el ${dueDate.toLocaleDateString("es-CO")} (${Math.abs(diffDays)} día(s) de atraso). Importe $${Math.round(Number(item.amount || 0)).toLocaleString("es-CO")}.`
      : `Vence ${dueDate.toLocaleDateString("es-CO")} (${diffDays} día(s)). Importe $${Math.round(Number(item.amount || 0)).toLocaleString("es-CO")}.`;

    const time = isPaid ? "pagada" : diffDays < 0 ? "vencida" : diffDays === 0 ? "vence hoy" : "próxima";

    return {
      id: `bill-${item.id}`,
      title: `Factura pendiente: ${item.title}`,
      message,
      time,
      unread: !isPaid,
      kind: "bill",
      actionLabel: "Pagar ahora",
      actionHref: `/facturas/${item.id}`,
      dueDateISO: item.due_date,
      isPaid,
    };
  });

  const initialNotifications: AppNotification[] = [
    ...billNotifications,
    ...txNotifications,
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-10 py-8">
        <div className="max-w-5xl mx-auto w-full">
          <NotificationsManager initialNotifications={initialNotifications} />
        </div>
      </main>
    </div>
  );
}
