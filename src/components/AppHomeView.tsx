import { Sidebar } from "@/components/Sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import TopCards from "@/components/TopCards";
import SpendingBreakdown from "@/components/SpendingBreakdown";
import TransactionTable from "@/components/TransactionTable";
import SavingsGoals from "@/components/SavingsGoals";
import UpcomingBills from "@/components/UpcomingBills";
import FirstStepsTour from "@/components/FirstStepsTour";
import AppFooter from "@/components/AppFooter";

export default async function AppHomeView({ userId }: { userId: string | null }) {
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

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <DashboardHeader rangeLabel={dashboardRangeLabel} />

        <TopCards />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-8">
            <SpendingBreakdown />
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
