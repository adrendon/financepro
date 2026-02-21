"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import AppToast from "@/components/AppToast";
import { formatMoneyInput, parseMoneyInput } from "@/utils/formatters";

export default function MonthlyIncomeOnboardingModal({
  initialMonthlyIncome,
  shouldOpen,
}: {
  initialMonthlyIncome: number | null;
  shouldOpen: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(shouldOpen);
  const [monthlyIncome, setMonthlyIncome] = useState(
    initialMonthlyIncome && initialMonthlyIncome > 0 ? formatMoneyInput(String(initialMonthlyIncome)) : ""
  );
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 2600);
  };

  const saveMonthlyIncome = async (event: React.FormEvent) => {
    event.preventDefault();

    const parsedValue = parseMoneyInput(monthlyIncome);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      showToast("error", "Ingresa un valor mensual válido.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: user?.id,
        monthly_income: parsedValue,
        monthly_income_onboarded: true,
      });

    if (profileError) {
      setSaving(false);
      showToast("error", `No se pudo guardar: ${profileError.message}`);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      data: {
        monthly_income: parsedValue,
        monthly_income_onboarded: true,
      },
    });
    setSaving(false);

    if (error) {
      showToast("error", `No se pudo guardar: ${error.message}`);
      return;
    }

    showToast("success", "Ingreso mensual guardado correctamente.");
    setOpen(false);
    router.refresh();
  };

  if (!open) return null;

  return (
    <>
      <AppToast toast={toast} onClose={() => setToast(null)} />

      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <form onSubmit={saveMonthlyIncome} className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-4">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">Define tu ingreso mensual</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Lo usaremos para calcular tu balance mensual y recomendaciones financieras.
          </p>

          <div>
            <label className="block text-sm font-semibold mb-2">Ingreso mensual estimado</label>
            <input
              required
              type="text"
              inputMode="numeric"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(formatMoneyInput(e.target.value))}
              placeholder="Ej: 3500000"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 rounded-lg bg-primary text-white font-semibold disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar ingreso"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
