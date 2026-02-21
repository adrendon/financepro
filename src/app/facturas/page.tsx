import { Sidebar } from "@/components/Sidebar";
import BillsManager from "@/components/BillsManager";
import { createClient } from "@/utils/supabase/server";
import { AppCategory } from "@/utils/categories";

type BillRow = {
  id: number;
  title: string;
  category: string;
  description: string | null;
  amount: number;
  due_date: string;
  status: string;
  is_urgent: boolean;
  recurrence: string | null;
};

export default async function FacturasPage({
  searchParams,
}: {
  searchParams?: Promise<{ newBill?: string }>;
}) {
  const params = (await searchParams) || {};
  const supabase = await createClient();
  const [{ data }, { data: categories }] = await Promise.all([
    supabase.from("upcoming_bills").select("*").order("due_date", { ascending: true }),
    supabase.from("categories").select("id, name, icon, applies_to").eq("applies_to", "bill").order("name", { ascending: true }),
  ]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-10 py-8">
        <div className="max-w-6xl mx-auto w-full">
          <BillsManager
            initialBills={(data as BillRow[]) || []}
            initialCategories={(categories as AppCategory[]) || []}
            openNewByDefault={params.newBill === "1"}
          />
        </div>
      </main>
    </div>
  );
}
