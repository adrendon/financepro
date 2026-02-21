"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { AppCategory } from "@/utils/categories";
import { formatCurrencyCOP, formatMoneyInput, parseMoneyInput } from "@/utils/formatters";
import {
  ArrowLeft,
  Pencil,
  CreditCard,
  FileText,
  Mail,
  Share2,
  Trash2,
} from "lucide-react";
import AppToast from "@/components/AppToast";
import ConfirmDialog from "@/components/ConfirmDialog";

type Bill = {
  id: number;
  title: string;
  category: string;
  description: string | null;
  amount: number;
  due_date: string;
  status: string;
  is_urgent: boolean;
  recurrence: string | null;
};

export default function BillDetailManager({
  initialBill,
  categories,
}: {
  initialBill: Bill;
  categories: AppCategory[];
}) {
  const router = useRouter();
  const [bill, setBill] = useState(initialBill);
  const [editing, setEditing] = useState(false);
  const [confirmPay, setConfirmPay] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({
    title: initialBill.title,
    category: initialBill.category || "General",
    description: initialBill.description || "",
    amount: formatMoneyInput(String(initialBill.amount)),
    due_date: initialBill.due_date,
    status: initialBill.status,
    is_urgent: initialBill.is_urgent,
    recurrence: initialBill.recurrence || "",
  });

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 2600);
  };

  const statusPillClass = useMemo(() => {
    if (bill.status === "Pagado") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    if (bill.status === "Urgente" || bill.is_urgent) return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  }, [bill.is_urgent, bill.status]);

  const saveChanges = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.title.trim() || !form.due_date || parseMoneyInput(form.amount) <= 0) {
      showToast("error", "Completa título, fecha y monto válido.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const payload = {
      title: form.title,
      category: form.category || "General",
      description: form.description || null,
      amount: parseMoneyInput(form.amount),
      due_date: form.due_date,
      status: form.status,
      is_urgent: form.is_urgent,
      recurrence: form.recurrence || null,
    };

    const { error } = await supabase.from("upcoming_bills").update(payload).eq("id", bill.id);
    setSaving(false);

    if (error) {
      showToast("error", `No se pudo guardar: ${error.message}`);
      return;
    }

    setBill((prev) => ({ ...prev, ...payload }));
    setEditing(false);
    showToast("success", "Factura actualizada con éxito.");
  };

  const markAsPaid = async () => {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("upcoming_bills")
      .update({ status: "Pagado", is_urgent: false })
      .eq("id", bill.id);
    setSaving(false);

    if (error) {
      showToast("error", `No se pudo actualizar estado: ${error.message}`);
      return;
    }

    setBill((prev) => ({ ...prev, status: "Pagado", is_urgent: false }));
    setForm((prev) => ({ ...prev, status: "Pagado", is_urgent: false }));
    showToast("success", "Factura marcada como pagada.");
  };

  const deleteBill = async () => {
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("upcoming_bills").delete().eq("id", bill.id);
    setDeleting(false);

    if (error) {
      setConfirmDelete(false);
      showToast("error", `No se pudo eliminar: ${error.message}`);
      return;
    }

    showToast("success", "Factura eliminada correctamente.");
    router.push("/facturas");
    router.refresh();
  };

  const quickAction = (name: string) => {
    showToast("success", `${name} generado.`);
  };

  return (
    <div className="space-y-6">
      {toast ? (
        <AppToast toast={toast} onClose={() => setToast(null)} />
      ) : null}

      <ConfirmDialog
        open={confirmPay}
        title="Confirmar pago"
        message="¿Deseas marcar esta factura como pagada ahora?"
        loading={saving}
        intent="primary"
        confirmLabel="Sí, pagar"
        loadingLabel="Procesando pago..."
        onCancel={() => setConfirmPay(false)}
        onConfirm={async () => {
          await markAsPaid();
          setConfirmPay(false);
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar factura"
        message="¿Seguro que deseas eliminar esta factura?"
        loading={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={deleteBill}
      />

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/facturas" className="inline-flex items-center gap-1 hover:text-primary">
              <ArrowLeft className="w-4 h-4" /> Volver a facturas
            </Link>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Detalle de factura</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold">
            <Pencil className="w-4 h-4" /> Editar factura
          </button>
          <button onClick={() => setConfirmPay(true)} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white font-semibold disabled:opacity-50">
            <CreditCard className="w-4 h-4" /> Pagar ahora
          </button>
          <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rose-600 text-white font-semibold">
            <Trash2 className="w-4 h-4" /> Eliminar
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{bill.title}</h2>
            <p className="text-slate-500">{bill.description || "Sin descripción"}</p>
          </div>
          <div className="text-right">
            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase ${statusPillClass}`}>{bill.status}</span>
            <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">{formatCurrencyCOP(Number(bill.amount) || 0)}</div>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-slate-500">Vencimiento</p>
            <p className="font-semibold text-slate-900 dark:text-white">{new Date(`${bill.due_date}T00:00:00`).toLocaleDateString("es-CO")}</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-slate-500">Categoría</p>
            <p className="font-semibold text-slate-900 dark:text-white">{bill.category || "General"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-slate-500">Recurrencia</p>
            <p className="font-semibold text-slate-900 dark:text-white">{bill.recurrence || "No definida"}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button onClick={() => quickAction("PDF")} className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold">
          <FileText className="w-4 h-4" /> Descargar PDF
        </button>
        <button onClick={() => quickAction("Correo")} className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold">
          <Mail className="w-4 h-4" /> Enviar por email
        </button>
        <button onClick={() => quickAction("Enlace compartido")} className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold">
          <Share2 className="w-4 h-4" /> Compartir recibo
        </button>
      </section>

      {editing ? (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={saveChanges} className="w-full max-w-lg rounded-xl border bg-white dark:bg-slate-900 p-6 space-y-4">
            <h3 className="text-xl font-bold">Editar factura</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input required value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} placeholder="Título" className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800 md:col-span-2" />
              <select value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))} className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800">
                <option value="General">General</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>{category.name}</option>
                ))}
              </select>
              <input type="text" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} placeholder="Descripción" className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800 md:col-span-2" />
              <input required type="text" inputMode="numeric" value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: formatMoneyInput(e.target.value) }))} placeholder="Monto" className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800" />
              <input required type="date" value={form.due_date} onChange={(e) => setForm((s) => ({ ...s, due_date: e.target.value }))} className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800" />
              <select value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))} className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800">
                <option>Pendiente</option>
                <option>Urgente</option>
                <option>Pagado</option>
              </select>
              <input value={form.recurrence} onChange={(e) => setForm((s) => ({ ...s, recurrence: e.target.value }))} placeholder="Recurrencia" className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800" />
              <label className="md:col-span-2 text-sm flex items-center gap-2"><input type="checkbox" checked={form.is_urgent} onChange={(e) => setForm((s) => ({ ...s, is_urgent: e.target.checked }))} /> Marcar como urgente</label>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg border">Cancelar</button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-white font-semibold disabled:opacity-50">{saving ? "Guardando..." : "Guardar"}</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
