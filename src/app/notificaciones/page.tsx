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
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const pending = item.status !== "Pagado";

    return {
      id: `bill-${item.id}`,
      title: `Factura pendiente: ${item.title}`,
      message: `Vence ${dueDate.toLocaleDateString("es-CO")} (${diffDays >= 0 ? `${diffDays} día(s)` : "vencida"}). Importe $${Math.round(Number(item.amount || 0)).toLocaleString("es-CO")}.`,
      time: diffDays <= 1 ? "hoy" : "próxima",
      unread: pending,
      kind: "bill",
      actionLabel: "Pagar ahora",
      actionHref: `/facturas/${item.id}`,
    };
  });

  const budgetWarning: AppNotification = {
    id: "budget-warning",
    title: "Aviso de Presupuesto",
    message: "Has alcanzado el 80% de tu límite mensual en una categoría activa.",
    time: "hace 1 día",
    unread: true,
    kind: "budget",
    actionLabel: "Ajustar presupuesto",
    actionHref: "/presupuestos",
    progress: 80,
  };

  const securityWarning: AppNotification = {
    id: "security-warning",
    title: "Alerta de seguridad: inicio de sesión",
    message: "Se detectó un inicio de sesión desde un nuevo dispositivo.",
    time: "hace 5 min",
    unread: true,
    kind: "security",
    actionLabel: "Revisar seguridad",
    actionHref: "/perfil#perfil-seguridad",
  };

  const paymentInfo: AppNotification = {
    id: "payment-info",
    title: "Suscripción renovada",
    message: "Tu suscripción se renovó automáticamente. Puedes ver método de pago y recurrencia en Configuración.",
    time: "hace 5 días",
    unread: false,
    kind: "payment",
    actionLabel: "Gestionar suscripción",
    actionHref: "/configuracion#cfg-suscripcion",
  };

  const initialNotifications: AppNotification[] = [
    securityWarning,
    ...billNotifications,
    budgetWarning,
    ...txNotifications,
    paymentInfo,
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
