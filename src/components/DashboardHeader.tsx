"use client";

import { useEffect, useState } from "react";
import { Calendar, Plus } from "lucide-react";
import NewTransactionModal from "./NewTransactionModal";
import { createClient } from "@/utils/supabase/client";
import { AppCategory } from "@/utils/categories";

type DashboardHeaderProps = {
  rangeLabel: string;
};

export function DashboardHeader({ rangeLabel }: DashboardHeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayName, setDisplayName] = useState("Usuario");
  const [categories, setCategories] = useState<AppCategory[]>([]);

  useEffect(() => {
    const loadName = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const [profileResult, categoriesResult] = await Promise.all([
        user?.id
          ? supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("categories")
          .select("id, name, icon, applies_to")
          .in("applies_to", ["transaction", "bill", "budget", "saving"])
          .order("name", { ascending: true }),
      ]);

      const profile = profileResult.data;
      const categoriesData = categoriesResult.data;

      const fullName = profile?.full_name?.trim();
      if (fullName) {
        setDisplayName(fullName.split(" ")[0] || fullName);
      } else {
        const fallback = profile?.email?.split("@")[0] || user?.email?.split("@")[0];
        if (fallback) setDisplayName(fallback);
      }

      setCategories((categoriesData as AppCategory[]) || []);
    };

    loadName();
  }, []);

  return (
    <>
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold">Resumen Financiero</h2>
          <p className="text-slate-500 dark:text-slate-400">
            Bienvenido de nuevo, {displayName}. Tus finanzas se ven saludables hoy.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2">
            <Calendar className="w-4 h-4 text-slate-400 mr-2" />
            <span className="text-sm font-medium capitalize">{rangeLabel}</span>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nueva Entrada
          </button>
        </div>
      </header>

      <NewTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categories={categories}
      />
    </>
  );
}
