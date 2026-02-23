"use client";

import { useMemo, useState } from "react";
import { PlusCircle, Pencil, Trash2, Search, Download, Eye, Tag } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { exportToCSV } from "@/utils/export";
import { formatCurrencyCOP, formatMoneyInput, parseMoneyInput } from "@/utils/formatters";
import { AppCategory, resolveCategoryIcon } from "@/utils/categories";
import { pushNotification } from "@/utils/notifications";
import Link from "next/link";
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

export default function BillsManager({
  initialBills,
  initialCategories,
  openNewByDefault = false,
}: {
  initialBills: Bill[];
  initialCategories: AppCategory[];
  openNewByDefault?: boolean;
}) {
  const [bills, setBills] = useState(initialBills);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(openNewByDefault);
  const [editing, setEditing] = useState<Bill | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [visibleBills, setVisibleBills] = useState(12);

  const billIconByCategory = useMemo(() => {
    const map = new Map<string, ReturnType<typeof resolveCategoryIcon>>();
    initialCategories
      .filter((category) => category.applies_to === "bill")
      .forEach((category) => {
        map.set(category.name.toLowerCase(), resolveCategoryIcon(category.icon));
      });
    return map;
  }, [initialCategories]);
  const [form, setForm] = useState({ title: "", category: "General", description: "", amount: "", due_date: "", status: "Pendiente", is_urgent: false, recurrence: "Mensual" });

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 2600);
  };

  const filtered = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return bills
      .filter((bill) => {
      const q = `${bill.title} ${bill.description || ""}`.toLowerCase().includes(query.toLowerCase());
      const s = statusFilter === "all" || bill.status === statusFilter;
      return q && s;
      })
      .sort((a, b) => {
        const dateA = new Date(`${a.due_date}T00:00:00`).getTime();
        const dateB = new Date(`${b.due_date}T00:00:00`).getTime();
        const distanceA = Math.abs(dateA - today.getTime());
        const distanceB = Math.abs(dateB - today.getTime());

        if (distanceA !== distanceB) return distanceA - distanceB;

        return dateB - dateA;
      });
  }, [bills, query, statusFilter]);

  const displayedBills = filtered.slice(0, visibleBills);

  const rows = filtered.map((b) => ({
    Titulo: b.title,
    Descripcion: b.description || "",
    Categoria: b.category || "General",
    Monto: Math.round(Number(b.amount)),
    Vencimiento: new Date(`${b.due_date}T00:00:00`).toLocaleDateString("es-ES"),
    Estado: b.status,
    Urgente: b.is_urgent ? "Sí" : "No",
    Recurrencia: b.recurrence || "",
  }));

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", category: "General", description: "", amount: "", due_date: new Date().toISOString().slice(0, 10), status: "Pendiente", is_urgent: false, recurrence: "Mensual" });
    setOpen(true);
  };

  const openEdit = (bill: Bill) => {
    setEditing(bill);
    setForm({
      title: bill.title,
      category: bill.category || "General",
      description: bill.description || "",
      amount: formatMoneyInput(String(bill.amount)),
      due_date: bill.due_date,
      status: bill.status,
      is_urgent: bill.is_urgent,
      recurrence: bill.recurrence || "",
    });
    setOpen(true);
  };

  const reload = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("upcoming_bills").select("*").order("due_date", { ascending: true });
    setBills((data as Bill[]) || []);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim() || !form.due_date || parseMoneyInput(form.amount) <= 0) {
      showToast("error", "Completa título, fecha y monto válido.");
      return;
    }

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

    const result = editing
      ? await supabase.from("upcoming_bills").update(payload).eq("id", editing.id)
      : await supabase.from("upcoming_bills").insert(payload);

    if (result.error) {
      showToast("error", `No se pudo guardar: ${result.error.message}`);
      return;
    }

    await reload();
    setOpen(false);
    setEditing(null);

    const amount = parseMoneyInput(form.amount);
    pushNotification({
      id: `bill-action-${editing ? "edit" : "create"}-${Date.now()}`,
      title: editing ? `Factura actualizada: ${form.title}` : `Factura creada: ${form.title}`,
      message: `${editing ? "Se actualizó" : "Se registró"} con vencimiento ${new Date(`${form.due_date}T00:00:00`).toLocaleDateString("es-CO")} por ${formatCurrencyCOP(amount)}.`,
      time: "ahora",
      unread: true,
      kind: "bill",
      actionLabel: "Ver factura",
      actionHref: "/facturas",
      dueDateISO: form.due_date,
      isPaid: form.status === "Pagado",
    });

    showToast("success", editing ? "Factura actualizada." : "Factura creada con éxito.");
  };

  const remove = async (id: number) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("upcoming_bills").delete().eq("id", confirmDeleteId);
    setDeleting(false);

    if (error) {
      showToast("error", `No se pudo eliminar: ${error.message}`);
      setConfirmDeleteId(null);
      return;
    }

    pushNotification({
      id: `bill-action-delete-${confirmDeleteId}-${Date.now()}`,
      title: "Factura eliminada",
      message: "El registro se eliminó correctamente.",
      time: "ahora",
      unread: true,
      kind: "bill",
      actionLabel: "Ver facturas",
      actionHref: "/facturas",
    });

    setBills((prev) => prev.filter((b) => b.id !== confirmDeleteId));
    setConfirmDeleteId(null);
    showToast("success", "Factura eliminada correctamente.");
  };

  return (
    <>
      <AppToast toast={toast} onClose={() => setToast(null)} />

      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">Facturas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Gestiona facturas, estados y vencimientos.</p>
        </div>
        <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button onClick={() => exportToCSV(rows, "facturas.csv")} className="justify-center px-3 py-2 rounded-xl border text-sm font-bold flex items-center gap-2"><Download className="w-4 h-4" /> CSV</button>
          <button onClick={openCreate} className="justify-center px-4 py-2.5 bg-primary text-white rounded-xl font-bold flex items-center gap-2"><PlusCircle className="w-5 h-5" /> Nueva factura</button>
        </div>
      </header>

      <div className="mb-6 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisibleBills(12);
            }}
            placeholder="Buscar factura..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border bg-white dark:bg-slate-900"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setVisibleBills(12);
          }}
          className="px-3 py-2 rounded-lg border bg-white dark:bg-slate-900"
        >
          <option value="all">Todos</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Urgente">Urgente</option>
          <option value="Pagado">Pagado</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase text-slate-500 font-bold bg-slate-50 dark:bg-slate-800/30">
                <th className="px-6 py-4">Título</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4">Vencimiento</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Monto</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayedBills.map((bill) => (
                <tr key={bill.id}>
                  <td className="px-6 py-4"><p className="font-medium">{bill.title}</p><p className="text-xs text-slate-500">{bill.description || "Sin descripción"}</p></td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const CategoryIcon = billIconByCategory.get((bill.category || "").toLowerCase()) || Tag;
                        return <CategoryIcon className="w-4 h-4 text-primary" />;
                      })()}
                      <span>{bill.category || "General"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">{new Date(`${bill.due_date}T00:00:00`).toLocaleDateString("es-ES")}</td>
                  <td className="px-6 py-4"><span className={`text-xs font-bold px-2 py-1 rounded-full ${bill.is_urgent ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-600"}`}>{bill.status}</span></td>
                  <td className="px-6 py-4 text-right font-bold">{formatCurrencyCOP(Number(bill.amount) || 0)}</td>
                  <td className="px-6 py-4"><div className="flex items-center justify-end gap-2"><Link href={`/facturas/${bill.id}`} className="p-2 border rounded-lg"><Eye className="w-4 h-4" /></Link><button onClick={() => openEdit(bill)} className="p-2 border rounded-lg"><Pencil className="w-4 h-4" /></button><button onClick={() => remove(bill.id)} className="p-2 border rounded-lg text-rose-600"><Trash2 className="w-4 h-4" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {visibleBills < filtered.length ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleBills((prev) => prev + 12)}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cargar más
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Eliminar factura"
        message="Esta acción no se puede deshacer. ¿Deseas continuar?"
        loading={deleting}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
      />

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={save} className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border bg-white dark:bg-slate-900 p-6 space-y-4">
            <h3 className="text-xl font-bold">{editing ? "Editar factura" : "Nueva factura"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input required value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} placeholder="Título" className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800 md:col-span-2" />
              <select value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))} className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800">
                <option value="General">General</option>
                {initialCategories.map((category) => (
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
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border">Cancelar</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-white font-semibold">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
