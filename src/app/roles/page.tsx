import { Sidebar } from "@/components/Sidebar";
import { createClient } from "@/utils/supabase/server";

type RoleBucket = "admin" | "user";

const roleCards: Record<RoleBucket, { title: string; description: string; features: string[] }> = {
  admin: {
    title: "Administrador",
    description: "Control total de la plataforma y configuración avanzada.",
    features: ["Gestión completa", "Acceso total a módulos", "Configuración prioritaria"],
  },
  user: {
    title: "Usuario",
    description: "Funciones esenciales para organizar finanzas personales.",
    features: ["Resumen general", "Registro de movimientos", "Control básico de presupuesto"],
  },
};

const resolveBucket = (role: string | null): RoleBucket => {
  if (role === "admin") return "admin";
  return "user";
};

export default async function RolesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const currentBucket = resolveBucket(profile?.role ?? null);
  const displayName = profile?.full_name?.trim() || profile?.email?.split("@")[0] || "Usuario";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-10 py-8 pt-14 md:pt-0">
        <div className="max-w-6xl mx-auto w-full space-y-6">
          <header>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
              Vista de Roles
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              {displayName}, tu acceso actual es <span className="font-semibold text-primary uppercase">{currentBucket}</span>.
            </p>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.keys(roleCards) as RoleBucket[]).map((bucket) => {
              const card = roleCards[bucket];
              const isCurrent = currentBucket === bucket;

              return (
                <article
                  key={bucket}
                  className={`rounded-2xl border p-5 bg-white dark:bg-slate-900 ${
                    isCurrent
                      ? "border-primary shadow-lg shadow-primary/10"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold">{card.title}</h2>
                    {isCurrent ? (
                      <span className="text-xs font-bold uppercase px-2 py-1 rounded-full bg-primary/10 text-primary">
                        Actual
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-slate-500 mb-4">{card.description}</p>
                  <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                    {card.features.map((feature) => (
                      <li key={feature} className="rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2">
                        {feature}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </section>
        </div>
      </main>
    </div>
  );
}
