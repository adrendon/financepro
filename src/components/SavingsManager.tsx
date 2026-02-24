"use client";

import { useMemo, useState } from "react";
import { useEffect } from "react";
import { PlusCircle, PiggyBank, Target, Download, History, HandCoins, Pencil, Tag, Trash2, Archive } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { exportToCSV } from "@/utils/export";
import { uploadImage } from "@/utils/uploadImage";
import Link from "next/link";
import ImageDropzone from "@/components/ImageDropzone";
import ConfirmDialog from "@/components/ConfirmDialog";
import { formatCurrencyCOP, formatMoneyInput, parseMoneyInput } from "@/utils/formatters";
import { AppCategory, resolveCategoryIcon } from "@/utils/categories";
import AppToast from "@/components/AppToast";
import { pushNotification } from "@/utils/notifications";
import { DEFAULT_PANEL_IMAGE, isValidImageUrl } from "@/utils/images";
// Archived view is inlined and synced in real-time via Supabase Realtime

type Goal = {
  id: number;
  title: string;
  category: string;
  priority_level?: "alta" | "media" | "baja" | null;
  goal_term?: "corto" | "mediano" | "largo" | null;
  current_amount: number;
  target_amount: number;
  status: string;
  color_class: string;
  target_date: string | null;
  image_url?: string | null;
};

type Contribution = {
  id: number;
  savings_goal_id: number;
  amount: number;
  note: string | null;
  contribution_date: string;
};

