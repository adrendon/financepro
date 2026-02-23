"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  PlusCircle,
  Pencil,
  Trash2,
  Receipt,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Undo2,
  CheckSquare,
  Square,
  History,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import NewTransactionModal from "./NewTransactionModal";
import { exportToCSV, exportToExcel, exportToPDF } from "@/utils/export";
import { formatCurrencyCOP, formatMoneyInput, parseMoneyInput } from "@/utils/formatters";
import { AppCategory, resolveCategoryIcon } from "@/utils/categories";
import { pushNotification } from "@/utils/notifications";
import AppToast from "@/components/AppToast";
import ConfirmDialog from "@/components/ConfirmDialog";

type Tx = {
  id: number;
  merchant: string;
  category: string;
  amount: number;
  type: "income" | "expense";
  date: string;
};

type Period = "this-month" | "last-month" | "this-year" | "all-time";

type RuleType = "any" | "income" | "expense";

type RuleRow = {
  id: number;
  match_pattern: string;
  category: string;
  inferred_type: "income" | "expense" | null;
};

type TemplateRow = {
  id: number;
  name: string;
  merchant: string;
  category: string;
  amount: number;
  type: "income" | "expense";
  day_of_month: number;
  active: boolean;
};

type ChangeLogRow = {
  id: number;
  action: string;
  detail: string;
  created_at: string;
};

type MerchantRule = {
  id: number;
  pattern: string;
  category: string;
  type: RuleType;
};

type RecurringTemplate = {
  id: number;
  name: string;
  merchant: string;
  category: string;
  amount: number;
  type: "income" | "expense";
  dayOfMonth: number;
};

type ChangeLog = {
  id: number;
  at: string;
  action: string;
  detail: string;
};

type UndoAction =
  | { kind: "create"; createdId: number }
  | { kind: "delete"; rows: Tx[] }
  | { kind: "bulk-update"; rows: Tx[] };

const HISTORY_ACTION_LABEL: Record<string, string> = {
  create: "Creación",
  edit: "Edición",
  delete: "Eliminación",
  "bulk-update": "Edición masiva",
  undo: "Deshacer",
  rule: "Regla",
  template: "Plantilla",
  recurring: "Recurrente",
};

const getHistoryActionLabel = (action: string) => {
  return HISTORY_ACTION_LABEL[action] || "Cambio";
};

