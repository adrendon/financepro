import { Sidebar } from "@/components/Sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import TopCards from "@/components/TopCards";
import SpendingBreakdown from "@/components/SpendingBreakdown";
import TransactionTable from "@/components/TransactionTable";
import SavingsGoals from "@/components/SavingsGoals";
import UpcomingBills from "@/components/UpcomingBills";
import FirstStepsTour from "@/components/FirstStepsTour";
import AppFooter from "@/components/AppFooter";
import { createClient } from "@/utils/supabase/server";

export default async function AppHomeView({ userId }: { userId: string | null }) {
  const supabase = await createClient();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const { data: { user } } = await supabase.auth.getUser();

  const profileResult = user?.id
    ? await supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle()
    : { data: null };

  const [{ data: transactions }, { data: investments }, { data: bills }, { data: categories }] = await Promise.all([
    supabase.from("transactions").select("category, amount, type, date"),
    supabase.from("investments").select("name, investment_type, invested_amount, started_at, created_at"),
    supabase.from("upcoming_bills").select("title, amount, due_date, status"),
    supabase
      .from("categories")
      .select("id, name, icon, applies_to")
      .in("applies_to", ["transaction", "bill", "budget", "saving"])
      .order("name", { ascending: true }),
  ]);

  const profile = profileResult.data;
  const fullName = profile?.full_name?.trim();
  const displayName = fullName ? (fullName.split(" ")[0] || fullName) : (profile?.email?.split("@")[0] || user?.email?.split("@")[0] || "");
  const MONTH_SHORT_ES = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];
  const dashboardRangeLabel = `${String(startOfMonth.getDate()).padStart(2,'0')} ${MONTH_SHORT_ES[startOfMonth.getMonth()]} - ${String(today.getDate()).padStart(2,'0')} ${MONTH_SHORT_ES[today.getMonth()]} ${today.getFullYear()}`;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-10 py-8 pt-14 md:pt-0">
        <DashboardHeader rangeLabel={dashboardRangeLabel} displayName={displayName} categories={(categories as any) || []} />

        <TopCards />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-8">
            <SpendingBreakdown
              transactions={(transactions as Array<{ category: string; amount: number; type: "income" | "expense"; date: string }>) || []}
              investments={(investments as Array<{ name: string; investment_type: string; invested_amount: number; started_at: string | null; created_at?: string | null }>) || []}
              bills={(bills as Array<{ title: string; amount: number; due_date: string; status: string }>) || []}
              todayISO={todayISO}
            />
            <TransactionTable />
          </div>

          <div className="space-y-8">
            <SavingsGoals />
            <UpcomingBills />
          </div>
        </div>

        <div className="mt-10">
          <AppFooter />
        </div>
      </main>

      <FirstStepsTour userId={userId} shouldOpen={Boolean(userId)} />
    </div>
  );
}
