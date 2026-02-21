"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import AdminSubscriptionsManager from "@/components/AdminSubscriptionsManager";
import Link from "next/link";
import AppToast from "@/components/AppToast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { formatMoneyInput, parseMoneyInput } from "@/utils/formatters";

type SettingsProfile = {
  id: string;
  role: string | null;
  subscription_tier: string | null;
  subscription_status: string | null;
  language: string | null;
  currency: string | null;
  date_format: string | null;
  two_factor_enabled: boolean | null;
  alerts_by_email: boolean | null;
  profile_visible: boolean | null;
  monthly_income?: number | null;
  monthly_income_onboarded?: boolean | null;
} | null;

type AdminProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: "admin" | "user" | null;
  subscription_tier: "free" | "pro" | "premium" | null;
  subscription_status: "active" | "trialing" | "past_due" | "canceled" | null;
};

export default function SettingsManager({
  profile,
  adminProfiles,
  initialMonthlyIncome,
}: {
  profile: SettingsProfile;
  adminProfiles: AdminProfileRow[];
  initialMonthlyIncome: number | null;
}) {
  const scrollToSection = (event: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    event.preventDefault();
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${sectionId}`);
  };

  const [language, setLanguage] = useState(profile?.language || "es");
  const [currency, setCurrency] = useState(profile?.currency || "COP");
  const [dateFormat, setDateFormat] = useState(profile?.date_format || "DD/MM/AAAA");
  const [monthlyIncome, setMonthlyIncome] = useState(
    initialMonthlyIncome != null && Number.isFinite(initialMonthlyIncome)
      ? formatMoneyInput(String(initialMonthlyIncome))
      : ""
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const [twoFactor, setTwoFactor] = useState(!!profile?.two_factor_enabled);
  const [alertsByEmail, setAlertsByEmail] = useState(profile?.alerts_by_email ?? true);
  const [profileVisible, setProfileVisible] = useState(profile?.profile_visible ?? true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [inAppNotifications, setInAppNotifications] = useState(true);
  const [activeSection, setActiveSection] = useState<"general" | "notificaciones" | "seguridad" | "privacidad" | "suscripcion">("general");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [processingDeleteAccount, setProcessingDeleteAccount] = useState(false);

  const checkoutUrl =
    process.env.NEXT_PUBLIC_MONTHLY_CHECKOUT_URL || "/soporte?plan=premium-mensual";
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
  const whatsappPayUrl =
    process.env.NEXT_PUBLIC_WHATSAPP_UPGRADE_URL ||
    "https://wa.me/573000000000?text=Hola%2C%20quiero%20pagar%20mi%20suscripci%C3%B3n%20Premium";
  const deleteAccountUrl =
    process.env.NEXT_PUBLIC_DELETE_ACCOUNT_URL ||
    "/soporte?topic=eliminar-cuenta";

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 2800);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    if (!profile?.id) {
      setSaving(false);
      setMessage("No se pudo identificar el perfil actual.");
      return;
    }

    const supabase = createClient();

    const parsedMonthlyIncome = parseMoneyInput(monthlyIncome);
    if (!Number.isFinite(parsedMonthlyIncome) || parsedMonthlyIncome <= 0) {
      setSaving(false);
      setMessage("El ingreso mensual debe ser un valor válido mayor a 0.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        language,
        currency,
        date_format: dateFormat,
        two_factor_enabled: twoFactor,
        alerts_by_email: alertsByEmail,
        profile_visible: profileVisible,
        monthly_income: parsedMonthlyIncome,
        monthly_income_onboarded: true,
      })
      .eq("id", profile.id);

    if (error) {
      setSaving(false);
      setMessage(`Error: ${error.message}`);
      return;
    }

    setSaving(false);
    setMessage("Preferencias guardadas.");
  };

  const saveToggles = async (
    nextValues: Partial<{
      two_factor_enabled: boolean;
      alerts_by_email: boolean;
      profile_visible: boolean;
    }>
  ) => {
    if (!profile?.id) return;
    const supabase = createClient();
    await supabase.from("profiles").update(nextValues).eq("id", profile.id);
  };

  useEffect(() => {
    const sections = [
      { id: "cfg-general", key: "general" as const },
      { id: "cfg-notificaciones", key: "notificaciones" as const },
      { id: "cfg-seguridad", key: "seguridad" as const },
      { id: "cfg-privacidad", key: "privacidad" as const },
      { id: "cfg-suscripcion", key: "suscripcion" as const },
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible?.target?.id) return;
        const found = sections.find((section) => section.id === visible.target.id);
        if (found) setActiveSection(found.key);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0.2, 0.5, 0.8] }
    );

    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const navClass = (key: "general" | "notificaciones" | "seguridad" | "privacidad" | "suscripcion") =>
    `pb-3 border-b-2 ${
      activeSection === key
        ? "border-primary text-primary font-semibold"
        : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
    }`;

  const requestDeleteAccount = async () => {
    setProcessingDeleteAccount(true);
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    setProcessingDeleteAccount(false);
    setConfirmDeleteAccount(false);
    showToast("success", "Solicitud enviada. Te llevaremos al canal de gestión.");
    window.open(deleteAccountUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-8">
      {toast ? <AppToast toast={toast} onClose={() => setToast(null)} /> : null}

      <div className="bg-transparent">
        <nav className="h-14 px-2 border-b border-slate-300/60 dark:border-slate-700/40 flex items-end flex-wrap gap-8">
          <a href="#cfg-general" onClick={(event) => scrollToSection(event, "cfg-general")} className={navClass("general")}>Preferencias Generales</a>
          <a href="#cfg-notificaciones" onClick={(event) => scrollToSection(event, "cfg-notificaciones")} className={navClass("notificaciones")}>Notificaciones</a>
          <a href="#cfg-seguridad" onClick={(event) => scrollToSection(event, "cfg-seguridad")} className={navClass("seguridad")}>Seguridad</a>
          <a href="#cfg-privacidad" onClick={(event) => scrollToSection(event, "cfg-privacidad")} className={navClass("privacidad")}>Privacidad</a>
          <a href="#cfg-suscripcion" onClick={(event) => scrollToSection(event, "cfg-suscripcion")} className={navClass("suscripcion")}>Suscripción</a>
        </nav>
      </div>

      <form
        id="cfg-general"
        onSubmit={save}
        className="scroll-mt-24 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
      >
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-semibold mb-2 block">Idioma</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-4 py-2.5 text-sm">
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="pt">Português</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold mb-2 block">Moneda principal</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-4 py-2.5 text-sm">
              <option value="USD">Dólar ($)</option>
              <option value="EUR">Euro (€)</option>
              <option value="COP">Peso colombiano ($)</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold mb-2 block">Formato fecha</label>
            <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-4 py-2.5 text-sm">
              <option value="DD/MM/AAAA">DD/MM/AAAA</option>
              <option value="MM/DD/AAAA">MM/DD/AAAA</option>
              <option value="AAAA-MM-DD">AAAA-MM-DD</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold mb-2 block">Ingreso mensual</label>
            <input
              type="text"
              inputMode="numeric"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(formatMoneyInput(e.target.value))}
              placeholder="Ej: 3500000"
              className="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-semibold mb-2 block">Tema</label>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700 w-fit">
              <button type="button" onClick={() => setTheme("light")} className={`p-1.5 rounded-full ${resolvedTheme === "light" ? "bg-white text-primary shadow-sm" : "text-slate-500"}`}><Sun className="w-4 h-4" /></button>
              <button type="button" onClick={() => setTheme("dark")} className={`p-1.5 rounded-full ${resolvedTheme === "dark" ? "bg-primary text-white shadow-sm" : "text-slate-500"}`}><Moon className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-sm text-slate-500">{message || ""}</p>
          <button disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-white font-semibold disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>

      <section id="cfg-notificaciones" className="scroll-mt-24 space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="font-bold">Notificaciones por email</h3>
            <p className="text-sm text-slate-500">Recibe por correo alertas de facturas, seguridad y actividad relevante.</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              const next = !alertsByEmail;
              setAlertsByEmail(next);
              await saveToggles({ alerts_by_email: next });
              showToast("success", `Notificaciones por email ${next ? "activadas" : "desactivadas"}.`);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${alertsByEmail ? "bg-primary text-white" : "border"}`}
          >
            {alertsByEmail ? "Activadas" : "Desactivadas"}
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="font-bold">Notificaciones push</h3>
            <p className="text-sm text-slate-500">Alertas instantáneas en navegador o dispositivo compatible.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !pushNotifications;
              setPushNotifications(next);
              showToast("success", `Notificaciones push ${next ? "activadas" : "desactivadas"}.`);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${pushNotifications ? "bg-primary text-white" : "border"}`}
          >
            {pushNotifications ? "Activadas" : "Desactivadas"}
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="font-bold">Centro de notificaciones</h3>
            <p className="text-sm text-slate-500">Abre el historial completo y revisa las últimas actividades.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const next = !inAppNotifications;
                setInAppNotifications(next);
                showToast("success", `Centro de notificaciones ${next ? "activo" : "silenciado"}.`);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${inAppNotifications ? "bg-primary text-white" : "border"}`}
            >
              {inAppNotifications ? "Activo" : "Silenciado"}
            </button>
            <Link href="/notificaciones" className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold">
              Ver notificaciones
            </Link>
          </div>
        </div>
      </section>

      <section id="cfg-seguridad" className="scroll-mt-24 space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="font-bold">Cambiar contraseña</h3>
            <p className="text-sm text-slate-500">Gestiona tu contraseña desde Perfil. Se solicita contraseña actual para validar cambios.</p>
          </div>
          <Link href="/perfil#perfil-seguridad" className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold">
            Ir a seguridad
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="font-bold">Autenticación de dos factores</h3>
            <p className="text-sm text-slate-500">Gestiona la preferencia de verificación adicional.</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              const next = !twoFactor;
              setTwoFactor(next);
              await saveToggles({ two_factor_enabled: next });
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${twoFactor ? "bg-primary text-white" : "border"}`}
          >
            {twoFactor ? "Activado" : "Activar"}
          </button>
        </div>
      </section>

      <section id="cfg-privacidad" className="scroll-mt-24 space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="font-bold">Perfil visible</h3>
            <p className="text-sm text-slate-500">Permite que tu perfil sea visible en vistas compartidas.</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              const next = !profileVisible;
              setProfileVisible(next);
              await saveToggles({ profile_visible: next });
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${profileVisible ? "bg-primary text-white" : "border"}`}
          >
            {profileVisible ? "Visible" : "Oculto"}
          </button>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="font-bold">Control de actividad pública</h3>
            <p className="text-sm text-slate-500">Decide si tu actividad anónima puede usarse para mejorar reportes globales.</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              const next = !inAppNotifications;
              setInAppNotifications(next);
              showToast("success", `Análisis de actividad ${next ? "activado" : "desactivado"}.`);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${inAppNotifications ? "bg-primary text-white" : "border"}`}
          >
            {inAppNotifications ? "Activado" : "Desactivado"}
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="font-bold text-rose-600">Eliminar permanentemente mi cuenta</h3>
            <p className="text-sm text-slate-500">Borra tus datos y desactiva el acceso. Esta acción no se puede deshacer.</p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmDeleteAccount(true)}
            className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold"
          >
            Eliminar cuenta
          </button>
        </div>
      </section>

      <section id="cfg-suscripcion" className="scroll-mt-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-bold">Plan actual</h3>
        <p className="text-sm text-slate-500">Gestiona beneficios, método de pago y estado de tu suscripción.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg border p-4">
            <p className="text-slate-500">Plan</p>
            <p className="font-bold uppercase">{profile?.subscription_tier || "free"}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-slate-500">Estado</p>
            <p className="font-bold uppercase">{profile?.subscription_status || "active"}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-slate-500">Rol</p>
            <p className="font-bold uppercase">{profile?.role || "user"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border p-4">
            <p className="text-slate-500">Método de pago</p>
            <p className="font-bold">Tarjeta / Plataforma externa</p>
            <p className="text-xs text-slate-500 mt-1">Gestiona si pagas por tarjeta, débito o pasarela vinculada.</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-slate-500">Cobro recurrente</p>
            <p className="font-bold">{profile?.subscription_status === "canceled" ? "Desactivado" : "Activo"}</p>
            <p className="text-xs text-slate-500 mt-1">Puedes pausar o cancelar la renovación automática.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <a href={billingPortalUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold">
            Cambiar método de pago
          </a>
          <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 bg-primary text-white rounded-lg font-semibold">
            Pagar mensualidad
          </a>
          <a href={whatsappPayUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold">
            Pagar ahora (WhatsApp)
          </a>
          <a href={pauseUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 bg-amber-500 text-white rounded-lg font-semibold">
            Pausar suscripción
          </a>
          <a href={cancelUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 bg-rose-600 text-white rounded-lg font-semibold">
            Cancelar suscripción
          </a>
          {(profile?.subscription_tier === "pro" || profile?.subscription_tier === "premium" || profile?.role === "admin") ? (
            <Link href="/suscripcion" className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold">
              Gestionar suscripción
            </Link>
          ) : null}
        </div>
      </section>

      {profile?.role === "admin" ? (
        <section id="admin-suscripciones" className="space-y-3">
          <h3 className="text-lg font-bold">Administrar suscripciones</h3>
          <AdminSubscriptionsManager profiles={adminProfiles} />
        </section>
      ) : null}

      <ConfirmDialog
        open={confirmDeleteAccount}
        title="Eliminar cuenta"
        message="Esta acción es permanente. Se abrirá el canal de gestión para confirmar y procesar la eliminación de tu cuenta."
        confirmLabel="Solicitar eliminación"
        loading={processingDeleteAccount}
        loadingLabel="Procesando..."
        onConfirm={() => {
          void requestDeleteAccount();
        }}
        onCancel={() => setConfirmDeleteAccount(false)}
      />
    </div>
  );
}
