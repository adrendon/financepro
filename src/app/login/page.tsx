"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { pushNotification } from "@/utils/notifications";
import { useRouter } from "next/navigation";
import { Chrome, Eye, EyeOff, Github, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";

type AuthMode = "signup" | "signin";

function getAuthErrorMessage(rawMessage: string, mode: AuthMode): string {
  const message = rawMessage.toLowerCase();

  if (message.includes("email logins are disabled") || message.includes("email provider is disabled")) {
    return "El inicio de sesión por correo está deshabilitado en Supabase (Providers > Email).";
  }

  if (message.includes("invalid api key") || message.includes("jwt malformed") || message.includes("apikey")) {
    return "Las credenciales de Supabase en .env.local no coinciden con este proyecto.";
  }

  if (message.includes("user not found")) {
    return "No existe un usuario con ese correo en Auth.";
  }

  if (message.includes("email rate limit exceeded") || message.includes("rate limit")) {
    return "Límite de envío de correos alcanzado. Espera unos minutos e intenta de nuevo, o usa Login/OAuth si la cuenta ya existe.";
  }

  if (message.includes("email not confirmed")) {
    return "Tu email no está confirmado. Revisa tu bandeja o reenvía el correo de verificación.";
  }

  if (message.includes("invalid login credentials")) {
    return "Correo o contraseña inválidos.";
  }

  if (message.includes("user already registered") || message.includes("already registered")) {
    return "Este correo ya está registrado. Usa la pestaña Login para ingresar.";
  }

  if (message.includes("password should be at least") || message.includes("weak password")) {
    return "La contraseña no cumple los requisitos mínimos de seguridad.";
  }

  if (mode === "signup") {
    return "No se pudo crear la cuenta. Intenta nuevamente en unos minutos.";
  }

  if (process.env.NODE_ENV !== "production") {
    return `No se pudo iniciar sesión: ${rawMessage}`;
  }

  return "No se pudo iniciar sesión. Verifica tus datos e intenta nuevamente.";
}

export default function LoginPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signup");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const redirectTo = useMemo(() => {
    if (typeof window === "undefined") return "/panel";
    return new URLSearchParams(window.location.search).get("redirectTo") || "/panel";
  }, []);

  useEffect(() => {
    setMounted(true);

    if (typeof window === "undefined") return;
    const hash = window.location.hash.toLowerCase();
    if (hash.includes("type=recovery") || hash.includes("type=invite")) {
      setRecoveryMode(true);
      setMode("signin");
      setMessage("Define tu nueva contraseña para completar la recuperación.");
      setError(null);
    }
  }, []);

  const handleSignUp = async (supabase: ReturnType<typeof createClient>) => {
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (signUpError) {
      setError(getAuthErrorMessage(signUpError.message, "signup"));
      return;
    }

    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: fullName || null,
        email,
      });
    }

    setMessage("Cuenta creada. Si tienes confirmación por correo activa, revisa tu email.");

    if (data.session) {
      router.push(redirectTo);
      router.refresh();
    } else {
      setMode("signin");
    }
  };

  const handleSignIn = async (supabase: ReturnType<typeof createClient>) => {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      if (signInError.message.toLowerCase().includes("email not confirmed")) {
        setPendingVerification(true);
        setError(getAuthErrorMessage(signInError.message, "signin"));
        return;
      }
      setError(getAuthErrorMessage(signInError.message, "signin"));
      return;
    }

    pushNotification({
      id: `auth-login-${Date.now()}`,
      title: "Inicio de sesión exitoso",
      message: `Entraste con ${email}.`,
      time: "ahora",
      unread: true,
      kind: "security",
      actionLabel: "Ir al panel",
      actionHref: "/panel",
    });

    router.push(redirectTo);
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setPendingVerification(false);

    try {
      const supabase = createClient();
      if (recoveryMode) {
        if (password.length < 6) {
          setError("La nueva contraseña debe tener al menos 6 caracteres.");
          return;
        }

        if (password !== confirmPassword) {
          setError("Las contraseñas no coinciden.");
          return;
        }

        const { error: updateError } = await supabase.auth.updateUser({
          password,
        });

        if (updateError) {
          setError("No se pudo actualizar la contraseña. Abre nuevamente el enlace de recuperación e intenta otra vez.");
          return;
        }

        setRecoveryMode(false);
        setPassword("");
        setConfirmPassword("");
        setMessage("Contraseña actualizada correctamente. Ya puedes iniciar sesión.");
        return;
      }

      if (mode === "signup") {
        await handleSignUp(supabase);
      } else {
        await handleSignIn(supabase);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
            : undefined,
        ...(provider === "github"
          ? {
              queryParams: {
                scope: "read:user user:email",
              },
            }
          : {}),
      },
    });

    if (oauthError) {
      setError(getAuthErrorMessage(oauthError.message, "signin"));
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError("Ingresa tu correo para reenviar la verificación.");
      return;
    }

    setResending(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/login`
              : undefined,
        },
      });

      if (resendError) {
        setError(getAuthErrorMessage(resendError.message, "signin"));
        return;
      }

      setMessage("Correo de verificación reenviado. Revisa tu bandeja de entrada.");
    } finally {
      setResending(false);
    }
  };

  const goToResetPassword = () => {
    const queryEmail = email ? `?email=${encodeURIComponent(email)}` : "";
    router.push(`/reset-password${queryEmail}`);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-primary/10 p-3 rounded-xl mb-3">
            <svg className="w-8 h-8 text-primary" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M24 4H6V17.3333V30.6667H24V44H42V30.6667V17.3333H24V4Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">FinancePro</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestiona tu futuro financiero hoy</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
          <div className="mb-4 flex justify-end">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                aria-label="Modo claro"
                onClick={() => setTheme("light")}
                className={`p-1.5 rounded-full transition-colors ${
                  mounted && resolvedTheme === "light"
                    ? "bg-white text-primary shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Sun className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Modo oscuro"
                onClick={() => setTheme("dark")}
                className={`p-1.5 rounded-full transition-colors ${
                  mounted && resolvedTheme === "dark"
                    ? "bg-primary text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Moon className="w-4 h-4" />
              </button>
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {recoveryMode ? "Restablecer contraseña" : mode === "signup" ? "Crear cuenta" : "Iniciar sesión"}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            {recoveryMode
              ? "Ingresa una nueva contraseña para tu cuenta."
              : mode === "signup"
              ? "Regístrate para empezar a gestionar tus finanzas."
              : "Accede con tu cuenta para continuar."}
          </p>

          {!recoveryMode && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              type="button"
              onClick={() => handleOAuth("google")}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
            >
              <Chrome className="w-4 h-4" />
              Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuth("github")}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
            >
              <Github className="w-4 h-4" />
              GitHub
            </button>
          </div>
          )}

          {!recoveryMode && (
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white dark:bg-slate-900 text-slate-500">o continúa con email</span>
            </div>
          </div>
          )}

          {!recoveryMode && (
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 mb-6">
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "signup"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  : "text-slate-500"
              }`}
            >
              Registro
            </button>
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "signin"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  : "text-slate-500"
              }`}
            >
              Login
            </button>
          </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-sm font-medium mb-2">Nombre completo</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Tu nombre"
              />
            </div>
          )}

          {!recoveryMode && (
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
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Contraseña</label>
              {mode === "signin" ? (
                <button
                  type="button"
                  onClick={goToResetPassword}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              ) : null}
            </div>
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
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {(mode === "signup" || recoveryMode) && (
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
                  aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-accent-coral">{error}</p>}
          {message && <p className="text-sm text-accent-emerald">{message}</p>}

          {pendingVerification && mode === "signin" && (
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resending}
              className="w-full py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              {resending ? "Reenviando..." : "Reenviar correo de verificación"}
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading
              ? recoveryMode
                ? "Actualizando..."
                : mode === "signup"
                ? "Creando cuenta..."
                : "Ingresando..."
              : recoveryMode
                ? "Guardar nueva contraseña"
                : mode === "signup"
                ? "Crear cuenta"
                : "Ingresar"}
          </button>
          </form>
        </div>

        <div className="mt-6 flex justify-center gap-6 text-xs text-slate-500 font-medium">
          <Link href="/terminos" className="hover:text-primary transition-colors">Términos de servicio</Link>
          <Link href="/privacidad" className="hover:text-primary transition-colors">Política de privacidad</Link>
          <Link href="/soporte" className="hover:text-primary transition-colors">Soporte</Link>
        </div>
        <p className="mt-3 text-center text-[11px] text-slate-500">© 2026 FinancePro. Todos los derechos reservados.</p>
      </div>
    </main>
  );
}
