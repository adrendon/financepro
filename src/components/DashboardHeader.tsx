"use client";

import { useState } from "react";
import { Calendar, Plus } from "lucide-react";
import NewTransactionModal from "./NewTransactionModal";
import { AppCategory } from "@/utils/categories";

type DashboardHeaderProps = {
  rangeLabel: string;
  displayName: string;
  categories: AppCategory[];
};

export function DashboardHeader({ rangeLabel, displayName, categories }: DashboardHeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-16 md:mb-8">
        <div>
          <h2 className="text-2xl font-bold">Resumen Financiero</h2>
          <p className="text-slate-500 dark:text-slate-400">Bienvenido, {displayName || "Usuario"}. Tus finanzas se ven saludables hoy.</p>
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

      <NewTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} categories={categories} />
    </>
  );
}
