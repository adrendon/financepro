import { Sidebar } from "@/components/Sidebar";
import ReportsManager from "@/components/ReportsManager";
import AppFooter from "@/components/AppFooter";
import { createClient } from "@/utils/supabase/server";

type ReportTxRow = {
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
};

export default async function InformesPage() {
  const supabase = await createClient();
  const serverNow = new Date();
  const todayISO = `${serverNow.getFullYear()}-${String(serverNow.getMonth() + 1).padStart(2, "0")}-${String(serverNow.getDate()).padStart(2, "0")}`;
  const { data } = await supabase
    .from("transactions")
    .select("amount, type, category, date")
    .order("date", { ascending: true });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-10 py-8">
        <div className="max-w-6xl mx-auto w-full">
          <ReportsManager initialTransactions={(data as ReportTxRow[]) || []} todayISO={todayISO} />
          <AppFooter />
        </div>
      </main>
    </div>
  );
}
