"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCheck,
  CreditCard,
  PiggyBank,
  Info,
  ReceiptText,
  ShieldAlert,
  TrendingUp,
  X,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useSharedNotifications } from "@/hooks/useSharedNotifications";
import type { AppNotification } from "@/types/notifications";

type NotificationCategory = "all" | "unread" | "alerts";

const baseNotifications: AppNotification[] = [
  {
    id: "sec-1",
    title: "Alerta de seguridad",
    message: "Nuevo inicio de sesión detectado desde un dispositivo desconocido.",
    time: "hace 5 min",
    unread: true,
    kind: "security",
    actionLabel: "Ver detalle",
    actionHref: "/perfil#perfil-seguridad",
  },
  {
    id: "bill-1",
    title: "Factura próxima",
    message: "Tienes facturas próximas a vencer en las próximas 48 horas.",
    time: "hace 2 horas",
    unread: true,
    kind: "bill",
    actionLabel: "Ir a facturas",
    actionHref: "/facturas",
  },
  {
    id: "budget-1",
    title: "Alerta de presupuesto",
    message: "Una categoría superó el 80% del presupuesto mensual.",
    time: "hace 5 horas",
    unread: true,
    kind: "budget",
    actionLabel: "Ver presupuestos",
    actionHref: "/presupuestos",
  },
  {
    id: "payment-1",
    title: "Suscripción renovada",
    message: "Tu suscripción se renovó automáticamente.",
    time: "ayer",
    unread: false,
    kind: "payment",
    actionLabel: "Gestionar",
    actionHref: "/suscripcion",
  },
];

const iconByKind = {
  security: <ShieldAlert className="w-5 h-5" />,
  bill: <ReceiptText className="w-5 h-5" />,
  budget: <TrendingUp className="w-5 h-5" />,
  savings: <PiggyBank className="w-5 h-5" />,
  payment: <CreditCard className="w-5 h-5" />,
  system: <Info className="w-5 h-5" />,
};

const iconColorByKind = {
  security: "bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
  bill: "bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  budget: "bg-primary/10 text-primary",
  savings: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  payment: "bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
  system: "bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
};

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationCategory>("all");
  const { items: notifications, unreadCount, mergeIncoming, markAllRead, markRead } =
    useSharedNotifications(baseNotifications);

  useEffect(() => {
    const loadDynamicNotifications = async () => {
      const supabase = createClient();

      const [{ data: txData }, { data: billData }] = await Promise.all([
        supabase
          .from("transactions")
          .select("id, merchant, type, amount, date")
          .order("date", { ascending: false })
          .limit(3),
        supabase
          .from("upcoming_bills")
          .select("id, title, amount, due_date, status")
          .order("due_date", { ascending: true })
          .limit(3),
      ]);

      const txNotifications: AppNotification[] = (txData || []).map((tx) => ({
        id: `tx-${tx.id}`,
        title: tx.type === "income" ? "Ingreso registrado" : "Gasto registrado",
        message: `${tx.merchant}: $${Math.round(Number(tx.amount || 0)).toLocaleString("es-CO")}`,
        time: new Date(tx.date).toLocaleDateString("es-CO"),
        unread: false,
        kind: "system",
        actionLabel: "Ver transacciones",
        actionHref: "/transacciones",
      }));

      const billNotifications: AppNotification[] = (billData || []).map((bill) => ({
        id: `due-${bill.id}`,
        title: `Factura: ${bill.title}`,
        message: `Vence ${new Date(`${bill.due_date}T00:00:00`).toLocaleDateString("es-CO")}. Monto $${Math.round(Number(bill.amount || 0)).toLocaleString("es-CO")}.`,
        time: "próximo vencimiento",
        unread: bill.status !== "Pagado",
        kind: "bill",
        actionLabel: "Pagar ahora",
        actionHref: `/facturas/${bill.id}`,
      }));

      const merged = [...baseNotifications, ...billNotifications, ...txNotifications].slice(0, 8);
      mergeIncoming(merged);
    };

    void loadDynamicNotifications();
  }, [mergeIncoming]);

  const visibleItems = useMemo(() => {
    if (filter === "all") return notifications;
    if (filter === "unread") return notifications.filter((item) => item.unread);
    return notifications.filter(
      (item) => item.kind === "security" || item.kind === "bill" || item.kind === "budget" || item.kind === "savings"
    );
  }, [filter, notifications]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-5 right-5 z-40 h-11 w-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md flex items-center justify-center"
        aria-label="Abrir notificaciones"
      >
        <Bell className="w-5 h-5 text-slate-700 dark:text-slate-200" />
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
            aria-label="Cerrar panel de notificaciones"
          />

          <div className="absolute top-16 right-4 md:right-10 w-[min(420px,calc(100%-1rem))] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Notificaciones</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Tienes {unreadCount} notificaciones nuevas</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-primary hover:bg-primary/10 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                >
                  Marcar todo leído
                </button>
                <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50/70 dark:bg-slate-800/40 flex gap-2">
              {[
                { key: "all", label: "Todas" },
                { key: "unread", label: "No leídas" },
                { key: "alerts", label: "Alertas" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilter(tab.key as NotificationCategory)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    filter === tab.key
                      ? "bg-primary text-white"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="max-h-105 overflow-y-auto">
              {visibleItems.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <p className="font-semibold text-slate-900 dark:text-white">No tienes notificaciones</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Todo está al día por ahora.</p>
                </div>
              ) : (
                visibleItems.map((item) => (
                  <div key={item.id} className="relative p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 flex gap-3">
                    {item.unread ? <div className="absolute left-2 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary" /> : null}
                    <div className={`h-11 w-11 rounded-lg flex items-center justify-center shrink-0 ${iconColorByKind[item.kind]}`}>
                      {iconByKind[item.kind]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{item.title}</h4>
                        <span className="text-[11px] text-slate-400 whitespace-nowrap">{item.time}</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-snug">{item.message}</p>
                      <div className="mt-2 flex items-center gap-3">
                        {item.actionHref ? (
                          <Link href={item.actionHref} onClick={() => setOpen(false)} className="text-xs font-bold text-primary hover:underline">
                            {item.actionLabel || "Ver detalle"}
                          </Link>
                        ) : null}
                        {item.unread ? (
                          <button type="button" onClick={() => markRead(item.id)} className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">
                            Marcar leída
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <Link
              href="/notificaciones"
              onClick={() => setOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold text-primary hover:bg-slate-50 dark:hover:bg-slate-800 border-t border-slate-100 dark:border-slate-800"
            >
              <CheckCheck className="w-4 h-4" />
              Ver todas las notificaciones
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
