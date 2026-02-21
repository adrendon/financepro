"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CheckCheck,
  CreditCard,
  Info,
  PiggyBank,
  ReceiptText,
  Search,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { useSharedNotifications } from "@/hooks/useSharedNotifications";
import type { AppNotification } from "@/types/notifications";

type FilterKind = "all" | "unread" | "security" | "budget" | "bill";

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

export default function NotificationsManager({
  initialNotifications,
}: {
  initialNotifications: AppNotification[];
}) {
  const { items: notifications, unreadCount, markAllRead, markRead, dismiss } =
    useSharedNotifications(initialNotifications);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKind>("all");
  const [removingIds, setRemovingIds] = useState<string[]>([]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const matchesQuery = `${item.title} ${item.message}`
        .toLowerCase()
        .includes(query.trim().toLowerCase());

      const matchesFilter =
        filter === "all"
          ? true
          : filter === "unread"
          ? item.unread
          : item.kind === filter;

      return matchesQuery && matchesFilter;
    });
  }, [notifications, query, filter]);

  const dismissWithAnimation = (id: string) => {
    if (removingIds.includes(id)) return;
    setRemovingIds((prev) => [...prev, id]);
    window.setTimeout(() => {
      dismiss(id);
      setRemovingIds((prev) => prev.filter((itemId) => itemId !== id));
    }, 220);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">Notificaciones</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Últimas actividades, alertas y acciones rápidas de tu cuenta.</p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white font-semibold"
        >
          <CheckCheck className="w-4 h-4" />
          Marcar todo como leído
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar notificaciones..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-3 text-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto w-full md:w-auto">
          {[
            { key: "all", label: "Todas" },
            { key: "unread", label: "No leídas" },
            { key: "security", label: "Seguridad" },
            { key: "budget", label: "Presupuestos" },
            { key: "bill", label: "Facturas" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key as FilterKind)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                filter === item.key
                  ? "bg-primary text-white"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center space-y-2">
          <p className="font-bold text-slate-900 dark:text-white">No tienes notificaciones</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Todo está al día por ahora. Te avisaremos cuando ocurra algo importante.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((item) => (
            <article
              key={item.id}
              className={`relative flex gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all duration-200 ${
                removingIds.includes(item.id) ? "opacity-0 -translate-y-1 scale-[0.98]" : "opacity-100"
              }`}
            >
              {item.unread ? <div className="absolute right-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" /> : null}
              <div className={`h-12 w-12 rounded-lg shrink-0 flex items-center justify-center ${iconColorByKind[item.kind]}`}>
                {iconByKind[item.kind]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{item.time}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{item.message}</p>

                {typeof item.progress === "number" ? (
                  <div className="mt-2 w-full rounded-full h-1.5 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${Math.max(0, Math.min(100, item.progress))}%` }} />
                  </div>
                ) : null}

                <div className="mt-3 flex items-center gap-3">
                  {item.actionHref ? (
                    <Link href={item.actionHref} className="text-xs font-bold text-primary hover:underline">
                      {item.actionLabel || "Ver detalle"}
                    </Link>
                  ) : null}
                  {item.unread ? (
                    <button
                      type="button"
                      onClick={() => markRead(item.id)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      Marcar como leída
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => dismissWithAnimation(item.id)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    Ignorar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="flex justify-center pt-2">
        <button type="button" className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-primary">
          Ver notificaciones anteriores
        </button>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        Sincroniza tus preferencias desde <Link href="/configuracion#cfg-notificaciones" className="text-primary font-semibold">Configuración &gt; Notificaciones</Link>.
        {unreadCount > 0 ? ` Tienes ${unreadCount} pendientes.` : ""}
      </p>
    </div>
  );
}
