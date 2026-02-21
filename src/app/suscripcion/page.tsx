import Link from "next/link";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { createClient } from "@/utils/supabase/server";
import { tierLabel } from "@/utils/formatters";
import { BadgeCheck, PauseCircle, XCircle, CreditCard } from "lucide-react";

export default async function SuscripcionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, subscription_tier, subscription_status, subscription_ends_at")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const role = profile?.role ?? "user";
  const tier = profile?.subscription_tier ?? "free";
  const isEligible = role === "admin" || tier === "pro" || tier === "premium";

  if (!isEligible) {
    redirect("/upgrade?feature=subscription-management");
  }

  const billingPortalUrl =
    process.env.NEXT_PUBLIC_BILLING_PORTAL_URL ||
    process.env.NEXT_PUBLIC_MONTHLY_CHECKOUT_URL ||
    "/soporte?topic=billing";

  const pauseUrl =
    process.env.NEXT_PUBLIC_PAUSE_SUBSCRIPTION_URL ||
    "https://wa.me/573000000000?text=Hola%2C%20quiero%20pausar%20mi%20suscripci%C3%B3n%20temporalmente";

  const cancelUrl =
    process.env.NEXT_PUBLIC_CANCEL_SUBSCRIPTION_URL ||
    "https://wa.me/573000000000?text=Hola%2C%20quiero%20cancelar%20mi%20suscripci%C3%B3n";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-10 py-8">
        <div className="max-w-4xl mx-auto w-full space-y-6">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Gestión de Suscripción
          </h1>

          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <BadgeCheck className="w-5 h-5 text-primary" />
              <span>
                Plan {tierLabel(tier)} · estado {String(profile?.subscription_status || "active").toUpperCase()}
              </span>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300">
              Vence: {profile?.subscription_ends_at ? new Date(profile.subscription_ends_at).toLocaleDateString("es-CO") : "Sin fecha"}
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-slate-900 dark:text-white">Cambiar método de pago</h2>
              </div>
              <p className="text-sm text-slate-500">Actualiza tarjeta, débito o método preferido de cobro.</p>
              <a
                href={billingPortalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex px-4 py-2.5 bg-primary text-white rounded-lg font-semibold"
              >
                Gestionar pago
              </a>
            </article>

            <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <PauseCircle className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-slate-900 dark:text-white">Pausar suscripción</h2>
              </div>
              <p className="text-sm text-slate-500">Solicita una pausa temporal sin perder tu cuenta.</p>
              <a
                href={pauseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex px-4 py-2.5 bg-amber-500 text-white rounded-lg font-semibold"
              >
                Pausar ahora
              </a>
            </article>

            <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-500" />
                <h2 className="font-bold text-slate-900 dark:text-white">Cancelar suscripción</h2>
              </div>
              <p className="text-sm text-slate-500">Cancela tu plan premium/pro cuando lo necesites.</p>
              <a
                href={cancelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex px-4 py-2.5 bg-rose-600 text-white rounded-lg font-semibold"
              >
                Cancelar plan
              </a>
            </article>
          </section>

          <div className="text-sm text-slate-500 dark:text-slate-400">
            También puedes gestionar cambios desde <Link href="/configuracion#cfg-suscripcion" className="text-primary font-semibold">Configuración &gt; Suscripción</Link>.
          </div>
        </div>
      </main>
    </div>
  );
}
