import { Sidebar } from "@/components/Sidebar";
import ReportsManager from "@/components/ReportsManager";
import AppFooter from "@/components/AppFooter";
import { createClient } from "@/utils/supabase/server";

type ReportTxRow = {
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  merchant?: string;
};

type ReportInvestmentRow = {
  name: string;
  investment_type: string;
  invested_amount: number;
  started_at: string | null;
  created_at?: string | null;
};

type ReportBillRow = {
  title: string;
  amount: number;
  due_date: string;
  status: string;
};

export default async function InformesPage() {
  const supabase = await createClient();
  const serverNow = new Date();
  const todayISO = `${serverNow.getFullYear()}-${String(serverNow.getMonth() + 1).padStart(2, "0")}-${String(serverNow.getDate()).padStart(2, "0")}`;
  const [{ data: txData }, { data: invData }, { data: billData }] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, type, category, date, merchant")
      .order("date", { ascending: true }),
    supabase
      .from("investments")
      .select("name, investment_type, invested_amount, started_at, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("upcoming_bills")
      .select("title, amount, due_date, status")
      .order("due_date", { ascending: true }),
  ]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-10 py-8 pt-14 md:pt-0">
        <div className="max-w-6xl mx-auto w-full">
          <ReportsManager
            initialTransactions={(txData as ReportTxRow[]) || []}
            initialInvestments={(invData as ReportInvestmentRow[]) || []}
            initialBills={(billData as ReportBillRow[]) || []}
            todayISO={todayISO}
          />
          <AppFooter />
        </div>
      </main>
    </div>
  );
}