export default function SavingsManager({
  initialGoals,
  initialContributions,
  initialCategories,
  openNewGoalByDefault = false,
  todayISO,
}: {
  initialGoals: Goal[];
  initialContributions: Contribution[];
  initialCategories: AppCategory[];
  openNewGoalByDefault?: boolean;
  todayISO: string;
}) {
  const priorityOptions = [
    { value: "alta", label: "Prioridad alta", classes: "bg-primary text-white" },
    { value: "media", label: "Prioridad media", classes: "bg-amber-500 text-white" },
    { value: "baja", label: "Prioridad baja", classes: "bg-slate-700 text-white" },
  ] as const;

  const termOptions = [
    { value: "corto", label: "Corto plazo", classes: "bg-emerald-600 text-white" },
    { value: "mediano", label: "Mediano plazo", classes: "bg-violet-600 text-white" },
    { value: "largo", label: "Largo plazo", classes: "bg-amber-600 text-white" },
  ] as const;

  const [goals, setGoals] = useState(initialGoals);
  const [contributions, setContributions] = useState(initialContributions);
  const [isNewGoalOpen, setIsNewGoalOpen] = useState(openNewGoalByDefault);
  const [isContributionOpen, setIsContributionOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [goalForm, setGoalForm] = useState({
    title: "",
    category: "General",
    priority_level: "media",
    goal_term: "mediano",
    current_amount: "",
    target_amount: "",
    target_date: "",
    color_class: "bg-primary",
    image_url: "",
  });
  const [contribForm, setContribForm] = useState({ amount: "", note: "", contribution_date: todayISO });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showAllGoalsPanel, setShowAllGoalsPanel] = useState(false);
  const [visibleExtraGoals, setVisibleExtraGoals] = useState(3);
  const [visibleContributionRows, setVisibleContributionRows] = useState(12);
  const [confirmDeleteGoalId, setConfirmDeleteGoalId] = useState<number | null>(null);
  const [deletingGoal, setDeletingGoal] = useState(false);
  const [confirmArchiveGoalId, setConfirmArchiveGoalId] = useState<number | null>(null);
  const [archivingGoal, setArchivingGoal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedGoals, setArchivedGoals] = useState<Goal[]>([]);

  // Real-time subscription: keep active and archived goals in sync across clients
  useEffect(() => {
    const supabase = createClient();
    let channel: any = null;
    let mounted = true;

    const init = async () => {
      try {
        // seed archived list once
        const { data: archived } = await supabase
          .from("savings_goals")
          .select("id, title, category, current_amount, target_amount, status, color_class, target_date, image_url")
          .eq("status", "Archivado")
          .order("updated_at", { ascending: false });
        if (mounted) setArchivedGoals((archived as Goal[]) || []);

        // subscribe to all changes on savings_goals and filter client-side by user_id
        channel = supabase
          .channel("public:savings_goals")
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "savings_goals" },
            (payload) => handleRealtime(payload)
          )
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "savings_goals" },
            (payload) => handleRealtime(payload)
          )
          .on(
            "postgres_changes",
            { event: "DELETE", schema: "public", table: "savings_goals" },
            (payload) => handleRealtime(payload)
          )
          .subscribe();
      } catch (e) {
        // ignore subscription errors
        console.error("Realtime init error", e);
      }
    };

    init();

    const safeId = (r: any) => (r && r.id ? Number(r.id) : null);

    function handleRealtime(payload: any) {
      // payload may differ between versions; normalize
      const event = payload.event || payload.type || payload.eventType || (payload?.payload && payload.payload.type) || "UPDATE";
      const newRec = payload.new || payload.record || (payload?.payload && payload.payload.new) || null;
      const oldRec = payload.old || (payload?.payload && payload.payload.old) || null;

      const uid = newRec?.user_id || oldRec?.user_id;
      // if no user_id present, ignore
      if (!uid) return;

      // Only handle records for current user by comparing with existing lists
      const existsInGoals = (id: number) => (goals || []).some((g) => Number(g.id) === Number(id));
      const existsInArchived = (id: number) => (archivedGoals || []).some((g) => Number(g.id) === Number(id));

      const addToGoals = (rec: any) => {
        if (!rec) return;
        const id = safeId(rec);
        if (id == null) return;
        if (!existsInGoals(id)) setGoals((prev) => [{ ...rec, id }, ...(prev || [])]);
      };

      const addToArchived = (rec: any) => {
        if (!rec) return;
        const id = safeId(rec);
        if (id == null) return;
        if (!existsInArchived(id)) setArchivedGoals((prev) => [{ ...rec, id }, ...(prev || [])]);
      };

      const removeFromGoals = (id: number) => setGoals((prev) => (prev || []).filter((g) => Number(g.id) !== Number(id)));
      const removeFromArchived = (id: number) => setArchivedGoals((prev) => (prev || []).filter((g) => Number(g.id) !== Number(id)));

      if (event && String(event).toUpperCase().includes("INSERT")) {
        if (newRec.status === "Archivado") addToArchived(newRec);
        else addToGoals(newRec);
        return;
      }

      if (event && String(event).toUpperCase().includes("UPDATE")) {
        const prevStatus = oldRec?.status;
        const nextStatus = newRec?.status;
        const id = safeId(newRec || oldRec);
        if (prevStatus && nextStatus && prevStatus !== nextStatus) {
          // moved between lists
          if (nextStatus === "Archivado") {
            removeFromGoals(id);
            addToArchived(newRec);
          } else if (prevStatus === "Archivado" && nextStatus !== "Archivado") {
            removeFromArchived(id);
            addToGoals(newRec);
          }
        } else {
          // same status: update the item in place
          if (nextStatus === "Archivado") {
            setArchivedGoals((prev) => (prev || []).map((g) => (Number(g.id) === Number(id) ? { ...g, ...newRec } : g)));
          } else {
            setGoals((prev) => (prev || []).map((g) => (Number(g.id) === Number(id) ? { ...g, ...newRec } : g)));
          }
        }
        return;
      }

      if (event && String(event).toUpperCase().includes("DELETE")) {
        const id = safeId(oldRec || newRec);
        if (id == null) return;
        removeFromGoals(id);
        removeFromArchived(id);
        return;
      }
    }

    return () => {
      mounted = false;
      try {
        if (channel) supabase.removeChannel(channel);
      } catch (e) {
        // ignore
      }
    };
  }, []);

  // restore action (called from inline archived list)
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const restoreGoal = async (id: number) => {
    setRestoringId(id);
    const supabase = createClient();
    const { error } = await supabase.from("savings_goals").update({ status: "En progreso" }).eq("id", id);
    setRestoringId(null);
    if (error) {
      showToast("error", `No se pudo restaurar la meta: ${error.message}`);
      return;
    }
    // local optimistic update (realtime will also update other clients)
    const restored = archivedGoals.find((g) => g.id === id);
    if (restored) {
      setGoals((prev) => [{ ...restored, status: "En progreso" }, ...(prev || [])]);
      setArchivedGoals((prev) => (prev || []).filter((x) => x.id !== id));
      showToast("success", "Meta restaurada correctamente.");
    }
  };

  const activeGoals = useMemo(
    () => goals.filter((goal) => goal.status !== "Archivado"),
    [goals]
  );

  const savingIconByCategory = useMemo(() => {
    const map = new Map<string, ReturnType<typeof resolveCategoryIcon>>();
    initialCategories
      .filter((category) => category.applies_to === "saving")
      .forEach((category) => {
        map.set(category.name.toLowerCase(), resolveCategoryIcon(category.icon));
      });
    return map;
  }, [initialCategories]);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 2600);
  };

  const summary = useMemo(() => {
    const totalSavings = activeGoals.reduce((sum, g) => sum + Number(g.current_amount || 0), 0);
    const globalGoal = activeGoals.reduce((sum, g) => sum + Number(g.target_amount || 0), 0);
    const completed = activeGoals.filter((g) => g.status === "Completado").length;
    return {
      totalSavings,
      globalGoal,
      completed,
      percentage: globalGoal > 0 ? Math.round((totalSavings / globalGoal) * 100) : 0,
    };
  }, [activeGoals]);

  const performance = useMemo(() => {
    const reference = new Date(`${todayISO}T00:00:00`);
    const currentMonth = reference.getMonth();
    const currentYear = reference.getFullYear();

    const previousMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const previousMonth = previousMonthDate.getMonth();
    const previousYear = previousMonthDate.getFullYear();

    const currentMonthContrib = contributions.reduce((sum, contribution) => {
      const contributionDate = new Date(`${contribution.contribution_date}T00:00:00`);
      if (contributionDate.getMonth() === currentMonth && contributionDate.getFullYear() === currentYear) {
        return sum + Number(contribution.amount || 0);
      }
      return sum;
    }, 0);

    const previousMonthContrib = contributions.reduce((sum, contribution) => {
      const contributionDate = new Date(`${contribution.contribution_date}T00:00:00`);
      if (contributionDate.getMonth() === previousMonth && contributionDate.getFullYear() === previousYear) {
        return sum + Number(contribution.amount || 0);
      }
      return sum;
    }, 0);

    const baseBalance = Math.max(0, summary.totalSavings - currentMonthContrib);
    const performancePct = baseBalance > 0 ? (currentMonthContrib / baseBalance) * 100 : 0;
    const deltaVsPrev =
      previousMonthContrib > 0
        ? ((currentMonthContrib - previousMonthContrib) / previousMonthContrib) * 100
        : currentMonthContrib > 0
        ? 100
        : 0;

    return {
      performancePct,
      deltaVsPrev,
    };
  }, [contributions, summary.totalSavings, todayISO]);

  const upcomingGoal = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;
    const today = new Date(`${todayISO}T00:00:00`);

    const candidates = activeGoals
      .filter((goal) => goal.status !== "Completado" && goal.target_date)
      .map((goal) => {
        const targetDate = new Date(`${goal.target_date}T00:00:00`);
        const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / dayMs);
        return {
          title: goal.title,
          category: goal.category || "General",
          daysRemaining,
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    const nextFuture = candidates.find((candidate) => candidate.daysRemaining >= 0);
    if (nextFuture) {
      return {
        title: nextFuture.title,
        category: nextFuture.category,
        daysRemaining: nextFuture.daysRemaining,
        overdue: false,
      };
    }

    if (candidates.length === 0) return null;

    const closestOverdue = candidates[candidates.length - 1];
    return {
      title: closestOverdue.title,
      category: closestOverdue.category,
      daysRemaining: Math.abs(closestOverdue.daysRemaining),
      overdue: true,
    };
  }, [activeGoals, todayISO]);

  const contributionRows = contributions
    .sort((a, b) => b.contribution_date.localeCompare(a.contribution_date))
    .map((c) => {
      const goal = goals.find((g) => g.id === c.savings_goal_id);
      return {
        Fecha: new Date(`${c.contribution_date}T00:00:00`).toLocaleDateString("es-ES"),
        Meta: goal?.title || "Meta",
        Monto: Math.round(Number(c.amount)),
        Nota: c.note || "",
      };
    });

  const reload = async () => {
    const supabase = createClient();
    const [{ data: g }, { data: c }] = await Promise.all([
      supabase.from("savings_goals").select("*").order("created_at", { ascending: true }),
      supabase.from("savings_contributions").select("*").order("contribution_date", { ascending: false }),
    ]);
    setGoals((g as Goal[]) || []);
    setContributions((c as Contribution[]) || []);
  };

  const createGoal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidImageUrl(goalForm.image_url)) {
      showToast("error", "La URL de imagen no es válida.");
      return;
    }

    const supabase = createClient();
    const parsedCurrentAmount = parseMoneyInput(goalForm.current_amount);
    const parsedTargetAmount = parseMoneyInput(goalForm.target_amount);

    const payload = {
      title: goalForm.title,
      category: goalForm.category || "General",
      priority_level: goalForm.priority_level,
      goal_term: goalForm.goal_term,
      current_amount: parsedCurrentAmount,
      target_amount: parsedTargetAmount,
      status: parsedCurrentAmount >= parsedTargetAmount ? "Completado" : "En progreso",
      color_class: goalForm.color_class,
      target_date: goalForm.target_date || null,
      image_url: goalForm.image_url || null,
    };
    const { error } = editingGoal
      ? await supabase.from("savings_goals").update(payload).eq("id", editingGoal.id)
      : await supabase.from("savings_goals").insert(payload);
    if (!error) {
      pushNotification({
        id: `saving-goal-action-${editingGoal ? "edit" : "create"}-${Date.now()}`,
        title: editingGoal ? `Meta actualizada: ${payload.title}` : `Nueva meta de ahorro: ${payload.title}`,
        message: `Objetivo ${formatCurrencyCOP(parsedTargetAmount)} (${payload.status.toLowerCase()}).`,
        time: "ahora",
        unread: true,
        kind: "savings",
        actionLabel: "Ver ahorros",
        actionHref: "/ahorros",
      });

      await reload();
      setIsNewGoalOpen(false);
      setEditingGoal(null);
      setGoalForm({
        title: "",
        category: "General",
        priority_level: "media",
        goal_term: "mediano",
        current_amount: "",
        target_amount: "",
        target_date: "",
        color_class: "bg-primary",
        image_url: "",
      });
    }
  };

  const openCreateGoal = () => {
    setEditingGoal(null);
    setGoalForm({
      title: "",
      category: "General",
      priority_level: "media",
      goal_term: "mediano",
      current_amount: "",
      target_amount: "",
      target_date: "",
      color_class: "bg-primary",
      image_url: "",
    });
    setIsNewGoalOpen(true);
  };

  const openEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setGoalForm({
      title: goal.title,
      category: goal.category || "General",
      priority_level: goal.priority_level || "media",
      goal_term: goal.goal_term || "mediano",
      current_amount: formatMoneyInput(String(goal.current_amount || 0)),
      target_amount: formatMoneyInput(String(goal.target_amount || 0)),
      target_date: goal.target_date || "",
      color_class: goal.color_class || "bg-primary",
      image_url: goal.image_url || "",
    });
    setIsNewGoalOpen(true);
  };

  const addContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    const amount = parseMoneyInput(contribForm.amount);
    if (amount <= 0) {
      showToast("error", "Ingresa un monto válido para la aportación.");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from("savings_contributions").insert({
      savings_goal_id: selectedGoal.id,
      amount,
      note: contribForm.note || null,
      contribution_date: contribForm.contribution_date,
    });
    if (error) {
      showToast("error", `No se pudo registrar la aportación: ${error.message}`);
      return;
    }

    const newCurrent = Number(selectedGoal.current_amount) + amount;
    const { error: updateError } = await supabase
      .from("savings_goals")
      .update({
        current_amount: newCurrent,
        status: newCurrent >= Number(selectedGoal.target_amount) ? "Completado" : "En progreso",
      })
      .eq("id", selectedGoal.id);

    if (updateError) {
      showToast("error", `Se registró el aporte, pero no se actualizó la meta: ${updateError.message}`);
      return;
    }

    await reload();
    setIsContributionOpen(false);
    setSelectedGoal(null);
    showToast("success", "Aportación registrada correctamente.");

    pushNotification({
      id: `saving-${Date.now()}-${selectedGoal.id}`,
      title: `Aportación a meta: ${selectedGoal.title}`,
      message: `Registraste un aporte de ${formatCurrencyCOP(amount)} para avanzar tu objetivo.`,
      time: "ahora",
      unread: true,
      kind: "savings",
      actionLabel: "Ver ahorros",
      actionHref: "/ahorros",
    });
  };

  const removeGoal = async () => {
    if (!confirmDeleteGoalId) return;

    const goalToRemove = goals.find((goal) => goal.id === confirmDeleteGoalId);
    setDeletingGoal(true);

    const supabase = createClient();
    const { error: deleteContributionsError } = await supabase
      .from("savings_contributions")
      .delete()
      .eq("savings_goal_id", confirmDeleteGoalId);

    if (deleteContributionsError) {
      setDeletingGoal(false);
      showToast("error", `No se pudieron eliminar los aportes relacionados: ${deleteContributionsError.message}`);
      return;
    }

    const { error: deleteGoalError } = await supabase
      .from("savings_goals")
      .delete()
      .eq("id", confirmDeleteGoalId);

    setDeletingGoal(false);

    if (deleteGoalError) {
      showToast("error", `No se pudo eliminar la meta: ${deleteGoalError.message}`);
      return;
    }

    await reload();
    setConfirmDeleteGoalId(null);
    showToast("success", "Meta eliminada correctamente.");

    pushNotification({
      id: `saving-goal-action-delete-${Date.now()}`,
      title: "Meta de ahorro eliminada",
      message: `${goalToRemove?.title || "La meta"} fue eliminada junto con sus aportes.`,
      time: "ahora",
      unread: true,
      kind: "savings",
      actionLabel: "Ver ahorros",
      actionHref: "/ahorros",
    });
  };

  const archiveGoal = async () => {
    if (!confirmArchiveGoalId) return;

    const goalToArchive = goals.find((goal) => goal.id === confirmArchiveGoalId);
    setArchivingGoal(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("savings_goals")
      .update({ status: "Archivado" })
      .eq("id", confirmArchiveGoalId);

    setArchivingGoal(false);

    if (error) {
      showToast("error", `No se pudo archivar la meta: ${error.message}`);
      return;
    }

    // Optimistic local update so archived view shows immediately
    setGoals((prev) => (prev || []).filter((g) => g.id !== confirmArchiveGoalId));
    if (goalToArchive) {
      const archivedCopy = { ...goalToArchive, status: "Archivado" };
      setArchivedGoals((prev) => [archivedCopy, ...(prev || [])]);
    }
    setConfirmArchiveGoalId(null);
    showToast("success", "Meta archivada correctamente.");

    pushNotification({
      id: `saving-goal-action-archive-${Date.now()}`,
      title: "Meta de ahorro archivada",
      message: `${goalToArchive?.title || "La meta"} fue archivada sin eliminar su historial.`,
      time: "ahora",
      unread: true,
      kind: "savings",
      actionLabel: "Ver ahorros",
      actionHref: "/ahorros",
    });
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    setUploadProgress(0);
    setUploadError(null);
    try {
      const url = await uploadImage(file, "financepro/savings-goals", {
        onProgress: setUploadProgress,
      });
      setGoalForm((state) => ({ ...state, image_url: url }));
      setUploadProgress(100);
    } catch (error) {
      setUploadError((error as Error).message);
    } finally {
      setUploadingImage(false);
    }
  };

  const featuredGoals = activeGoals.slice(0, 3);
  const extraGoals = activeGoals.slice(3);

  const renderGoalCard = (goal: Goal) => {
    const currentAmount = Number(goal.current_amount || 0);
    const targetAmount = Number(goal.target_amount || 0);
    const percentage = targetAmount > 0 ? Math.min(Math.round((currentAmount / targetAmount) * 100), 100) : 0;
    const CategoryIcon = savingIconByCategory.get((goal.category || "").toLowerCase()) || Tag;
    const todayDate = new Date(`${todayISO}T00:00:00`);
    const goalTargetDate = goal.target_date ? new Date(`${goal.target_date}T00:00:00`) : null;
    const goalDaysRemaining = goalTargetDate
      ? Math.ceil((goalTargetDate.getTime() - todayDate.getTime()) / (24 * 60 * 60 * 1000))
      : null;
    const derivedPriority =
      goalDaysRemaining == null
        ? "media"
        : goalDaysRemaining <= 30
        ? "alta"
        : goalDaysRemaining <= 90
        ? "media"
        : "baja";
    const resolvedPriority = goal.priority_level || derivedPriority;

    const derivedTerm =
      goalDaysRemaining == null
        ? "mediano"
        : goalDaysRemaining <= 90
        ? "corto"
        : goalDaysRemaining <= 365
        ? "mediano"
        : "largo";
    const resolvedTerm = goal.goal_term || derivedTerm;

    const priorityMeta = priorityOptions.find((item) => item.value === resolvedPriority);
    const termMeta = termOptions.find((item) => item.value === resolvedTerm);

    return (
      <div key={goal.id} className="bg-white dark:bg-slate-800 border rounded-xl overflow-hidden">
        <div className="h-36 bg-slate-100 dark:bg-slate-700 relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={goal.image_url || DEFAULT_PANEL_IMAGE} alt={goal.title} className="w-full h-full object-cover" />
          <div className="absolute top-3 left-3 flex flex-wrap gap-2 pr-2">
            {priorityMeta ? (
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wide ${priorityMeta.classes}`}>
                {priorityMeta.label}
              </span>
            ) : null}
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wide bg-emerald-500 text-white">
              {(goal.category || "General").toUpperCase()}
            </span>
            {termMeta ? (
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wide ${termMeta.classes}`}>
                {termMeta.label}
              </span>
            ) : null}
          </div>
        </div>
        <div className="p-5">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-bold">{goal.title}</h3>
            <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700">{goal.status}</span>
          </div>
          <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
            <CategoryIcon className="w-3.5 h-3.5" />
            Categoría: {goal.category || "General"}
          </p>
          <p className="text-sm text-slate-500 mb-2">{formatCurrencyCOP(currentAmount)} / {formatCurrencyCOP(targetAmount)}</p>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden mb-3">
            <div className={`${goal.color_class || "bg-primary"} h-full`} style={{ width: `${percentage}%` }}></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              onClick={() => {
                setSelectedGoal(goal);
                setContribForm({ amount: "", note: "", contribution_date: todayISO });
                setIsContributionOpen(true);
              }}
              className="h-10 bg-slate-100 dark:bg-slate-700 hover:bg-primary hover:text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2"
            >
              <HandCoins className="w-4 h-4" /> Contribuir
            </button>
            <button
              onClick={() => openEditGoal(goal)}
              className="h-10 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
            >
              <Pencil className="w-4 h-4" /> Editar
            </button>
            <button
              onClick={() => setConfirmArchiveGoalId(goal.id)}
              className="h-10 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
            >
              <Archive className="w-4 h-4" /> Archivar
            </button>
            <button
              onClick={() => setConfirmDeleteGoalId(goal.id)}
              className="h-10 bg-rose-50 dark:bg-rose-900/20 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Eliminar
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <AppToast toast={toast} onClose={() => setToast(null)} />

      <ConfirmDialog
        open={Boolean(confirmDeleteGoalId)}
        title="Eliminar meta de ahorro"
        message="También se eliminarán las aportes asociadas a esta meta. Esta acción no se puede deshacer."
        confirmLabel="Eliminar meta"
        loading={deletingGoal}
        loadingLabel="Eliminando..."
        onCancel={() => setConfirmDeleteGoalId(null)}
        onConfirm={removeGoal}
      />

      <ConfirmDialog
        open={Boolean(confirmArchiveGoalId)}
        title="Archivar meta de ahorro"
        message="La meta se ocultará del panel principal, pero se conservará su historial de aportes."
        confirmLabel="Archivar meta"
        intent="primary"
        loading={archivingGoal}
        loadingLabel="Archivando..."
        onCancel={() => setConfirmArchiveGoalId(null)}
        onConfirm={archiveGoal}
      />

      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-black">Ahorros</h1>
          <p className="text-slate-500 dark:text-slate-400">Visualiza metas, crea nuevas y registra aportes.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => exportToCSV(contributionRows, "historial-aportes.csv")} className="w-full sm:w-auto justify-center px-4 h-12 border rounded-lg font-bold flex items-center gap-2">
            <Download className="w-4 h-4" /> Exportar historial
          </button>
          <button onClick={openCreateGoal} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 h-12 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold">
            <PlusCircle className="w-5 h-5" /> Nueva Meta
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="p-6 rounded-xl bg-white dark:bg-slate-800 border"><p className="text-sm text-slate-500">Ahorro Total</p><p className="text-2xl sm:text-3xl leading-tight break-all font-bold">{formatCurrencyCOP(summary.totalSavings)}</p><div className="flex items-center gap-1 text-emerald-500"><PiggyBank className="w-4 h-4" /><p className="text-sm font-semibold">Saldo acumulado</p></div></div>
        <div className="p-6 rounded-xl bg-white dark:bg-slate-800 border"><p className="text-sm text-slate-500">Meta Global</p><p className="text-2xl sm:text-3xl leading-tight break-all font-bold">{formatCurrencyCOP(summary.globalGoal)}</p><p className="text-sm text-slate-500">{summary.percentage}% del objetivo</p></div>
        <div className="p-6 rounded-xl bg-white dark:bg-slate-800 border"><p className="text-sm text-slate-500">Rendimiento</p><p className="text-2xl sm:text-3xl leading-tight break-all font-bold">{performance.performancePct >= 0 ? "+" : "-"}{Math.abs(performance.performancePct).toFixed(1)}%</p><div className="flex items-center gap-1 text-emerald-500"><Target className="w-4 h-4" /><p className="text-sm font-semibold">{performance.deltaVsPrev >= 0 ? "↑" : "↓"} {performance.deltaVsPrev >= 0 ? "+" : "-"}{Math.abs(performance.deltaVsPrev).toFixed(1)}% vs mes anterior</p></div></div>
        <div className="p-6 rounded-xl bg-primary/10 border border-primary/20">
          <p className="text-sm text-primary font-bold">Días para meta próxima</p>
          <p className="text-primary dark:text-white text-2xl sm:text-3xl leading-tight break-all font-bold">
            {upcomingGoal
              ? upcomingGoal.overdue
                ? `${upcomingGoal.daysRemaining} Día(s)`
                : `${upcomingGoal.daysRemaining} Día(s)`
              : "--"}
          </p>
          <div className="text-primary/70 dark:text-slate-400 text-sm font-medium italic">
            <p className="text-sm">
              {upcomingGoal
                ? upcomingGoal.overdue
                  ? `${upcomingGoal.title} · ${upcomingGoal.category} (vencida)`
                  : `${upcomingGoal.title} · ${upcomingGoal.category}`
                : "Sin metas con fecha objetivo"}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
        Metas activas: <span className="font-semibold text-slate-900 dark:text-slate-100">{activeGoals.length}</span> objetivos registrados.
      </p>

      <div className="mt-10">
        <div className="flex items-center justify-between mb-4 gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold">Mis Metas de Ahorro</h2>
              <button
                type="button"
                onClick={() => setShowArchived((s) => !s)}
                className="text-sm px-3 py-1 rounded-md border bg-slate-50 dark:bg-slate-800"
              >
                {showArchived ? "Ver activas" : "Archivadas"}
              </button>
            </div>
          {extraGoals.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setShowAllGoalsPanel((prev) => !prev);
                if (!showAllGoalsPanel) setVisibleExtraGoals(3);
              }}
              className="text-primary font-semibold hover:underline"
            >
              {showAllGoalsPanel ? "Ocultar" : "Ver todas"}
            </button>
          ) : null}
        </div>
          {/* If showing archived, render archived list and skip active grid */}
          {showArchived ? (
            <div className="space-y-4">
              {archivedGoals.length === 0 ? (
                <div className="p-6 bg-white dark:bg-slate-900 border rounded-xl text-center">
                  <p className="text-slate-500">No hay metas archivadas.</p>
                </div>
              ) : (
                archivedGoals.map((goal) => (
                  <div key={goal.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border rounded-lg">
                    <div>
                      <h3 className="font-bold">{goal.title}</h3>
                      <p className="text-sm text-slate-500">Categoría: {goal.category}</p>
                      <p className="text-sm text-slate-700 dark:text-slate-200 mt-1">{formatCurrencyCOP(Number(goal.current_amount || 0))} / {formatCurrencyCOP(Number(goal.target_amount || 0))}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={restoringId === goal.id}
                        onClick={() => restoreGoal(goal.id)}
                        className="px-3 py-2 rounded-lg bg-emerald-600 text-white font-semibold flex items-center gap-2"
                      >
                        {restoringId === goal.id ? "Restaurando..." : "Restaurar"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredGoals.map((goal) => renderGoalCard(goal))}
            </div>
          )}

        {extraGoals.length > 0 ? (
          <div
            className={`mt-6 overflow-hidden transition-all duration-300 ease-out ${
              showAllGoalsPanel ? "max-h-600 opacity-100" : "max-h-0 opacity-0"
            }`}
            aria-hidden={!showAllGoalsPanel}
          >
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {extraGoals.slice(0, visibleExtraGoals).map((goal) => renderGoalCard(goal))}
              </div>

              {visibleExtraGoals < extraGoals.length ? (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleExtraGoals((prev) => prev + 3)}
                    className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cargar 3 más
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-10 bg-white dark:bg-slate-900 border rounded-xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4" />
            <h3 className="font-bold">Historial de aportes</h3>
          </div>
          <Link href="/transacciones" className="text-primary text-sm font-semibold hover:underline">
            Ver todo
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2">Fecha</th>
                <th className="py-2">Meta</th>
                <th className="py-2">Tipo</th>
                <th className="py-2">Monto</th>
                <th className="py-2">Nota</th>
              </tr>
            </thead>
            <tbody>
              {contributionRows.slice(0, visibleContributionRows).map((row, idx) => (
                <tr key={idx} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2">{row.Fecha}</td>
                  <td className="py-2">{row.Meta}</td>
                  <td className="py-2">
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      Ahorro
                    </span>
                  </td>
                  <td className="py-2">{formatCurrencyCOP(Number(row.Monto) || 0)}</td>
                  <td className="py-2">{row.Nota}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visibleContributionRows < contributionRows.length ? (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleContributionRows((prev) => prev + 12)}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cargar más
            </button>
          </div>
        ) : null}
      </div>

      {isNewGoalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={createGoal} className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border bg-white dark:bg-slate-900 p-6 space-y-4">
            <h3 className="text-xl font-bold">{editingGoal ? "Editar meta de ahorro" : "Nueva meta de ahorro"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input required value={goalForm.title} onChange={(e) => setGoalForm((s) => ({ ...s, title: e.target.value }))} placeholder="Nombre meta" className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800" />
              <select value={goalForm.category} onChange={(e) => setGoalForm((s) => ({ ...s, category: e.target.value }))} className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800">
                <option value="General">General</option>
                {initialCategories.map((category) => (
                  <option key={category.id} value={category.name}>{category.name}</option>
                ))}
              </select>
              <select value={goalForm.priority_level} onChange={(e) => setGoalForm((s) => ({ ...s, priority_level: e.target.value }))} className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800">
                <option value="alta">Prioridad alta</option>
                <option value="media">Prioridad media</option>
                <option value="baja">Prioridad baja</option>
              </select>
              <select value={goalForm.goal_term} onChange={(e) => setGoalForm((s) => ({ ...s, goal_term: e.target.value }))} className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800">
                <option value="corto">Corto plazo</option>
                <option value="mediano">Mediano plazo</option>
                <option value="largo">Largo plazo</option>
              </select>
              <input required type="text" inputMode="numeric" value={goalForm.target_amount} onChange={(e) => setGoalForm((s) => ({ ...s, target_amount: formatMoneyInput(e.target.value) }))} placeholder="Objetivo" className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800" />
              <input type="text" inputMode="numeric" value={goalForm.current_amount} onChange={(e) => setGoalForm((s) => ({ ...s, current_amount: formatMoneyInput(e.target.value) }))} placeholder="Ahorro inicial" className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800" />
              <input type="date" value={goalForm.target_date} onChange={(e) => setGoalForm((s) => ({ ...s, target_date: e.target.value }))} className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800" />
              <div className="md:col-span-2">
                <ImageDropzone
                  label="Imagen"
                  value={goalForm.image_url}
                  onValueChange={(nextValue) => setGoalForm((state) => ({ ...state, image_url: nextValue }))}
                  onFileSelected={handleImageUpload}
                  uploading={uploadingImage}
                  uploadProgress={uploadProgress}
                />
                {uploadError ? <p className="text-xs text-rose-600">{uploadError}</p> : null}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsNewGoalOpen(false)} className="px-4 py-2 rounded-lg border">Cancelar</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-white font-semibold">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {isContributionOpen && selectedGoal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={addContribution} className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border bg-white dark:bg-slate-900 p-6 space-y-4">
            <h3 className="text-xl font-bold">Nueva aportación: {selectedGoal.title}</h3>
            <input required type="text" inputMode="numeric" value={contribForm.amount} onChange={(e) => setContribForm((s) => ({ ...s, amount: formatMoneyInput(e.target.value) }))} placeholder="Monto" className="w-full px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800" />
            <input type="date" value={contribForm.contribution_date} onChange={(e) => setContribForm((s) => ({ ...s, contribution_date: e.target.value }))} className="w-full px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800" />
            <textarea value={contribForm.note} onChange={(e) => setContribForm((s) => ({ ...s, note: e.target.value }))} placeholder="Nota" className="w-full px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsContributionOpen(false)} className="px-4 py-2 rounded-lg border">Cancelar</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-white font-semibold">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
