"use client";

import { useMemo, useState } from "react";
import { PlusCircle, Filter, Tag } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { uploadImage } from "@/utils/uploadImage";
import ImageDropzone from "@/components/ImageDropzone";
import { formatCurrencyCOP, formatMoneyInput, parseMoneyInput } from "@/utils/formatters";
import { AppCategory, resolveCategoryIcon } from "@/utils/categories";
import AppToast from "@/components/AppToast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { DEFAULT_PANEL_IMAGE, isValidImageUrl } from "@/utils/images";

type Budget = {
  id: number;
  category: string;
  monthly_limit: number;
  month_start: string;
  image_url: string | null;
};

type Tx = { category: string; amount: number; type: string; date: string };

type MonthFilter = "current" | "last" | "all";

const firstDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);

export default function BudgetManager({
  initialBudgets,
  initialTransactions,
  initialCategories,
  todayISO,
}: {
  initialBudgets: Budget[];
  initialTransactions: Tx[];
  initialCategories: AppCategory[];
  todayISO: string;
}) {
  const referenceToday = useMemo(() => new Date(`${todayISO}T00:00:00`), [todayISO]);
  const initialMonthStart = firstDay(referenceToday);
  const [budgets, setBudgets] = useState(initialBudgets);
  const [txs] = useState(initialTransactions);
  const [monthFilter, setMonthFilter] = useState<MonthFilter>("current");
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [form, setForm] = useState({ category: "", monthly_limit: "", month_start: initialMonthStart, image_url: "" });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const budgetIconByCategory = useMemo(() => {
    const map = new Map<string, ReturnType<typeof resolveCategoryIcon>>();
    initialCategories
      .filter((category) => category.applies_to === "budget")
      .forEach((category) => {
        map.set(category.name.toLowerCase(), resolveCategoryIcon(category.icon));
      });
    return map;
  }, [initialCategories]);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 2600);
  };

  const filteredBudgets = useMemo(() => {
    if (monthFilter === "all") return budgets;
    const m = monthFilter === "last"
      ? new Date(referenceToday.getFullYear(), referenceToday.getMonth() - 1, 1)
      : new Date(referenceToday.getFullYear(), referenceToday.getMonth(), 1);
    const key = firstDay(m);
    return budgets.filter((b) => b.month_start === key);
  }, [budgets, monthFilter, referenceToday]);

  const spentByCategory = useMemo(() => {
    const map = new Map<string, number>();
    txs.forEach((tx) => {
      if (tx.type !== "expense") return;
      map.set(tx.category, (map.get(tx.category) || 0) + Math.abs(Number(tx.amount)));
    });
    return map;
  }, [txs]);

  const summary = useMemo(() => {
    const totalBudget = filteredBudgets.reduce((s, b) => s + Number(b.monthly_limit || 0), 0);
    const totalSpent = filteredBudgets.reduce((s, b) => s + (spentByCategory.get(b.category) || 0), 0);
    return { totalBudget, totalSpent, available: totalBudget - totalSpent };
  }, [filteredBudgets, spentByCategory]);

  const openCreate = () => {
    setEditing(null);
    setForm({ category: "", monthly_limit: "", month_start: initialMonthStart, image_url: "" });
    setIsOpen(true);
  };

  const openEdit = (budget: Budget) => {
    setEditing(budget);
    setForm({
      category: budget.category,
      monthly_limit: formatMoneyInput(String(budget.monthly_limit)),
      month_start: budget.month_start,
      image_url: budget.image_url || "",
    });
    setIsOpen(true);
  };

  const reload = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("budgets").select("*").order("month_start", { ascending: false });
    setBudgets((data as Budget[]) || []);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.category || parseMoneyInput(form.monthly_limit) <= 0 || !form.month_start) {
      showToast("error", "Completa categoría, límite y fecha válida.");
      return;
    }

    if (!isValidImageUrl(form.image_url)) {
      showToast("error", "La URL de imagen no es válida.");
      return;
    }

    const supabase = createClient();
    const payload = {
      category: form.category,
      monthly_limit: parseMoneyInput(form.monthly_limit),
      month_start: form.month_start,
      image_url: form.image_url || null,
    };

    const result = editing
      ? await supabase.from("budgets").update(payload).eq("id", editing.id)
      : await supabase.from("budgets").insert(payload);

    if (result.error) {
      showToast("error", `No se pudo guardar: ${result.error.message}`);
      return;
    }

    await reload();
    setIsOpen(false);
    setEditing(null);
    showToast("success", editing ? "Presupuesto actualizado." : "Presupuesto creado.");
  };

  const remove = async (id: number) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    const supabase = createClient();
    const id = confirmDeleteId;
    const { error } = await supabase.from("budgets").delete().eq("id", id);
    setDeleting(false);
    if (error) {
      showToast("error", `No se pudo eliminar: ${error.message}`);
      setConfirmDeleteId(null);
      return;
    }
    setBudgets((prev) => prev.filter((b) => b.id !== id));
    setConfirmDeleteId(null);
    showToast("success", "Presupuesto eliminado.");
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    setUploadProgress(0);
    setUploadError(null);
    try {
      const url = await uploadImage(file, "financepro/budgets", {
        onProgress: setUploadProgress,
      });
      setForm((state) => ({ ...state, image_url: url }));
      setUploadProgress(100);
    } catch (error) {
      setUploadError((error as Error).message);
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <>
      <AppToast toast={toast} onClose={() => setToast(null)} />

      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Eliminar presupuesto"
        message="¿Deseas eliminar este presupuesto?"
        loading={deleting}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
      />

      <header className="flex flex-wrap items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">Gestión de Presupuestos</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Controla límites por categoría y mes.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20">
          <PlusCircle className="w-5 h-5" /> Crear Nuevo Presupuesto
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border"><p className="text-sm text-slate-500">Total Gastado</p><p className="text-3xl font-bold">{formatCurrencyCOP(summary.totalSpent)}</p></div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border"><p className="text-sm text-slate-500">Total Presupuestado</p><p className="text-3xl font-bold">{formatCurrencyCOP(summary.totalBudget)}</p></div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border"><p className="text-sm text-slate-500">Disponible</p><p className={`text-3xl font-bold ${summary.available >= 0 ? "text-primary" : "text-rose-600"}`}>{formatCurrencyCOP(Math.abs(summary.available))}</p></div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold">Categorías Activas</h3>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-500" />
          <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value as MonthFilter)} className="px-3 py-2 rounded-lg border bg-white dark:bg-slate-900 text-sm">
            <option value="current">Mes actual</option>
            <option value="last">Mes pasado</option>
            <option value="all">Todo</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredBudgets.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border p-6 text-slate-500">No hay presupuestos para ese filtro.</div>
        ) : (
          filteredBudgets.map((budget) => {
            const spent = spentByCategory.get(budget.category) || 0;
            const percentage = budget.monthly_limit > 0 ? Math.min(Math.round((spent / Number(budget.monthly_limit)) * 100), 100) : 0;
            const CategoryIcon = budgetIconByCategory.get((budget.category || "").toLowerCase()) || Tag;
            return (
              <div key={budget.id} className="group bg-white dark:bg-slate-900 rounded-2xl border p-6 flex flex-col md:flex-row gap-6 items-center">
                <div className="w-full md:w-48 h-32 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={budget.image_url || DEFAULT_PANEL_IMAGE} alt={budget.category} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 w-full">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-xl font-bold flex items-center gap-2">
                        <CategoryIcon className="w-5 h-5 text-primary" />
                        {budget.category}
                      </h4>
                      <p className="text-sm text-slate-500">Mes {new Date(`${budget.month_start}T00:00:00`).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-primary">{percentage}%</span>
                      <p className="text-xs text-slate-400">Consumido</p>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="font-medium">Gastado: {formatCurrencyCOP(spent)}</span>
                    <span className="font-medium text-slate-400">Presupuesto: {formatCurrencyCOP(Number(budget.monthly_limit) || 0)}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden mb-3">
                    <div className="bg-primary h-full rounded-full" style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
                <div className="flex md:flex-col gap-2 w-full md:w-auto">
                  <button onClick={() => openEdit(budget)} className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-semibold">Editar</button>
                  <button onClick={() => remove(budget.id)} className="flex-1 px-4 py-2 bg-rose-50 text-rose-600 rounded-lg text-sm font-semibold">Eliminar</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={save} className="w-full max-w-lg rounded-xl border bg-white dark:bg-slate-900 p-6 space-y-4">
            <h3 className="text-xl font-bold">{editing ? "Editar presupuesto" : "Nuevo presupuesto"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select required value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))} className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800">
                <option value="">Selecciona categoría</option>
                {initialCategories.map((category) => (
                  <option key={category.id} value={category.name}>{category.name}</option>
                ))}
              </select>
              <input required type="text" inputMode="numeric" value={form.monthly_limit} onChange={(e) => setForm((s) => ({ ...s, monthly_limit: formatMoneyInput(e.target.value) }))} placeholder="Límite mensual" className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800" />
              <input required type="date" value={form.month_start} onChange={(e) => setForm((s) => ({ ...s, month_start: e.target.value }))} className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800" />
              <div className="md:col-span-2">
                <ImageDropzone
                  label="Imagen"
                  value={form.image_url}
                  onValueChange={(nextValue) => setForm((state) => ({ ...state, image_url: nextValue }))}
                  onFileSelected={handleImageUpload}
                  uploading={uploadingImage}
                  uploadProgress={uploadProgress}
                />
                {uploadError ? <p className="text-xs text-rose-600">{uploadError}</p> : null}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 rounded-lg border">Cancelar</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-white font-semibold">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
