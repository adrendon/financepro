"use client";

import { useMemo, useState } from "react";
import { PlusCircle, Trash2, Pencil, TrendingUp, TrendingDown } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { uploadImage } from "@/utils/uploadImage";
import ImageDropzone from "@/components/ImageDropzone";
import { formatCurrencyCOP, formatMoneyInput, parseMoneyInput } from "@/utils/formatters";
import { DEFAULT_PANEL_IMAGE, isValidImageUrl } from "@/utils/images";

type Investment = {
  id: number;
  name: string;
  investment_type: string;
  invested_amount: number;
  current_value: number;
  started_at: string | null;
  image_url: string | null;
  notes: string | null;
};

const emptyForm = {
  name: "",
  investment_type: "ETF",
  invested_amount: "",
  current_value: "",
  started_at: "",
  image_url: "",
  notes: "",
};

export default function InvestmentsManager({ initialItems }: { initialItems: Investment[] }) {
  const [items, setItems] = useState(initialItems);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const summary = useMemo(() => {
    const invested = items.reduce((s, it) => s + Number(it.invested_amount || 0), 0);
    const current = items.reduce((s, it) => s + Number(it.current_value || 0), 0);
    return { invested, current, pnl: current - invested };
  }, [items]);

  const portfolioDistribution = useMemo(() => {
    if (items.length === 0) {
      return [
        { label: "Fondos indexados", percentage: 45, color: "bg-primary" },
        { label: "Bonos", percentage: 30, color: "bg-emerald-500" },
        { label: "Efectivo", percentage: 25, color: "bg-rose-500" },
      ];
    }

    const totalCurrent = items.reduce((sum, item) => sum + Number(item.current_value || 0), 0);
    if (totalCurrent <= 0) {
      return [
        { label: "Fondos indexados", percentage: 0, color: "bg-primary" },
        { label: "Bonos", percentage: 0, color: "bg-emerald-500" },
        { label: "Efectivo", percentage: 0, color: "bg-rose-500" },
      ];
    }

    const byType = new Map<string, number>();
    items.forEach((item) => {
      const key = item.investment_type || "Otro";
      byType.set(key, (byType.get(key) || 0) + Number(item.current_value || 0));
    });

    const colors = ["bg-primary", "bg-emerald-500", "bg-rose-500"];
    return Array.from(byType.entries())
      .map(([label, amount], index) => ({
        label,
        percentage: Math.round((amount / totalCurrent) * 100),
        color: colors[index % colors.length],
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3);
  }, [items]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setIsOpen(true);
  };

  const openEdit = (item: Investment) => {
    setEditing(item);
    setForm({
      name: item.name,
      investment_type: item.investment_type,
      invested_amount: formatMoneyInput(String(item.invested_amount)),
      current_value: formatMoneyInput(String(item.current_value)),
      started_at: item.started_at ?? "",
      image_url: item.image_url ?? "",
      notes: item.notes ?? "",
    });
    setIsOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidImageUrl(form.image_url)) {
      setUploadError("La URL de imagen no es válida.");
      return;
    }

    setUploadError(null);

    const supabase = createClient();
    const payload = {
      name: form.name,
      investment_type: form.investment_type,
      invested_amount: parseMoneyInput(form.invested_amount),
      current_value: parseMoneyInput(form.current_value),
      started_at: form.started_at || null,
      image_url: form.image_url || null,
      notes: form.notes || null,
    };

    if (editing) {
      const { error } = await supabase.from("investments").update(payload).eq("id", editing.id).select("*").single();
      if (error) return;
    } else {
      const { error } = await supabase.from("investments").insert(payload);
      if (error) return;
    }

    const { data } = await supabase.from("investments").select("*").order("created_at", { ascending: false });
    setItems((data as Investment[]) || []);
    setIsOpen(false);
    setEditing(null);
  };

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar inversión?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("investments").delete().eq("id", id);
    if (!error) setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    setUploadProgress(0);
    setUploadError(null);
    try {
      const url = await uploadImage(file, "financepro/investments", {
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
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">Inversiones</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Gestiona tus posiciones y rendimiento actual.</p>
        </div>
        <button onClick={openCreate} className="w-full sm:w-auto justify-center px-4 py-2.5 bg-primary text-white rounded-xl font-bold flex items-center gap-2">
          <PlusCircle className="w-5 h-5" /> Nueva inversión
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-xl border bg-white dark:bg-slate-900"><p className="text-xs text-slate-500">Invertido</p><p className="text-xl sm:text-2xl leading-tight break-all font-black">{formatCurrencyCOP(summary.invested)}</p></div>
        <div className="p-4 rounded-xl border bg-white dark:bg-slate-900"><p className="text-xs text-slate-500">Valor actual</p><p className="text-xl sm:text-2xl leading-tight break-all font-black">{formatCurrencyCOP(summary.current)}</p></div>
        <div className="p-4 rounded-xl border bg-white dark:bg-slate-900"><p className="text-xs text-slate-500">Ganancia/Pérdida</p><p className={`text-xl sm:text-2xl leading-tight break-all font-black ${summary.pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{summary.pnl >= 0 ? "+" : "-"}{formatCurrencyCOP(Math.abs(summary.pnl))}</p></div>
      </div>

      <section className="mb-8 p-6 rounded-2xl border bg-white dark:bg-slate-900">
        <h3 className="text-2xl font-black mb-6">Distribución de cartera</h3>
        <div className="space-y-5">
          {portfolioDistribution.map((segment) => (
            <div key={segment.label}>
              <div className="flex items-center justify-between text-sm font-semibold mb-2">
                <span>{segment.label}</span>
                <span>{segment.percentage}%</span>
              </div>
              <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div className={`h-full rounded-full ${segment.color}`} style={{ width: `${Math.max(0, Math.min(segment.percentage, 100))}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map((item) => {
          const pnl = Number(item.current_value) - Number(item.invested_amount);
          return (
            <div key={item.id} className="bg-white dark:bg-slate-900 rounded-xl border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image_url || DEFAULT_PANEL_IMAGE} alt={item.name} className="w-14 h-14 rounded-lg object-cover" />
                  <div className="min-w-0">
                    <p className="font-bold break-words">{item.name}</p>
                    <p className="text-sm text-slate-500">{item.investment_type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(item)} className="p-2 border rounded-lg"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(item.id)} className="p-2 border rounded-lg text-rose-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-slate-500">Invertido</p><p className="font-bold">{formatCurrencyCOP(Number(item.invested_amount) || 0)}</p></div>
                <div><p className="text-slate-500">Actual</p><p className="font-bold">{formatCurrencyCOP(Number(item.current_value) || 0)}</p></div>
              </div>
              <div className={`mt-2 flex items-center gap-1 text-sm font-medium ${
                pnl >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}>
                {pnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {pnl >= 0 ? "+" : "-"}{formatCurrencyCOP(Math.abs(pnl))}
              </div>
              {item.notes && <p className="mt-2 text-sm text-slate-500 break-words">{item.notes}</p>}
            </div>
          );
        })}
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={save} className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border bg-white dark:bg-slate-900 p-6 space-y-4">
            <h3 className="text-xl font-bold">{editing ? "Editar inversión" : "Nueva inversión"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input required value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="Nombre" className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800" />
              <input required value={form.investment_type} onChange={(e) => setForm((s) => ({ ...s, investment_type: e.target.value }))} placeholder="Tipo" className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800" />
              <input required type="text" inputMode="numeric" value={form.invested_amount} onChange={(e) => setForm((s) => ({ ...s, invested_amount: formatMoneyInput(e.target.value) }))} placeholder="Monto invertido" className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800" />
              <input required type="text" inputMode="numeric" value={form.current_value} onChange={(e) => setForm((s) => ({ ...s, current_value: formatMoneyInput(e.target.value) }))} placeholder="Valor actual" className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800" />
              <input type="date" value={form.started_at} onChange={(e) => setForm((s) => ({ ...s, started_at: e.target.value }))} className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800" />
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
            <textarea value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} placeholder="Notas" className="w-full px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800" />
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
