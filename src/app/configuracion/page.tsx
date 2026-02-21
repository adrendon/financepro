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
      "id, role, subscription_tier, subscription_status, subscription_ends_at, language, currency, date_format, two_factor_enabled, alerts_by_email, profile_visible, monthly_income"
    )
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const rawMonthlyIncome = profile?.monthly_income;
  const initialMonthlyIncome =
    typeof rawMonthlyIncome === "number"
      ? rawMonthlyIncome
      : typeof rawMonthlyIncome === "string" && rawMonthlyIncome.trim()
      ? Number(rawMonthlyIncome)
      : null;

  let adminProfiles: Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    role: "admin" | "user" | null;
    subscription_tier: "free" | "pro" | "premium" | null;
    subscription_status: "active" | "trialing" | "past_due" | "canceled" | null;
  }> = [];

  if (profile?.role === "admin") {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, subscription_tier, subscription_status")
      .order("created_at", { ascending: true });
    adminProfiles = data || [];
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-10 py-8">
        <div className="max-w-4xl mx-auto w-full">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-6">
            Configuración
          </h1>
          <SettingsManager
            profile={profile}
            adminProfiles={adminProfiles}
            initialMonthlyIncome={
              initialMonthlyIncome != null && Number.isFinite(initialMonthlyIncome)
                ? initialMonthlyIncome
                : null
            }
          />
        </div>
      </main>
    </div>
  );
}