const getHistoryDetailLabel = (detail: string) => {
  return detail
    .replace(/transacci[oó]n\s+#\d+/gi, "transacción")
    .replace(/\s+#\d+/g, "")
    .replace(/\(\s*([^()]+)\s*\)$/, ": $1")
    .replace(/\s{2,}/g, " ")
    .trim();
};

function makeTempId() {
  return -Math.floor(Date.now() + Math.random() * 1000);
}

const dateMatchesPeriod = (dateStr: string, period: Period, now: Date) => {
  if (period === "all-time") return true;
  const d = new Date(`${dateStr}T00:00:00`);

  if (period === "this-month") {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }

  if (period === "last-month") {
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
  }

  return d.getFullYear() === now.getFullYear();
};

export default function TransactionsManager({
  initialTransactions,
  initialCategories,
  initialRules,
  initialTemplates,
  initialChangeLog,
  todayISO,
}: {
  initialTransactions: Tx[];
  initialCategories: AppCategory[];
  initialRules: RuleRow[];
  initialTemplates: TemplateRow[];
  initialChangeLog: ChangeLogRow[];
  todayISO: string;
}) {
  const [transactions, setTransactions] = useState<Tx[]>(initialTransactions);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [period, setPeriod] = useState<Period>("this-month");
  const [visibleRows, setVisibleRows] = useState(20);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tx | null>(null);
  const [modalKey, setModalKey] = useState(0);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<number[]>([]);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkType, setBulkType] = useState<"keep" | "income" | "expense">("keep");
  const [bulkDate, setBulkDate] = useState("");
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const [rules, setRules] = useState<MerchantRule[]>(
    (initialRules || []).map((rule) => ({
      id: rule.id,
      pattern: rule.match_pattern,
      category: rule.category,
      type: rule.inferred_type ?? "any",
    }))
  );
  const [templates, setTemplates] = useState<RecurringTemplate[]>(
    (initialTemplates || []).map((template) => ({
      id: template.id,
      name: template.name,
      merchant: template.merchant,
      category: template.category,
      amount: Number(template.amount) || 0,
      type: template.type,
      dayOfMonth: template.day_of_month,
    }))
  );
  const [historyLog, setHistoryLog] = useState<ChangeLog[]>(
    (initialChangeLog || []).map((row) => ({
      id: row.id,
      at: row.created_at,
      action: row.action,
      detail: row.detail,
    }))
  );
  const [rulePattern, setRulePattern] = useState("");
  const [ruleCategory, setRuleCategory] = useState("");
  const [ruleType, setRuleType] = useState<RuleType>("any");
  const [templateName, setTemplateName] = useState("");
  const [templateMerchant, setTemplateMerchant] = useState("");
  const [templateCategory, setTemplateCategory] = useState("");
  const [templateAmount, setTemplateAmount] = useState("");
  const [templateType, setTemplateType] = useState<"income" | "expense">("expense");
  const [templateDay, setTemplateDay] = useState("1");
  const referenceNow = useMemo(() => new Date(`${todayISO}T00:00:00`), [todayISO]);

  const transactionIconByCategory = useMemo(() => {
    const map = new Map<string, ReturnType<typeof resolveCategoryIcon>>();
    initialCategories
      .filter((category) => category.applies_to === "transaction")
      .forEach((category) => {
        map.set(category.name.toLowerCase(), resolveCategoryIcon(category.icon));
      });
    return map;
  }, [initialCategories]);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 2600);
  };

  const appendHistory = async (action: string, detail: string, metadata: Record<string, unknown> = {}) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("transaction_change_log")
      .insert([{ action, detail, metadata }])
      .select("id, action, detail, created_at")
      .single();

    if (error) {
      const fallback: ChangeLog = {
        id: makeTempId(),
        at: new Date().toISOString(),
        action,
        detail: `${detail} (local)`,
      };
      setHistoryLog((prev) => [fallback, ...prev].slice(0, 80));
      return;
    }

    const row = data as ChangeLogRow;
    const item: ChangeLog = {
      id: row.id,
      at: row.created_at,
      action: row.action,
      detail: row.detail,
    };

    setHistoryLog((prev) => [item, ...prev].slice(0, 80));
  };

  const armUndo = (action: UndoAction) => {
    setUndoAction(action);
    window.setTimeout(() => {
      setUndoAction((current) => (current === action ? null : current));
    }, 10000);
  };

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesQuery =
        tx.merchant.toLowerCase().includes(query.toLowerCase()) ||
        tx.category.toLowerCase().includes(query.toLowerCase());
      const matchesType = typeFilter === "all" || tx.type === typeFilter;
      const matchesPeriod = dateMatchesPeriod(tx.date, period, referenceNow);
      return matchesQuery && matchesType && matchesPeriod;
    });
  }, [transactions, query, typeFilter, period, referenceNow]);

  const paginated = filtered.slice(0, visibleRows);
  const visibleIds = paginated.map((tx) => tx.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const totals = useMemo(() => {
    const totalIncome = filtered
      .filter((tx) => tx.type === "income")
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0);
    const totalExpense = filtered
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0);
    return { totalIncome, totalExpense, net: totalIncome - totalExpense };
  }, [filtered]);

  const exportRows = filtered.map((tx) => ({
    ID: tx.id,
    Fecha: new Date(`${tx.date}T00:00:00`).toLocaleDateString("es-ES"),
    Tipo: tx.type === "income" ? "Ingreso" : "Gasto",
    Comercio: tx.merchant,
    Categoria: tx.category,
    Monto: Math.round(Number(tx.amount)),
  }));

  const inferByMerchant = (merchant: string) => {
    const normalized = merchant.toLowerCase();
    const found = rules.find((rule) => normalized.includes(rule.pattern.toLowerCase()));
    if (!found) return null;
    return {
      category: found.category,
      type: found.type === "any" ? undefined : found.type,
    };
  };

  const toggleRow = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleVisible = () => {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        return prev.filter((id) => !visibleIds.includes(id));
      }
      const merged = new Set([...prev, ...visibleIds]);
      return Array.from(merged);
    });
  };

  const confirmDelete = async () => {
    if (confirmDeleteIds.length === 0) return;
    const ids = [...confirmDeleteIds];
    const previousRows = transactions.filter((tx) => ids.includes(tx.id));

    setBusyId(ids[0]);
    const supabase = createClient();
    const { error } = await supabase.from("transactions").delete().in("id", ids);
    if (error) {
      showToast("error", `No se pudo eliminar: ${error.message}`);
    } else {
      pushNotification({
        id: `tx-action-delete-${Date.now()}`,
        title: ids.length === 1 ? "Transacción eliminada" : "Transacciones eliminadas",
        message:
          ids.length === 1
            ? `Se eliminó ${previousRows[0]?.merchant || "1 transacción"}.`
            : `Se eliminaron ${ids.length} transacciones.`,
        time: "ahora",
        unread: true,
        kind: "system",
        actionLabel: "Ver transacciones",
        actionHref: "/transacciones",
      });

      setTransactions((prev) => prev.filter((tx) => !ids.includes(tx.id)));
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      armUndo({ kind: "delete", rows: previousRows });
      void appendHistory(
        "delete",
        ids.length === 1
          ? `Transacción eliminada: ${previousRows[0]?.merchant || "registro"}`
          : `Se eliminaron ${ids.length} transacciones`,
        { transaction_ids: ids }
      );
      showToast("success", ids.length === 1 ? "Transacción eliminada." : "Transacciones eliminadas.");
    }
    setBusyId(null);
    setConfirmDeleteIds([]);
  };

  const reload = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("transactions").select("*").order("date", { ascending: false });
    setTransactions((data as Tx[]) || []);
  };

  const runUndo = async () => {
    if (!undoAction) return;
    const supabase = createClient();

    if (undoAction.kind === "create") {
      const { error } = await supabase.from("transactions").delete().eq("id", undoAction.createdId);
      if (error) {
        showToast("error", `No se pudo deshacer: ${error.message}`);
        return;
      }
      setTransactions((prev) => prev.filter((tx) => tx.id !== undoAction.createdId));
      void appendHistory("undo", "Se revirtió una creación de transacción", { created_id: undoAction.createdId });
      showToast("success", "Creación revertida.");
      setUndoAction(null);
      return;
    }

    if (undoAction.kind === "bulk-update") {
      const payload = undoAction.rows.map((row) => ({
        id: row.id,
        merchant: row.merchant,
        category: row.category,
        amount: row.amount,
        type: row.type,
        date: row.date,
      }));
      const { error } = await supabase.from("transactions").upsert(payload, { onConflict: "id" });
      if (error) {
        showToast("error", `No se pudo deshacer: ${error.message}`);
        return;
      }
      setTransactions((prev) => prev.map((tx) => undoAction.rows.find((row) => row.id === tx.id) ?? tx));
      void appendHistory("undo", `Revertida edición masiva (${undoAction.rows.length})`, { count: undoAction.rows.length });
      showToast("success", "Edición masiva revertida.");
      setUndoAction(null);
      return;
    }

    const payloadWithIds = undoAction.rows.map((row) => ({
      id: row.id,
      merchant: row.merchant,
      category: row.category,
      amount: row.amount,
      type: row.type,
      date: row.date,
    }));

    const restoreWithIds = await supabase.from("transactions").insert(payloadWithIds).select("id, merchant, category, amount, type, date");
    if (restoreWithIds.error) {
      const fallback = undoAction.rows.map((row) => ({
        merchant: row.merchant,
        category: row.category,
        amount: row.amount,
        type: row.type,
        date: row.date,
      }));
      const restoreWithoutIds = await supabase.from("transactions").insert(fallback).select("id, merchant, category, amount, type, date");
      if (restoreWithoutIds.error) {
        showToast("error", `No se pudo deshacer: ${restoreWithoutIds.error.message}`);
        return;
      }
      await reload();
    } else {
      const restoredRows = (restoreWithIds.data as Tx[]) || [];
      setTransactions((prev) => [...restoredRows, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
    }

    void appendHistory("undo", `Revertida eliminación (${undoAction.rows.length})`, { count: undoAction.rows.length });
    showToast("success", "Eliminación revertida.");
    setUndoAction(null);
  };

  const applyBulkChanges = async () => {
    if (selectedIds.length === 0) {
      showToast("error", "Selecciona al menos una transacción.");
      return;
    }

    const payload: Partial<Pick<Tx, "category" | "type" | "date">> = {};
    if (bulkCategory.trim()) payload.category = bulkCategory.trim();
    if (bulkType !== "keep") payload.type = bulkType;
    if (bulkDate) payload.date = bulkDate;

    if (Object.keys(payload).length === 0) {
      showToast("error", "Define al menos un cambio masivo.");
      return;
    }

    const previousRows = transactions.filter((tx) => selectedIds.includes(tx.id));
    const supabase = createClient();
    const { error } = await supabase.from("transactions").update(payload).in("id", selectedIds);
    if (error) {
      showToast("error", `No se pudo aplicar la edición masiva: ${error.message}`);
      return;
    }

    setTransactions((prev) => prev.map((tx) => (selectedIds.includes(tx.id) ? { ...tx, ...payload } : tx)));
    pushNotification({
      id: `tx-action-bulk-update-${Date.now()}`,
      title: "Edición masiva aplicada",
      message: `Se actualizaron ${selectedIds.length} transacciones.`,
      time: "ahora",
      unread: true,
      kind: "system",
      actionLabel: "Revisar cambios",
      actionHref: "/transacciones",
    });
    armUndo({ kind: "bulk-update", rows: previousRows });
    void appendHistory("bulk-update", `Editadas ${selectedIds.length} transacciones`, { ids: selectedIds, payload });
    setSelectedIds([]);
    setBulkCategory("");
    setBulkType("keep");
    setBulkDate("");
    showToast("success", "Cambios masivos aplicados.");
  };

  const addRule = async () => {
    const pattern = rulePattern.trim();
    const category = ruleCategory.trim();
    if (!pattern || !category) {
      showToast("error", "Completa patrón y categoría para la regla.");
      return;
    }

    const inferredType = ruleType === "any" ? null : ruleType;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("transaction_rules")
      .insert([{ match_pattern: pattern, category, inferred_type: inferredType }])
      .select("id, match_pattern, category, inferred_type")
      .single();

    if (error) {
      const localRule: MerchantRule = {
        id: makeTempId(),
        pattern,
        category,
        type: ruleType,
      };
      setRules((prev) => [localRule, ...prev]);
      void appendHistory("rule", `Regla guardada localmente "${pattern}" → ${category}`, { local: true });
      showToast("success", "Regla guardada localmente (sin sincronización)." );
      return;
    }

    const row = data as RuleRow;
    setRules((prev) => [
      {
        id: row.id,
        pattern: row.match_pattern,
        category: row.category,
        type: row.inferred_type ?? "any",
      },
      ...prev,
    ]);
    void appendHistory("rule", `Nueva regla "${pattern}" → ${category}`, { pattern, category, inferred_type: inferredType });
    setRulePattern("");
    setRuleCategory("");
    setRuleType("any");
    showToast("success", "Regla guardada.");
  };

  const removeRule = async (id: number) => {
    if (id < 0) {
      setRules((prev) => prev.filter((rule) => rule.id !== id));
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from("transaction_rules").delete().eq("id", id);
    if (error) {
      showToast("error", `No se pudo eliminar la regla: ${error.message}`);
      return;
    }
    setRules((prev) => prev.filter((rule) => rule.id !== id));
    void appendHistory("rule", "Regla eliminada", { id });
  };

  const addTemplate = async () => {
    const merchant = templateMerchant.trim();
    const category = templateCategory.trim();
    const amount = parseMoneyInput(templateAmount);
    const day = Math.min(Math.max(Number(templateDay), 1), 28);
    if (!merchant || !category || !amount || amount <= 0) {
      showToast("error", "Completa comercio, categoría y monto de la plantilla.");
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("recurring_transaction_templates")
      .insert([
        {
          name: templateName.trim() || merchant,
          merchant,
          category,
          amount,
          type: templateType,
          day_of_month: day,
          active: true,
        },
      ])
      .select("id, name, merchant, category, amount, type, day_of_month, active")
      .single();

    if (error) {
      const localTemplate: RecurringTemplate = {
        id: makeTempId(),
        name: templateName.trim() || merchant,
        merchant,
        category,
        amount,
        type: templateType,
        dayOfMonth: day,
      };
      setTemplates((prev) => [localTemplate, ...prev]);
      void appendHistory("template", `Plantilla guardada localmente: ${localTemplate.name}`, { local: true });
      showToast("success", "Plantilla guardada localmente (sin sincronización).");
      return;
    }

    const row = data as TemplateRow;
    setTemplates((prev) => [
      {
        id: row.id,
        name: row.name,
        merchant: row.merchant,
        category: row.category,
        amount: Number(row.amount) || 0,
        type: row.type,
        dayOfMonth: row.day_of_month,
      },
      ...prev,
    ]);
    void appendHistory("template", `Plantilla recurrente creada: ${row.name}`, { template_id: row.id });
    setTemplateName("");
    setTemplateMerchant("");
    setTemplateCategory("");
    setTemplateAmount("");
    setTemplateType("expense");
    setTemplateDay("1");
    showToast("success", "Plantilla guardada.");
  };

  const removeTemplate = async (id: number) => {
    if (id < 0) {
      setTemplates((prev) => prev.filter((template) => template.id !== id));
      return;
    }
    const supabase = createClient();
    const { error } = await supabase
      .from("recurring_transaction_templates")
      .update({ active: false })
      .eq("id", id);

    if (error) {
      showToast("error", `No se pudo quitar la plantilla: ${error.message}`);
      return;
    }

    setTemplates((prev) => prev.filter((template) => template.id !== id));
    void appendHistory("template", "Plantilla desactivada", { id });
  };

  const runTemplateForCurrentMonth = async (template: RecurringTemplate) => {
    const year = referenceNow.getFullYear();
    const month = referenceNow.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const day = Math.min(template.dayOfMonth, lastDay);
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const alreadyExists = transactions.some(
      (tx) =>
        tx.date === date &&
        tx.merchant.toLowerCase() === template.merchant.toLowerCase() &&
        tx.category.toLowerCase() === template.category.toLowerCase() &&
        tx.type === template.type &&
        Math.abs(Number(tx.amount) - Number(template.amount)) < 0.0001
    );

    if (alreadyExists) {
      showToast("error", `Ya existe una transacción para "${template.name}" este mes.`);
      return false;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("transactions")
      .insert([
        {
          merchant: template.merchant,
          category: template.category,
          amount: template.amount,
          type: template.type,
          date,
        },
      ])
      .select("id, merchant, category, amount, type, date")
      .single();

    if (error) {
      showToast("error", `No se pudo crear transacción recurrente: ${error.message}`);
      return false;
    }

    const inserted = data as Tx;
    setTransactions((prev) => [inserted, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
    pushNotification({
      id: `tx-action-recurring-${inserted.id}-${Date.now()}`,
      title: `Transacción recurrente: ${template.name}`,
      message: `${template.type === "income" ? "Ingreso" : "Gasto"} por ${formatCurrencyCOP(Number(template.amount) || 0)} generado para ${new Date(`${date}T00:00:00`).toLocaleDateString("es-CO")}.`,
      time: "ahora",
      unread: true,
      kind: "system",
      actionLabel: "Ver transacciones",
      actionHref: "/transacciones",
    });
    armUndo({ kind: "create", createdId: inserted.id });
    void appendHistory("recurring", `Generada recurrente: ${template.name} (${date})`, { template_id: template.id, tx_id: inserted.id });
    return true;
  };

  const runAllTemplates = async () => {
    if (templates.length === 0) {
      showToast("error", "No hay plantillas recurrentes configuradas.");
      return;
    }

    let created = 0;
    for (const template of templates) {
      const ok = await runTemplateForCurrentMonth(template);
      if (ok) created += 1;
    }

    if (created > 0) {
      showToast("success", `Se generaron ${created} transacciones recurrentes.`);
    }
  };

  return (
    <>
      <AppToast toast={toast} onClose={() => setToast(null)} />

      {undoAction ? (
        <div className="mb-4 border border-primary/30 bg-primary/10 rounded-xl px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-sm font-medium text-primary">Acción aplicada. Puedes deshacer durante 10 segundos.</p>
          <button
            type="button"
            onClick={runUndo}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/40 text-primary font-semibold hover:bg-white dark:hover:bg-slate-900"
          >
            <Undo2 className="w-4 h-4" /> Deshacer
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmDeleteIds.length > 0}
        title={confirmDeleteIds.length === 1 ? "Eliminar transacción" : "Eliminar transacciones"}
        message={
          confirmDeleteIds.length === 1
            ? "¿Deseas eliminar esta transacción?"
            : `¿Deseas eliminar ${confirmDeleteIds.length} transacciones seleccionadas?`
        }
        loading={busyId !== null}
        onCancel={() => setConfirmDeleteIds([])}
        onConfirm={confirmDelete}
      />

      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">Historial de Transacciones</h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg">Revisa y gestiona todos tus movimientos financieros.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button onClick={() => exportToCSV(exportRows, "transacciones.csv")} className="px-3 py-2 rounded-xl border text-sm font-bold flex items-center gap-2">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => exportToExcel(exportRows, "transacciones.xlsx")} className="px-3 py-2 rounded-xl border text-sm font-bold flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button onClick={() => exportToPDF(exportRows, "transacciones.pdf", "Reporte de Transacciones")} className="px-3 py-2 rounded-xl border text-sm font-bold flex items-center gap-2">
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button
            onClick={() => {
              setEditing(null);
              setModalKey((v) => v + 1);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 flex items-center gap-2"
          >
            <PlusCircle className="w-5 h-5" /> Nueva Transacción
          </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisibleRows(20);
            }}
            type="text"
            placeholder="Buscar por comercio o categoría..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value as "all" | "income" | "expense");
            setVisibleRows(20);
          }}
          className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm"
        >
          <option value="all">Todos</option>
          <option value="income">Ingresos</option>
          <option value="expense">Gastos</option>
        </select>
        <select
          value={period}
          onChange={(e) => {
            setPeriod(e.target.value as Period);
            setVisibleRows(20);
          }}
          className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm"
        >
          <option value="this-month">Mes actual</option>
          <option value="last-month">Mes pasado</option>
          <option value="this-year">Año actual</option>
          <option value="all-time">Todo</option>
        </select>
      </div>

      {selectedIds.length > 0 ? (
        <section className="mb-6 bg-primary/5 border border-primary/20 rounded-2xl p-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-sm font-bold text-primary">{selectedIds.length} seleccionadas</span>
            <button
              type="button"
              onClick={() => setConfirmDeleteIds(selectedIds)}
              className="px-3 py-1.5 rounded-lg border text-rose-600 border-rose-300 bg-white dark:bg-slate-900 text-sm font-semibold"
            >
              Eliminar seleccionadas
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-lg border text-sm font-semibold"
            >
              Limpiar selección
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              value={bulkCategory}
              onChange={(event) => setBulkCategory(event.target.value)}
              className="px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border"
            >
              <option value="">Categoría (sin cambios)</option>
              {initialCategories.map((item) => (
                <option key={item.id} value={item.name}>{item.name}</option>
              ))}
            </select>
            <select
              value={bulkType}
              onChange={(event) => setBulkType(event.target.value as "keep" | "income" | "expense")}
              className="px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border"
            >
              <option value="keep">Tipo (sin cambios)</option>
              <option value="income">Ingreso</option>
              <option value="expense">Gasto</option>
            </select>
            <input
              type="date"
              value={bulkDate}
              onChange={(event) => setBulkDate(event.target.value)}
              className="px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border"
            />
            <button
              type="button"
              onClick={applyBulkChanges}
              className="px-3 py-2 rounded-lg bg-primary text-white font-bold"
            >
              Aplicar edición masiva
            </button>
          </div>
        </section>
      ) : null}

      <section className="mb-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
        <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
          <h3 className="text-lg font-black mb-3">Reglas automáticas por comercio</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
            <input value={rulePattern} onChange={(e) => setRulePattern(e.target.value)} placeholder="Patrón (ej. uber)" className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800" />
            <select value={ruleCategory} onChange={(e) => setRuleCategory(e.target.value)} className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800">
              <option value="">Categoría</option>
              {initialCategories.map((item) => (
                <option key={item.id} value={item.name}>{item.name}</option>
              ))}
            </select>
            <select value={ruleType} onChange={(e) => setRuleType(e.target.value as RuleType)} className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800">
              <option value="any">Tipo: cualquiera</option>
              <option value="income">Solo ingresos</option>
              <option value="expense">Solo gastos</option>
            </select>
            <button type="button" onClick={addRule} className="px-3 py-2 rounded-lg bg-primary text-white font-semibold">Guardar regla</button>
          </div>
          <div className="space-y-2 max-h-44 overflow-y-auto">
            {rules.length === 0 ? <p className="text-sm text-slate-500">Aún no tienes reglas guardadas.</p> : null}
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border">
                <p className="text-sm">
                  <span className="font-bold">{rule.pattern}</span> → {rule.category} ({rule.type === "any" ? "cualquier tipo" : rule.type})
                </p>
                <button type="button" onClick={() => removeRule(rule.id)} className="text-xs px-2 py-1 rounded border">Quitar</button>
              </div>
            ))}
          </div>
        </article>

        <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-black">Transacciones recurrentes</h3>
            <button type="button" onClick={runAllTemplates} className="px-3 py-1.5 rounded-lg border text-sm font-semibold">Generar mes actual</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
            <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Nombre plantilla" className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800" />
            <input value={templateMerchant} onChange={(e) => setTemplateMerchant(e.target.value)} placeholder="Comercio" className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800" />
            <select value={templateCategory} onChange={(e) => setTemplateCategory(e.target.value)} className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800">
              <option value="">Categoría</option>
              {initialCategories.map((item) => (
                <option key={item.id} value={item.name}>{item.name}</option>
              ))}
            </select>
            <input type="text" inputMode="numeric" value={templateAmount} onChange={(e) => setTemplateAmount(formatMoneyInput(e.target.value))} placeholder="Monto" className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800" />
            <select value={templateType} onChange={(e) => setTemplateType(e.target.value as "income" | "expense")} className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800">
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
            </select>
            <input type="number" min={1} max={28} value={templateDay} onChange={(e) => setTemplateDay(e.target.value)} placeholder="Día (1-28)" className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800" />
          </div>
          <button type="button" onClick={addTemplate} className="px-3 py-2 rounded-lg bg-primary text-white font-semibold mb-3">Guardar plantilla</button>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {templates.length === 0 ? <p className="text-sm text-slate-500">No hay plantillas configuradas.</p> : null}
            {templates.map((template) => (
              <div key={template.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border">
                <p className="text-sm">{template.name} · día {template.dayOfMonth} · {template.type === "income" ? "Ingreso" : "Gasto"}</p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => runTemplateForCurrentMonth(template)} className="text-xs px-2 py-1 rounded border">Generar</button>
                  <button type="button" onClick={() => removeTemplate(template.id)} className="text-xs px-2 py-1 rounded border">Quitar</button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <button type="button" onClick={toggleVisible} className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 dark:hover:text-white">
                    {allVisibleSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />} Sel
                  </button>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Comercio / Detalles</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Monto</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">No se encontraron transacciones.</td>
                </tr>
              ) : (
                paginated.map((tx) => {
                  const Icon = transactionIconByCategory.get(tx.category.toLowerCase()) || Receipt;
                  const isIncome = tx.type === "income";
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(tx.id)}
                          onChange={() => toggleRow(tx.id)}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isIncome ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-100 dark:bg-slate-800 text-slate-600"}`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{tx.merchant}</p>
                            <p className="text-sm text-slate-500">{tx.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                        {new Date(`${tx.date}T00:00:00`).toLocaleDateString("es-ES")}
                      </td>
                      <td className={`px-6 py-4 text-right font-black ${isIncome ? "text-emerald-600" : "text-rose-600"}`}>
                        {isIncome ? "+" : "-"}{formatCurrencyCOP(Math.abs(Number(tx.amount) || 0))}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditing(tx);
                              setModalKey((v) => v + 1);
                              setIsModalOpen(true);
                            }}
                            className="p-2 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteIds([tx.id])}
                            disabled={busyId === tx.id}
                            className="p-2 rounded-lg border hover:bg-rose-50 text-rose-600 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > visibleRows && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-center">
            <button onClick={() => setVisibleRows((v) => v + 20)} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-white dark:hover:bg-slate-900">
              Cargar más
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase text-emerald-600 tracking-wider">Ingresos Totales</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-700">+{formatCurrencyCOP(totals.totalIncome)}</p>
        </div>
        <div className="bg-rose-500/5 border border-rose-500/20 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase text-rose-600 tracking-wider">Gastos Totales</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-700">-{formatCurrencyCOP(totals.totalExpense)}</p>
        </div>
        <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase text-primary tracking-wider">Ahorro Neto</span>
            <PiggyBank className="w-4 h-4 text-primary" />
          </div>
          <p className={`text-2xl font-black ${totals.net >= 0 ? "text-primary" : "text-rose-600"}`}>
            {totals.net >= 0 ? "+" : "-"}{formatCurrencyCOP(Math.abs(totals.net))}
          </p>
        </div>
      </div>

      <section className="mt-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-slate-500" />
          <h3 className="text-lg font-black">Historial de cambios</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500 border-b">
              <tr>
                <th className="py-2 pr-3">Fecha</th>
                <th className="py-2 pr-3">Acción</th>
                <th className="py-2">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {historyLog.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-slate-500">Sin cambios registrados todavía.</td>
                </tr>
              ) : (
                historyLog.slice(0, 20).map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2 pr-3">{new Date(item.at).toLocaleString("es-ES")}</td>
                    <td className="py-2 pr-3 font-semibold">{getHistoryActionLabel(item.action)}</td>
                    <td className="py-2">{getHistoryDetailLabel(item.detail)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <NewTransactionModal
        key={modalKey}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditing(null);
        }}
        initialData={editing}
        inferByMerchant={inferByMerchant}
        onSaved={async (mode, savedTx) => {
          if (savedTx) {
            if (mode === "create") {
              pushNotification({
                id: `tx-action-create-${savedTx.id}-${Date.now()}`,
                title: "Transacción creada",
                message: `${savedTx.merchant}: ${savedTx.type === "income" ? "ingreso" : "gasto"} por ${formatCurrencyCOP(Number(savedTx.amount) || 0)}.`,
                time: "ahora",
                unread: true,
                kind: "system",
                actionLabel: "Ver transacciones",
                actionHref: "/transacciones",
              });
              setTransactions((prev) => [savedTx, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
              armUndo({ kind: "create", createdId: savedTx.id });
              void appendHistory("create", `Transacción creada: ${savedTx.merchant}`, {
                tx_id: savedTx.id,
                merchant: savedTx.merchant,
              });
            } else {
              pushNotification({
                id: `tx-action-edit-${savedTx.id}-${Date.now()}`,
                title: "Transacción editada",
                message: `${savedTx.merchant}: ${savedTx.type === "income" ? "ingreso" : "gasto"} actualizado a ${formatCurrencyCOP(Number(savedTx.amount) || 0)}.`,
                time: "ahora",
                unread: true,
                kind: "system",
                actionLabel: "Ver transacciones",
                actionHref: "/transacciones",
              });
              setTransactions((prev) => prev.map((item) => (item.id === savedTx.id ? savedTx : item)));
              void appendHistory("edit", `Transacción editada: ${savedTx.merchant}`, { tx_id: savedTx.id });
            }
          } else {
            await reload();
          }
          showToast("success", mode === "edit" ? "Transacción actualizada." : "Transacción creada.");
        }}
        categories={initialCategories}
      />
    </>
  );
}
