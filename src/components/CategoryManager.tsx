"use client";

import { useMemo, useState } from "react";
import {
  Pencil,
  PlusCircle,
  Trash2,
  Tag,
  Utensils,
  Car,
  Home,
  HeartPulse,
  Briefcase,
  Wallet,
  Plane,
  ReceiptText,
  PiggyBank,
  CircleDollarSign,
  ShoppingCart,
  GraduationCap,
  Gamepad2,
  Dumbbell,
  Shield,
  Building2,
  Smartphone,
  Tv,
  Stethoscope,
  Bus,
  Fuel,
  Gift,
  PawPrint,
  Wrench,
  BadgeDollarSign,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  AppCategory,
  CATEGORY_ICON_OPTIONS,
  CategoryScope,
} from "@/utils/categories";

const scopeLabel: Record<CategoryScope, string> = {
  transaction: "Transacciones",
  budget: "Presupuestos",
  bill: "Facturas",
  saving: "Ahorros",
};

const renderCategoryIcon = (iconName: string, className?: string) => {
  switch (iconName) {
    case "Utensils":
      return <Utensils className={className} />;
    case "Car":
      return <Car className={className} />;
    case "Home":
      return <Home className={className} />;
    case "HeartPulse":
      return <HeartPulse className={className} />;
    case "Briefcase":
      return <Briefcase className={className} />;
    case "Wallet":
      return <Wallet className={className} />;
    case "Plane":
      return <Plane className={className} />;
    case "ReceiptText":
      return <ReceiptText className={className} />;
    case "PiggyBank":
      return <PiggyBank className={className} />;
    case "CircleDollarSign":
      return <CircleDollarSign className={className} />;
    case "ShoppingCart":
      return <ShoppingCart className={className} />;
    case "GraduationCap":
      return <GraduationCap className={className} />;
    case "Gamepad2":
      return <Gamepad2 className={className} />;
    case "Dumbbell":
      return <Dumbbell className={className} />;
    case "Shield":
      return <Shield className={className} />;
    case "Building2":
      return <Building2 className={className} />;
    case "Smartphone":
      return <Smartphone className={className} />;
    case "Tv":
      return <Tv className={className} />;
    case "Stethoscope":
      return <Stethoscope className={className} />;
    case "Bus":
      return <Bus className={className} />;
    case "Fuel":
      return <Fuel className={className} />;
    case "Gift":
      return <Gift className={className} />;
    case "PawPrint":
      return <PawPrint className={className} />;
    case "Wrench":
      return <Wrench className={className} />;
    case "BadgeDollarSign":
      return <BadgeDollarSign className={className} />;
    case "Tag":
    default:
      return <Tag className={className} />;
  }
};

