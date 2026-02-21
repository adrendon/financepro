"use client";

import { useState } from "react";
import { X, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { AppCategory } from "@/utils/categories";
import { formatMoneyInput, parseMoneyInput } from "@/utils/formatters";

type TransactionFormData = {
  id: number;
  merchant: string;
  category: string;
  amount: number;
  type: "income" | "expense";
  date: string;
};

type MerchantSuggestion = {
  category?: string;
  type?: "income" | "expense";
};

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: TransactionFormData | null;
  onSaved?: (mode: "create" | "edit", savedTx: TransactionFormData | null) => void;
  categories?: AppCategory[];
  inferByMerchant?: (merchant: string) => MerchantSuggestion | null;
}

export default function NewTransactionModal({
  isOpen,
  onClose,
  initialData,
  onSaved,
  categories = [],
  inferByMerchant,
}: NewTransactionModalProps) {
  const router = useRouter();
  const isEdit = Boolean(initialData);

  // Estados del formulario
  const [type, setType] = useState<"income" | "expense">(initialData?.type || "expense");
  const [merchant, setMerchant] = useState(initialData?.merchant || "");
  const [category, setCategory] = useState(initialData?.category || "");
  const [amount, setAmount] = useState(initialData ? formatMoneyInput(String(initialData.amount)) : "");
  const [date, setDate] = useState(() => initialData?.date || new Date().toISOString().split("T")[0]);

  // Estados de la petición
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ruleHint, setRuleHint] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const numAmount = parseMoneyInput(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Por favor, ingresa un monto válido mayor a 0.");
      setLoading(false);
      return;
    }

    const payload = {
      merchant,
      category,
      amount: numAmount,
      type,
      date,
    };

    const { data, error: dbError } = isEdit
      ? await supabase
          .from("transactions")
          .update(payload)
          .eq("id", initialData!.id)
          .select("id, merchant, category, amount, type, date")
          .single()
      : await supabase
          .from("transactions")
          .insert([payload])
          .select("id, merchant, category, amount, type, date")
          .single();

    if (dbError) {
      setError("Error al guardar la transacción: " + dbError.message);
      setLoading(false);
    } else {
      // Limpiar formulario y cerrar
      setMerchant("");
      setCategory("");
      setAmount("");
      setType("expense");
      setDate(new Date().toISOString().split("T")[0]);
      setRuleHint(null);
      setLoading(false);
      onSaved?.(isEdit ? "edit" : "create", (data as TransactionFormData | null) ?? null);
      onClose();

      // Refrescar los datos de la página (Server Components)
      router.refresh();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold">{isEdit ? "Editar Transacción" : "Nueva Entrada"}</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 text-sm text-accent-coral bg-accent-coral/10 rounded-lg">
              {error}
            </div>
          )}

          {/* Tipo (Ingreso/Gasto) */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${
                type === "expense"
                  ? "border-accent-coral text-accent-coral bg-accent-coral/5"
                  : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <ArrowDownCircle className="w-5 h-5" />
              Gasto
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium transition-all ${
                type === "income"
                  ? "border-accent-emerald text-accent-emerald bg-accent-emerald/5"
                  : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <ArrowUpCircle className="w-5 h-5" />
              Ingreso
            </button>
          </div>

          {/* Monto */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Monto
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                $
              </span>
              <input
                type="text"
                inputMode="numeric"
                required
                value={amount}
                onChange={(e) => setAmount(formatMoneyInput(e.target.value))}
                className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="0"
              />
            </div>
          </div>

          {/* Comercio y Categoría */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Comercio / Título
              </label>
              <input
                type="text"
                required
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                onBlur={() => {
                  const normalized = merchant.trim();
                  if (!normalized || !inferByMerchant) return;
                  const suggestion = inferByMerchant(normalized);
                  if (!suggestion) return;

                  if (suggestion.category) {
                    setCategory(suggestion.category);
                  }

                  if (suggestion.type) {
                    setType(suggestion.type);
                  }

                  if (suggestion.category || suggestion.type) {
                    const pieces = [
                      suggestion.category ? `categoría: ${suggestion.category}` : null,
                      suggestion.type ? `tipo: ${suggestion.type === "income" ? "ingreso" : "gasto"}` : null,
                    ].filter(Boolean);
                    setRuleHint(`Regla aplicada (${pieces.join(", ")}).`);
                  }
                }}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="Ej. Starbucks"
              />
              {ruleHint ? <p className="text-xs text-primary mt-2">{ruleHint}</p> : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Categoría
              </label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              >
                <option value="">Selecciona categoría</option>
                <option value="General">General</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.name}>{item.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Fecha
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>

          {/* Footer / Buttons */}
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 font-medium text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Guardando..." : isEdit ? "Guardar Cambios" : "Guardar Entrada"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
