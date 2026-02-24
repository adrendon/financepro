import { Sidebar } from "@/components/Sidebar";
import SettingsManager from "@/components/SettingsManager";
import { createClient } from "@/utils/supabase/server";

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, role, language, currency, date_format, two_factor_enabled, alerts_by_email, profile_visible"
    )
    .eq("id", user?.id ?? "")
    .maybeSingle();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-10 py-8 pt-14 md:pt-0">
        <div className="max-w-4xl mx-auto w-full">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-6">
            Configuración
          </h1>
          <SettingsManager profile={profile} />
        </div>
      </main>
    </div>
  );
}
