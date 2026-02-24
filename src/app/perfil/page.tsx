import { Sidebar } from "@/components/Sidebar";
import { createClient } from "@/utils/supabase/server";
import ProfileManager from "@/components/ProfileManager";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: activity }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, phone, role")
      .eq("id", user?.id ?? "")
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("id, merchant, type, amount, date")
      .eq("user_id", user?.id ?? "")
      .order("date", { ascending: false })
      .limit(5),
  ]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-10 py-8 pt-14 md:pt-0">
        <div className="max-w-4xl mx-auto w-full">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-6">
            Perfil
          </h1>
          <ProfileManager profile={profile} recentActivity={activity || []} />
        </div>
      </main>
    </div>
  );
}
