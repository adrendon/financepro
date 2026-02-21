import { notFound } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { createClient } from "@/utils/supabase/server";
import BillDetailManager from "../../../components/BillDetailManager";
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

export default async function BillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const billId = Number(id);

  if (!Number.isFinite(billId)) {
    notFound();
  }

  const supabase = await createClient();
  const [{ data: bill }, { data: categories }] = await Promise.all([
    supabase.from("upcoming_bills").select("*").eq("id", billId).maybeSingle(),
    supabase.from("categories").select("id, name, icon, applies_to").eq("applies_to", "bill").order("name", { ascending: true }),
  ]);

  if (!bill) {
    notFound();
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-10 py-8">
        <div className="max-w-6xl mx-auto w-full">
          <BillDetailManager
            initialBill={bill as BillRow}
            categories={(categories as AppCategory[]) || []}
          />
        </div>
      </main>
    </div>
  );
}
