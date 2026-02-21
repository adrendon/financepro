"use client";

import { useMemo, useState, useTransition } from "react";
import { createClient } from "@/utils/supabase/client";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: "admin" | "user" | null;
  subscription_tier: "free" | "pro" | "premium" | null;
  subscription_status: "active" | "trialing" | "past_due" | "canceled" | null;
};

type EditableRow = {
  tier: "free" | "premium";
  status: "active" | "canceled";
};

export default function AdminSubscriptionsManager({
  profiles,
}: {
  profiles: ProfileRow[];
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>("");

  const initialValues = useMemo<Record<string, EditableRow>>(() => {
    return profiles.reduce((acc, profile) => {
      acc[profile.id] = {
        tier: profile.subscription_tier === "premium" ? "premium" : "free",
        status: profile.subscription_status === "canceled" ? "canceled" : "active",
      };
      return acc;
    }, {} as Record<string, EditableRow>);
  }, [profiles]);

  const [rows, setRows] = useState<Record<string, EditableRow>>(initialValues);

  const updateProfile = (profileId: string) => {
    const payload = rows[profileId];
    if (!payload) return;

    startTransition(async () => {
      setMessage("");
      const supabase = createClient();

      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_tier: payload.tier,
          subscription_status: payload.status,
        })
        .eq("id", profileId);

      if (error) {
        setMessage(`No se pudo actualizar: ${error.message}`);
        return;
      }

      setMessage("Suscripción actualizada correctamente");
    });
  };

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 md:p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold">Planes de usuarios</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Como administrador puedes cambiar entre <span className="font-semibold">Free</span> y <span className="font-semibold">Premium</span>.
        </p>
      </div>

      {message ? (
        <div className="mb-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-3 py-2 text-sm">
          {message}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="text-left border-b border-slate-200 dark:border-slate-800">
              <th className="py-2 pr-3">Usuario</th>
              <th className="py-2 pr-3">Email</th>
              <th className="py-2 pr-3">Rol</th>
              <th className="py-2 pr-3">Plan</th>
              <th className="py-2 pr-3">Estado</th>
              <th className="py-2 pr-3">Acción</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => {
              const values = rows[profile.id] || { tier: "free", status: "active" as const };
              const isAdmin = profile.role === "admin";

              return (
                <tr
                  key={profile.id}
                  className="border-b border-slate-100 dark:border-slate-800/70"
                >
                  <td className="py-3 pr-3 font-medium">{profile.full_name || "Sin nombre"}</td>
                  <td className="py-3 pr-3 text-slate-500">{profile.email || "-"}</td>
                  <td className="py-3 pr-3">
                    <span className="px-2 py-1 rounded-full text-xs font-bold uppercase bg-slate-100 dark:bg-slate-800">
                      {profile.role || "user"}
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <select
                      value={values.tier}
                      disabled={isAdmin || isPending}
                      onChange={(event) =>
                        setRows((prev) => ({
                          ...prev,
                          [profile.id]: {
                            ...values,
                            tier: event.target.value as EditableRow["tier"],
                          },
                        }))
                      }
                      className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="free">Free</option>
                      <option value="premium">Premium</option>
                    </select>
                  </td>
                  <td className="py-3 pr-3">
                    <select
                      value={values.status}
                      disabled={isAdmin || isPending}
                      onChange={(event) =>
                        setRows((prev) => ({
                          ...prev,
                          [profile.id]: {
                            ...values,
                            status: event.target.value as EditableRow["status"],
                          },
                        }))
                      }
                      className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="active">Activo</option>
                      <option value="canceled">Cancelado</option>
                    </select>
                  </td>
                  <td className="py-3 pr-3">
                    <button
                      type="button"
                      disabled={isAdmin || isPending}
                      onClick={() => updateProfile(profile.id)}
                      className="px-3 py-1.5 rounded-lg bg-primary text-white disabled:opacity-50"
                    >
                      Guardar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
