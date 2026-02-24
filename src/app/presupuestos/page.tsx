import { Sidebar } from "@/components/Sidebar";
import BudgetManager from "@/components/BudgetManager";
import AppFooter from "@/components/AppFooter";
import { createClient } from "@/utils/supabase/server";
import { AppCategory } from "@/utils/categories";

type BudgetRow = {
  id: number;
  category: string;
  monthly_limit: number;
  month_start: string;
  image_url: string | null;
};

type TxRow = {
  category: string;
  amount: number;
  type: string;
  date: string;
};

export default async function PresupuestosPage() {
  const supabase = await createClient();
  const serverNow = new Date();
  const todayISO = `${serverNow.getFullYear()}-${String(serverNow.getMonth() + 1).padStart(2, "0")}-${String(serverNow.getDate()).padStart(2, "0")}`;

  const [{ data: budgets }, { data: transactions }, { data: categories }] = await Promise.all([
    supabase.from("budgets").select("*").order("month_start", { ascending: false }),
    supabase.from("transactions").select("category, amount, type, date"),
    supabase.from("categories").select("id, name, icon, applies_to").eq("applies_to", "budget").order("name", { ascending: true }),
  ]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-10 py-10 pt-14 md:pt-0">
        <div className="max-w-6xl mx-auto w-full">
          <BudgetManager
            initialBudgets={(budgets as BudgetRow[]) || []}
            initialTransactions={(transactions as TxRow[]) || []}
            initialCategories={(categories as AppCategory[]) || []}
            todayISO={todayISO}
          />
          <AppFooter />
        </div>
      </main>
    </div>
  );
}
