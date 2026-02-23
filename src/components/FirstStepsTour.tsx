"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Props = {
  userId: string | null;
  shouldOpen: boolean;
};

export default function FirstStepsTour({ userId, shouldOpen }: Props) {
  const storageKey = useMemo(
    () => (userId ? `financepro.first-steps-tour.dismissed.${userId}` : null),
    [userId]
  );
  const [dismissed, setDismissed] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!storageKey) {
      queueMicrotask(() => {
        setDismissed(false);
        setReady(true);
      });
      return;
    }

    const alreadyDismissed = window.localStorage.getItem(storageKey) === "1";
    queueMicrotask(() => {
      setDismissed(alreadyDismissed);
      setReady(true);
    });
  }, [storageKey]);

  const closeTour = () => {
    if (storageKey) {
      window.localStorage.setItem(storageKey, "1");
    }
    setDismissed(true);
  };

  if (!ready || !shouldOpen || dismissed) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-5">
        <h3 className="text-2xl font-black text-slate-900 dark:text-white">Bienvenido a FinancePro</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Te guiamos con los primeros pasos recomendados para empezar rápido.
        </p>

        <ol className="space-y-3 text-sm">
          <li className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
            <p className="font-semibold">1) Registra tus primeras transacciones</p>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Añade ingresos y gastos para activar los resúmenes reales.
            </p>
          </li>
          <li className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
            <p className="font-semibold">2) Crea un presupuesto</p>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Define límites por categoría para controlar tu consumo mensual.
            </p>
          </li>
          <li className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
            <p className="font-semibold">3) Configura ahorros y facturas</p>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Establece metas y vencimientos para no perder seguimiento.
            </p>
          </li>
        </ol>

        <div className="flex flex-col sm:flex-row justify-end gap-2">
          <button
            type="button"
            onClick={closeTour}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold"
          >
            Cerrar
          </button>
          <Link
            href="/transacciones"
            onClick={closeTour}
            className="px-4 py-2 rounded-lg bg-primary text-white font-semibold text-center"
          >
            Empezar ahora
          </Link>
        </div>
      </div>
    </div>
  );
}
