"use client";

import { useTheme } from "next-themes";
import { Moon } from "lucide-react";
import { useSyncExternalStore } from "react";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!mounted) {
    // Renderizar un esqueleto estático mientras se monta para evitar parpadeos
    return (
      <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-lg opacity-50">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
          <Moon className="w-5 h-5" />
          <span className="text-sm font-medium">Modo Oscuro</span>
        </div>
        <div className="h-6 w-11 rounded-full bg-slate-200 dark:bg-slate-700"></div>
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";

  if (compact) {
    return (
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={`w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center transition-colors ${
          isDark ? "bg-primary/10 text-primary" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
        }`}
        aria-label="Cambiar tema"
        title="Cambiar tema"
      >
        <Moon className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors">
      <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
        <Moon className="w-5 h-5" />
        <span className="text-sm font-medium">Modo Oscuro</span>
      </div>

      {/* Switch Toggle */}
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
          isDark ? "bg-primary" : "bg-slate-300 dark:bg-slate-700"
        }`}
        role="switch"
        aria-checked={isDark}
      >
        <span className="sr-only">Activar modo oscuro</span>
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
            isDark ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