export default function CategoryManager({
  initialCategories,
  initialScope = "transaction",
  canManage,
}: {
  initialCategories: AppCategory[];
  initialScope?: CategoryScope;
  canManage: boolean;
}) {
  const [categories, setCategories] = useState<AppCategory[]>(initialCategories);
  const [scope, setScope] = useState<CategoryScope>(initialScope);
  const [editing, setEditing] = useState<AppCategory | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", icon: "Tag", applies_to: initialScope as CategoryScope });
  const [iconQuery, setIconQuery] = useState("");

  const filteredIcons = useMemo(() => {
    const query = iconQuery.trim().toLowerCase();
    if (!query) return CATEGORY_ICON_OPTIONS;
    return CATEGORY_ICON_OPTIONS.filter((iconName) => iconName.toLowerCase().includes(query));
  }, [iconQuery]);

  const filtered = useMemo(
    () => categories.filter((category) => category.applies_to === scope).sort((a, b) => a.name.localeCompare(b.name)),
    [categories, scope]
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", icon: "Tag", applies_to: scope });
    setIconQuery("");
    setOpen(true);
  };

  const openEdit = (category: AppCategory) => {
    setEditing(category);
    setForm({ name: category.name, icon: category.icon, applies_to: category.applies_to });
    setIconQuery("");
    setOpen(true);
  };

  const reload = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("categories")
      .select("id, name, icon, applies_to")
      .order("name", { ascending: true });

    setCategories((data as AppCategory[]) || []);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage) return;

    const supabase = createClient();
    const payload = {
      name: form.name.trim(),
      icon: form.icon,
      applies_to: form.applies_to,
    };

    const result = editing
      ? await supabase.from("categories").update(payload).eq("id", editing.id)
      : await supabase.from("categories").insert(payload);

    if (result.error) return;

    await reload();
    setOpen(false);
    setEditing(null);
    setIconQuery("");
  };

  const remove = async (id: number) => {
    if (!canManage) return;
    if (!confirm("¿Eliminar categoría?")) return;

    const supabase = createClient();
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (!error) {
      setCategories((prev) => prev.filter((category) => category.id !== id));
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">Categorías</h2>
          <p className="text-sm text-slate-500">
            {canManage
              ? "Selecciona iconos y gestiona categorías por módulo."
              : "Puedes ver las categorías globales, pero tu plan no permite crearlas o editarlas."}
          </p>
        </div>
        {canManage ? (
          <button
            onClick={openCreate}
            className="px-4 py-2.5 bg-primary text-white rounded-xl font-bold inline-flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" /> Nueva categoría
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["transaction", "budget", "bill", "saving"] as CategoryScope[]).map((item) => (
          <button
            key={item}
            onClick={() => setScope(item)}
            className={`px-3 py-2 rounded-lg border text-sm font-semibold ${
              item === scope
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            }`}
          >
            {scopeLabel[item]}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">No hay categorías para esta sección.</p>
          ) : (
            filtered.map((category) => {
              return (
                <div key={category.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      {renderCategoryIcon(category.icon, "w-4 h-4")}
                    </span>
                    <div>
                      <p className="font-semibold">{category.name}</p>
                      <p className="text-xs text-slate-500">{scopeLabel[category.applies_to]}</p>
                    </div>
                  </div>
                  {canManage ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(category)} className="p-2 rounded-lg border">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => remove(category.id)} className="p-2 rounded-lg border text-rose-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={save} className="w-full max-w-lg rounded-xl border bg-white dark:bg-slate-900 p-6 space-y-4">
            <h3 className="text-xl font-bold">{editing ? "Editar categoría" : "Nueva categoría"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                required
                value={form.name}
                onChange={(e) => setForm((state) => ({ ...state, name: e.target.value }))}
                placeholder="Nombre"
                className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800 md:col-span-2"
              />
              <select
                value={form.applies_to}
                onChange={(e) => setForm((state) => ({ ...state, applies_to: e.target.value as CategoryScope }))}
                className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800"
              >
                <option value="transaction">Transacciones</option>
                <option value="budget">Presupuestos</option>
                <option value="bill">Facturas</option>
                <option value="saving">Ahorros</option>
              </select>
              <div className="px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800 flex items-center gap-2">
                <span className="w-8 h-8 rounded-md bg-white dark:bg-slate-900 border flex items-center justify-center">
                  {renderCategoryIcon(form.icon, "w-4 h-4")}
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Vista previa</p>
                  <p className="text-sm font-semibold truncate">{form.icon}</p>
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium">Biblioteca de íconos</label>
                <input
                  type="text"
                  value={iconQuery}
                  onChange={(e) => setIconQuery(e.target.value)}
                  placeholder="Buscar ícono... (ej. car, wallet, tag)"
                  className="w-full px-3 py-2 rounded-lg border bg-slate-50 dark:bg-slate-800"
                />
                <div className="max-h-56 overflow-y-auto border rounded-lg p-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {filteredIcons.length === 0 ? (
                    <p className="text-sm text-slate-500 col-span-full px-2 py-1">No se encontraron íconos.</p>
                  ) : (
                    filteredIcons.map((iconName) => {
                      const selected = form.icon === iconName;

                      return (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => setForm((state) => ({ ...state, icon: iconName }))}
                          className={`flex items-center gap-2 px-2 py-2 rounded-lg border text-sm text-left ${
                            selected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                        >
                          {renderCategoryIcon(iconName, "w-4 h-4 shrink-0")}
                          <span className="truncate">{iconName}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border">
                Cancelar
              </button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-white font-semibold">
                Guardar
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
