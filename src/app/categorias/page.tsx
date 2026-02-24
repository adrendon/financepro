import { Sidebar } from "@/components/Sidebar";
import CategoryManager from "@/components/CategoryManager";
import { createClient } from "@/utils/supabase/server";
import { AppCategory, canManageCategories } from "@/utils/categories";

export default async function CategoriasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: categories }, { data: profile }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, icon, applies_to")
      .order("name", { ascending: true }),
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user?.id ?? "")
      .maybeSingle(),
  ]);

  const canManage = canManageCategories(profile?.role ?? null);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-10 py-8 pt-14 md:pt-0">
        <div className="max-w-6xl mx-auto w-full">
          <CategoryManager
            initialCategories={(categories as AppCategory[]) || []}
            initialScope="transaction"
            canManage={canManage}
          />
        </div>
      </main>
    </div>
  );
}
