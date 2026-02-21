import { Sidebar } from "@/components/Sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import TopCards from "@/components/TopCards";
import SpendingBreakdown from "@/components/SpendingBreakdown";
import TransactionTable from "@/components/TransactionTable";
import SavingsGoals from "@/components/SavingsGoals";
import UpcomingBills from "@/components/UpcomingBills";
import MonthlyIncomeOnboardingModal from "@/components/MonthlyIncomeOnboardingModal";
import AppFooter from "@/components/AppFooter";
import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("monthly_income, monthly_income_onboarded")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dashboardRangeLabel = `${startOfMonth.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  })} - ${today.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;

  const rawMonthlyIncome = profile?.monthly_income;
  const initialMonthlyIncome =
    typeof rawMonthlyIncome === "number"
      ? rawMonthlyIncome
      : typeof rawMonthlyIncome === "string" && rawMonthlyIncome.trim()
      ? Number(rawMonthlyIncome)
      : null;
  const shouldOpenMonthlyIncomeModal =
    initialMonthlyIncome == null || !Number.isFinite(initialMonthlyIncome) || initialMonthlyIncome <= 0;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        {/* Header */}
        <DashboardHeader rangeLabel={dashboardRangeLabel} />

        {/* Top Cards */}
        <TopCards />

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column (2/3) */}
          <div className="xl:col-span-2 space-y-8">
            <SpendingBreakdown />
            <TransactionTable />
          </div>

          {/* Right Column (1/3) */}
          <div className="space-y-8">
            <SavingsGoals />
            <UpcomingBills />
          </div>
        </div>

        <div className="mt-10">
          <AppFooter />
        </div>
      </main>

      <MonthlyIncomeOnboardingModal
        initialMonthlyIncome={
          initialMonthlyIncome != null && Number.isFinite(initialMonthlyIncome)
            ? initialMonthlyIncome
            : null
        }
        shouldOpen={shouldOpenMonthlyIncomeModal}
      />
    </div>
  );
}
