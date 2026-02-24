import { Sidebar } from "@/components/Sidebar";
import SavingsManager from "@/components/SavingsManager";
import AppFooter from "@/components/AppFooter";
import { createClient } from "@/utils/supabase/server";
import { AppCategory } from "@/utils/categories";

type GoalRow = {
  id: number;
  title: string;
  category: string;
  current_amount: number;
  target_amount: number;
  status: string;
  color_class: string;
  target_date: string | null;
  image_url: string | null;
};

type ContributionRow = {
  id: number;
  savings_goal_id: number;
  amount: number;
  note: string | null;
  contribution_date: string;
};

export default async function AhorrosPage({
  searchParams,
}: {
  searchParams?: Promise<{ newGoal?: string }>;
}) {
  const params = (await searchParams) || {};
  const supabase = await createClient();
  const serverNow = new Date();
  const todayISO = `${serverNow.getFullYear()}-${String(serverNow.getMonth() + 1).padStart(2, "0")}-${String(serverNow.getDate()).padStart(2, "0")}`;
  const [{ data: goals }, { data: contributions }, { data: categories }] = await Promise.all([
    supabase
      .from("savings_goals")
      .select("id, title, category, current_amount, target_amount, status, color_class, target_date, image_url")
      .order("created_at", { ascending: true }),
    supabase
      .from("savings_contributions")
      .select("id, savings_goal_id, amount, note, contribution_date")
      .order("contribution_date", { ascending: false }),
    supabase
      .from("categories")
      .select("id, name, icon, applies_to")
      .eq("applies_to", "saving")
      .order("name", { ascending: true }),
  ]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-10 py-8 pt-14 md:pt-0">
        <div className="max-w-300 mx-auto w-full flex flex-col gap-8">
          <SavingsManager
            initialGoals={(goals as GoalRow[]) || []}
            initialContributions={(contributions as ContributionRow[]) || []}
            initialCategories={(categories as AppCategory[]) || []}
            openNewGoalByDefault={params.newGoal === "1"}
            todayISO={todayISO}
          />
          <AppFooter />
        </div>
      </main>
    </div>
  );
}
