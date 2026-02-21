import { Sidebar } from "@/components/Sidebar";
import TransactionsManager from "@/components/TransactionsManager";
import AppFooter from "@/components/AppFooter";
import { createClient } from "@/utils/supabase/server";
import { AppCategory } from "@/utils/categories";

type TxRow = {
  id: number;
  merchant: string;
  category: string;
  amount: number;
  type: "income" | "expense";
  date: string;
};

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

export default async function TransaccionesPage() {
  const supabase = await createClient();
  const serverNow = new Date();
  const todayISO = `${serverNow.getFullYear()}-${String(serverNow.getMonth() + 1).padStart(2, "0")}-${String(serverNow.getDate()).padStart(2, "0")}`;
  const [{ data }, { data: categories }, { data: rules }, { data: templates }, { data: changeLog }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, merchant, category, amount, type, date")
      .order("date", { ascending: false }),
    supabase
      .from("categories")
      .select("id, name, icon, applies_to")
      .eq("applies_to", "transaction")
      .order("name", { ascending: true }),
    supabase
      .from("transaction_rules")
      .select("id, match_pattern, category, inferred_type")
      .order("id", { ascending: false }),
    supabase
      .from("recurring_transaction_templates")
      .select("id, name, merchant, category, amount, type, day_of_month, active")
      .eq("active", true)
      .order("id", { ascending: false }),
    supabase
      .from("transaction_change_log")
      .select("id, action, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(80),
  ]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-10 py-8">
        <div className="max-w-6xl mx-auto w-full">
          <TransactionsManager
            initialTransactions={(data as TxRow[]) || []}
            initialCategories={(categories as AppCategory[]) || []}
            initialRules={(rules as RuleRow[]) || []}
            initialTemplates={(templates as TemplateRow[]) || []}
            initialChangeLog={(changeLog as ChangeLogRow[]) || []}
            todayISO={todayISO}
          />
          <AppFooter />
        </div>
      </main>
    </div>
  );
}
