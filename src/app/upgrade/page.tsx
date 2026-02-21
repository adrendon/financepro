import { Sidebar } from "@/components/Sidebar";
import Link from "next/link";
import { Gem, ShieldCheck } from "lucide-react";

const featureLabels: Record<string, string> = {
  transactions: "Transacciones",
  investments: "Inversiones",
};

export default async function UpgradePage({
  searchParams,
}: {
  searchParams?: Promise<{ feature?: string }>;
}) {
  const checkoutUrl =
    process.env.NEXT_PUBLIC_MONTHLY_CHECKOUT_URL || "/soporte?plan=premium-mensual";
  const whatsappPayUrl =
    process.env.NEXT_PUBLIC_WHATSAPP_UPGRADE_URL ||
    "https://wa.me/573000000000?text=Hola%2C%20quiero%20pagar%20la%20mensualidad%20Premium%20de%20FinancePro";
  const params = (await searchParams) || {};
  const featureKey = params.feature || "transactions";
  const featureLabel = featureLabels[featureKey] || "esta sección";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-10 py-8">
        <div className="max-w-3xl mx-auto w-full">
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
            <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
              <Gem className="w-7 h-7" />
            </div>

            <h1 className="text-3xl font-black tracking-tight mb-3">Función premium</h1>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              La sección <span className="font-bold">{featureLabel}</span> está disponible para planes <span className="font-bold">Pro/Premium</span> o para usuarios <span className="font-bold">Admin</span>.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/40">
                <p className="text-sm text-slate-500 mb-1">Incluye</p>
                <p className="font-semibold">Módulos avanzados</p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/40">
                <p className="text-sm text-slate-500 mb-1">Acceso</p>
                <p className="font-semibold">Transacciones e Inversiones</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-lg bg-primary text-white font-semibold inline-flex items-center gap-2"
              >
                <Gem className="w-4 h-4" /> Pagar mensualidad
              </a>
              <a
                href={whatsappPayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold inline-flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" /> Pagar ahora (WhatsApp)
              </a>
              <Link
                href="/perfil"
                className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold inline-flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" /> Ver mi plan
              </Link>
              <Link
                href="/"
                className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold"
              >
                Volver al panel
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
