import { Sidebar } from "@/components/Sidebar";
import InvestmentsManager from "@/components/InvestmentsManager";
import AppFooter from "@/components/AppFooter";
import { createClient } from "@/utils/supabase/server";

type InvestmentRow = {
  id: number;
  name: string;
  investment_type: string;
  invested_amount: number;
  current_value: number;
  started_at: string | null;
  image_url: string | null;
  notes: string | null;
};

export default async function InversionesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("investments").select("*").order("created_at", { ascending: false });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-10 py-8">
        <div className="max-w-6xl mx-auto w-full">
          <InvestmentsManager initialItems={(data as InvestmentRow[]) || []} />
          <AppFooter />
        </div>
      </main>
    </div>
  );
}
