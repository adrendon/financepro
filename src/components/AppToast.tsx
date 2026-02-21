"use client";

import { CircleAlert, CircleCheckBig, X } from "lucide-react";

type ToastState = {
  type: "success" | "error";
  text: string;
};

export default function AppToast({
  toast,
  onClose,
}: {
  toast: ToastState | null;
  onClose?: () => void;
}) {
  if (!toast) return null;

  return (
    <div className="fixed top-5 right-5 z-80">
      <div
        className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm ${
          toast.type === "success"
            ? "border-emerald-200 bg-white text-slate-900 dark:border-emerald-700 dark:bg-slate-900 dark:text-slate-100"
            : "border-rose-200 bg-white text-slate-900 dark:border-rose-700 dark:bg-slate-900 dark:text-slate-100"
        }`}
      >
        {toast.type === "success" ? (
          <CircleCheckBig className="h-5 w-5 text-emerald-500" />
        ) : (
          <CircleAlert className="h-5 w-5 text-rose-500" />
        )}
        <p className="text-sm font-semibold">{toast.text}</p>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="ml-1 rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
