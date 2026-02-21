"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function PublicInfoLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [authResolved, setAuthResolved] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const resolveAuth = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAuthenticated(Boolean(user));
      setAuthResolved(true);
    };

    void resolveAuth();
  }, []);

  const linkClass = (href: string) =>
    `transition-colors ${
      pathname === href
        ? "text-primary font-semibold"
        : "text-slate-500 hover:text-primary"
    }`;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-5">
        <header className="flex flex-col items-center gap-3 text-center">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="bg-primary/10 p-2.5 rounded-xl">
              <svg
                className="w-7 h-7 text-primary"
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M24 4H6V17.3333V30.6667H24V44H42V30.6667V17.3333H24V4Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <span className="text-xl font-black tracking-tight group-hover:text-primary transition-colors">
              FinancePro
            </span>
          </Link>

          <h1 className="text-3xl font-black">{title}</h1>
          {subtitle ? <p className="text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
        </header>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 space-y-6">
          {children}
        </div>

        <footer className="pt-1 border-t border-slate-200 dark:border-slate-800">
          <nav className="flex flex-wrap items-center justify-center gap-4 text-sm">
            {authResolved && !isAuthenticated ? <Link href="/login" className={linkClass("/login")}>Login</Link> : null}
            <Link href="/terminos" className={linkClass("/terminos")}>Términos</Link>
            <Link href="/privacidad" className={linkClass("/privacidad")}>Privacidad</Link>
            <Link href="/soporte" className={linkClass("/soporte")}>Soporte</Link>
          </nav>
          <p className="mt-3 text-center text-[11px] text-slate-500">© 2026 FinancePro. Todos los derechos reservados.</p>
        </footer>
      </div>
    </main>
  );
}
