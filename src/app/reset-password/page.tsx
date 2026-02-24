"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useSearchParams } from "next/navigation";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.toLowerCase();
    if (hash.includes("type=recovery") || hash.includes("type=invite")) {
      setRecoveryMode(true);
      setMessage("Ingresa tu nueva contraseña para completar la recuperación.");
      setError(null);
    }
  }, []);

  const handleSendRecovery = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!email) {
      setError("Ingresa tu correo para enviar el enlace de recuperación.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/reset-password`
            : undefined,
      });

      if (resetError) {
        const raw = resetError.message.toLowerCase();
        if (raw.includes("rate limit")) {
          setError("Límite de correos alcanzado. Espera unos minutos e intenta nuevamente.");
          return;
        }
        setError("No se pudo enviar el correo de recuperación.");
        return;
      }

      setMessage("Te enviamos un correo con el enlace para restablecer tu contraseña.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError("No se pudo actualizar la contraseña. Abre nuevamente el enlace de recuperación e intenta otra vez.");
        return;
      }

      setMessage("Contraseña actualizada correctamente. Ya puedes iniciar sesión.");
      setPassword("");
      setConfirmPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 pt-14 md:pt-0">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
        <h1 className="text-2xl font-bold mb-2">Restablecer contraseña</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {recoveryMode
            ? "Ingresa una nueva contraseña para completar la recuperación de tu cuenta."
            : "Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña."}
        </p>

        {recoveryMode ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nueva contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="********"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Confirmar contraseña</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="********"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error ? <p className="text-sm text-rose-500">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-500">{message}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Actualizando..." : "Guardar nueva contraseña"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSendRecovery} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Correo</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="tu@email.com"
              />
            </div>

            {error ? <p className="text-sm text-rose-500">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-500">{message}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Enviar enlace de recuperación"}
            </button>
          </form>
        )}

        <p className="mt-5 text-xs text-center text-slate-500">
          <Link href="/login" className="hover:text-primary transition-colors">Volver al login</Link>
        </p>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 pt-14 md:pt-0">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">Cargando...</p>
        </div>
      </main>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
