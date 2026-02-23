"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { pushNotification } from "@/utils/notifications";
import { Camera, IdCard, Shield, BellRing } from "lucide-react";
import AppToast from "@/components/AppToast";
import LogoutButton from "@/components/LogoutButton";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: string | null;
};

type Activity = {
  id: number;
  merchant: string;
  type: "income" | "expense";
  amount: number;
  date: string;
};

export default function ProfileManager({
  profile,
  recentActivity,
}: {
  profile: Profile | null;
  recentActivity: Activity[];
}) {
  const scrollToSection = (event: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    event.preventDefault();
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${sectionId}`);
  };

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [saving, setSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeSection, setActiveSection] = useState<"info" | "seguridad" | "actividad">("info");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const sections = [
      { id: "perfil-info", key: "info" as const },
      { id: "perfil-seguridad", key: "seguridad" as const },
      { id: "perfil-actividad", key: "actividad" as const },
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

  const navClass = (key: "info" | "seguridad" | "actividad") =>
    `pb-3 border-b-2 ${
      activeSection === key
        ? "border-primary text-primary font-semibold"
        : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
    }`;

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 2800);
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile?.id) return;

    setSaving(true);
    setProfileMessage(null);

    const supabase = createClient();

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        phone: phone.trim() || null,
      })
      .eq("id", profile.id);

    if (profileError) {
      setSaving(false);
      setProfileMessage(`Error: ${profileError.message}`);
      showToast("error", "No se pudo guardar el perfil.");
      return;
    }

    const { error: userError } = await supabase.auth.updateUser({
      data: {
        full_name: fullName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        phone: phone.trim() || null,
      },
    });

    setSaving(false);
    if (userError) {
      setProfileMessage(`Perfil guardado parcialmente: ${userError.message}`);
      showToast("error", "Se guardó parcialmente el perfil.");
      return;
    }

    setProfileMessage("Perfil actualizado correctamente.");
    showToast("success", "¡Cambios guardados con éxito!");
    pushNotification({
      id: `profile-action-save-${Date.now()}`,
      title: "Perfil actualizado",
      message: "Tus datos personales fueron actualizados correctamente.",
      time: "ahora",
      unread: true,
      kind: "system",
      actionLabel: "Ver perfil",
      actionHref: "/perfil",
    });
  };

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!currentPassword.trim()) {
      setPasswordMessage("Debes ingresar tu contraseña actual.");
      return;
    }

    if (!profile?.email) {
      setPasswordMessage("No se encontró el correo de la cuenta para validar seguridad.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage("Las contraseñas no coinciden.");
      return;
    }

    setUpdatingPassword(true);
    setPasswordMessage(null);

    const supabase = createClient();
    const { error: currentPasswordError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: currentPassword,
    });

    if (currentPasswordError) {
      setUpdatingPassword(false);
      setPasswordMessage("La contraseña actual no es correcta.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    setUpdatingPassword(false);
    if (error) {
      setPasswordMessage(`Error: ${error.message}`);
      return;
    }

    setPasswordMessage("Contraseña actualizada correctamente.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    pushNotification({
      id: `profile-action-password-${Date.now()}`,
      title: "Contraseña actualizada",
      message: "Se cambió la contraseña de tu cuenta correctamente.",
      time: "ahora",
      unread: true,
      kind: "security",
      actionLabel: "Revisar seguridad",
      actionHref: "/perfil#perfil-seguridad",
    });
  };

  const uploadAvatarFile = async (file: File) => {
    setUploadingAvatar(true);
    setProfileMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "");

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) {
        setProfileMessage("Falta NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME.");
        return;
      }

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        setProfileMessage("No se pudo subir la imagen.");
        return;
      }

      const data = (await response.json()) as { secure_url?: string };
      if (!data.secure_url) {
        setProfileMessage("Respuesta inválida al subir avatar.");
        return;
      }

      setAvatarUrl(data.secure_url);
      setProfileMessage("Avatar actualizado. Guarda cambios para confirmar.");
      pushNotification({
        id: `profile-action-avatar-${Date.now()}`,
        title: "Avatar cargado",
        message: "Tu nueva imagen está lista; guarda cambios para aplicarla al perfil.",
        time: "ahora",
        unread: true,
        kind: "system",
        actionLabel: "Ver perfil",
        actionHref: "/perfil",
      });
    } catch {
      setProfileMessage("Error al subir avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="space-y-8">
      {toast ? (
        <AppToast toast={toast} onClose={() => setToast(null)} />
      ) : null}

      <section className="bg-white dark:bg-[#0b1735] border border-slate-200 dark:border-[#1c2d52] rounded-2xl p-7">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-5">
            <div className="relative">
              <img
                src={avatarUrl || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200&h=200&fit=crop"}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 bg-primary text-white p-2 rounded-full"
                disabled={uploadingAvatar}
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void uploadAvatarFile(file);
                  }
                }}
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white break-words">{fullName || "Usuario"}</h2>
              </div>
              <p className="text-slate-700 dark:text-slate-300 text-base md:text-xl break-all">{profile?.email || "Sin correo"}</p>
              <p className="text-slate-500 dark:text-slate-400 italic">Miembro de FinancePro</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => document.getElementById("perfil-info")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="px-5 py-2.5 rounded-xl bg-primary text-white text-lg font-bold"
          >
            Guardar cambios
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <div className="w-full sm:w-auto">
            <LogoutButton />
          </div>
        </div>
      </section>

      <div className="bg-transparent overflow-x-auto">
        <nav className="h-14 px-2 border-b border-slate-300/60 dark:border-slate-700/40 flex items-end gap-5 md:gap-8 whitespace-nowrap min-w-max">
          <a href="#perfil-info" onClick={(event) => scrollToSection(event, "perfil-info")} className={navClass("info")}>Información</a>
          <a href="#perfil-seguridad" onClick={(event) => scrollToSection(event, "perfil-seguridad")} className={navClass("seguridad")}>Seguridad</a>
          <a href="#perfil-actividad" onClick={(event) => scrollToSection(event, "perfil-actividad")} className={navClass("actividad")}>Actividad</a>
        </nav>
      </div>

      <section id="perfil-info" className="scroll-mt-24 space-y-5">
        <div className="flex items-center gap-2">
          <IdCard className="w-6 h-6 text-primary" />
          <h3 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">Información Personal</h3>
        </div>
        <p className="text-lg text-slate-500 dark:text-slate-400">Gestiona tus datos personales y cómo aparece tu perfil.</p>
        <form onSubmit={saveProfile} className="bg-white dark:bg-[#0b1735] border border-slate-200 dark:border-[#1c2d52] rounded-2xl p-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-200">Nombre Completo</label>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-slate-300 dark:border-[#2a3e66] bg-white dark:bg-[#1e2b48] text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-200">Correo Electrónico</label>
              <input
                value={profile?.email || ""}
                disabled
                className="w-full px-4 py-3.5 rounded-xl border border-slate-300 dark:border-[#2a3e66] bg-slate-100 dark:bg-[#1e2b48] text-slate-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-200">Teléfono</label>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-slate-300 dark:border-[#2a3e66] bg-white dark:bg-[#1e2b48] text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-200">Rol</label>
              <input
                value={String(profile?.role || "user").toUpperCase()}
                disabled
                className="w-full px-4 py-3.5 rounded-xl border border-slate-300 dark:border-[#2a3e66] bg-slate-100 dark:bg-[#1e2b48] text-slate-700 dark:text-white"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            {profileMessage ? <p className="text-sm text-slate-600 dark:text-slate-300">{profileMessage}</p> : <span />}
            <button disabled={saving || uploadingAvatar} className="px-4 py-2 rounded-lg bg-primary text-white font-semibold disabled:opacity-50">
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </section>

      <section id="perfil-seguridad" className="scroll-mt-24 space-y-5">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <h3 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">Seguridad</h3>
        </div>
        <p className="text-lg text-slate-500 dark:text-slate-400">Actualiza tu contraseña y protege el acceso a tu cuenta.</p>
        <form onSubmit={updatePassword} className="bg-white dark:bg-[#0b1735] border border-slate-200 dark:border-[#1c2d52] rounded-2xl p-7 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-200">Contraseña actual</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border border-slate-300 dark:border-[#2a3e66] bg-white dark:bg-[#1e2b48] text-slate-900 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-200">Nueva contraseña</label>
            <input
              type="password"
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border border-slate-300 dark:border-[#2a3e66] bg-white dark:bg-[#1e2b48] text-slate-900 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-200">Confirmar contraseña</label>
            <input
              type="password"
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border border-slate-300 dark:border-[#2a3e66] bg-white dark:bg-[#1e2b48] text-slate-900 dark:text-white"
              required
            />
          </div>
          <div className="md:col-span-2 flex items-center justify-between">
            {passwordMessage ? <p className="text-sm text-slate-600 dark:text-slate-300">{passwordMessage}</p> : <span />}
            <button disabled={updatingPassword} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-[#2a3e66] text-slate-700 dark:text-white font-semibold disabled:opacity-50">
              {updatingPassword ? "Actualizando..." : "Actualizar contraseña"}
            </button>
          </div>
        </form>
      </section>

      <section id="perfil-actividad" className="scroll-mt-24 space-y-5">
        <div className="flex items-center gap-2">
          <BellRing className="w-6 h-6 text-primary" />
          <h3 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">Actividad</h3>
        </div>
        <p className="text-lg text-slate-500 dark:text-slate-400">Consulta los últimos movimientos registrados en tu cuenta.</p>
        <div className="bg-white dark:bg-[#0b1735] border border-slate-200 dark:border-[#1c2d52] rounded-2xl p-7 space-y-3">
          <p className="text-slate-600 dark:text-slate-300 text-sm">Actividad reciente en tu cuenta</p>
          {recentActivity.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-sm">Sin movimientos recientes.</p>
          ) : (
            <ul className="space-y-3">
              {recentActivity.map((item) => (
                <li key={item.id} className="rounded-xl border border-slate-200 dark:border-[#1f3157] bg-slate-50 dark:bg-[#101d3d] p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{item.merchant}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">{new Date(item.date).toLocaleDateString("es-CO")}</p>
                  </div>
                  <p className={`font-bold ${item.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>
                    {item.type === "income" ? "+" : "-"}${Math.round(Number(item.amount || 0)).toLocaleString("es-CO")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

    </div>
  );
}
