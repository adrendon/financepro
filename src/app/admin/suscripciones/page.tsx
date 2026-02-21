import { Sidebar } from "@/components/Sidebar";
import { createClient } from "@/utils/supabase/server";
import AdminSubscriptionsManager from "@/components/AdminSubscriptionsManager";

export default async function AdminSubscriptionsPage() {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, subscription_tier, subscription_status")
    .order("created_at", { ascending: true });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-10 py-8">
        <div className="max-w-6xl mx-auto w-full space-y-6">
          <header>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
              Suscripciones
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Administra mensualidades y planes de los usuarios de la plataforma.
            </p>
          </header>

          <AdminSubscriptionsManager profiles={profiles || []} />
        </div>
      </main>
    </div>
  );
}
