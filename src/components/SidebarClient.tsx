"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { roleLabel } from "@/utils/formatters";
import {
  Wallet,
  LayoutDashboard,
  Bell,
  ReceiptText,
  Landmark,
  PiggyBank,
  TrendingUp,
  FileText,
  LineChart,
  User,
  Settings,
  ShieldCheck,
  Shapes,
} from "lucide-react";
import NotificationCenter from "./NotificationCenter";
import MobileActionSheet from "./MobileActionSheet";
import LogoutButton from "./LogoutButton";

export type SidebarProfile = {
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  email: string | null;
};

export function SidebarClient({ initialProfile }: { initialProfile: SidebarProfile | null }) {
  const pathname = usePathname();
  const profile = initialProfile;
  const [isMobile, setIsMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const apply = () => {
      const mobile = mediaQuery.matches;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(true);
        return;
      }

      const savedCollapsed = window.localStorage.getItem("financepro.sidebar.collapsed") === "1";
      setCollapsed(savedCollapsed);
    };

    apply();
    mediaQuery.addEventListener("change", apply);
    return () => mediaQuery.removeEventListener("change", apply);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) return;
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem("financepro.sidebar.collapsed", next ? "1" : "0");
      return next;
    });
  };

  const navItems = [
    { href: "/panel", label: "Panel", icon: LayoutDashboard },
    { href: "/categorias", label: "Categorías", icon: Shapes },
    { href: "/transacciones", label: "Transacciones", icon: ReceiptText },
    { href: "/presupuestos", label: "Presupuestos", icon: Landmark },
    { href: "/ahorros", label: "Ahorros", icon: PiggyBank },
    { href: "/inversiones", label: "Inversiones", icon: LineChart },
    { href: "/informes", label: "Informes", icon: TrendingUp },
    { href: "/facturas", label: "Facturas", icon: FileText },
    { href: "/notificaciones", label: "Notificaciones", icon: Bell },
  ];

  const displayName =
    profile?.full_name?.trim() || profile?.email?.split("@")[0] || "Usuario";
  const displayRole = roleLabel(profile?.role);

  const linkClass = (href: string) => {
    const isActive = pathname === href;
    return `flex items-center ${collapsed ? "justify-center" : "gap-3"} px-3 py-1.5 md:py-2 rounded-lg transition-colors ${
      isActive
        ? "bg-primary/10 text-primary font-medium"
        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
    }`;
  };

  return (
    <>
      <NotificationCenter hideOnMobile />
      <MobileActionSheet profile={initialProfile} />

      <aside className={`hidden md:flex h-[100dvh] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-col shrink-0 transition-all duration-300 ${collapsed ? "w-24" : "w-64"}`}>
        <div className="p-4 md:p-6 flex items-center gap-3">
          <div className={`flex items-center justify-between w-full ${collapsed ? "gap-0" : "gap-3"}`}>
            <button
              type="button"
              onClick={toggleSidebar}
              disabled={isMobile}
              className={`flex items-center ${collapsed ? "justify-center w-full" : "gap-3 min-w-0"}`}
              title={collapsed ? "Expandir panel" : "Contraer panel"}
              aria-label={collapsed ? "Expandir panel" : "Contraer panel"}
            >
              <div className="bg-primary p-2 rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>

              {!collapsed ? (
                <div className="min-w-0 text-left">
                  <h1 className="font-bold text-lg tracking-tight truncate">FinancePro</h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    Patrimonio Personal
                  </p>
                </div>
              ) : null}
            </button>

              {/* Restore logout icon next to logo in desktop */}
              {!isMobile && !collapsed && (
                <div className="ml-auto">
                  <LogoutButton compact />
                </div>
              )}

          </div>
        </div>

        <nav className="flex-1 px-3 md:px-4 space-y-1 overflow-y-auto">
          {[
            ...navItems,
            ...(profile?.role === "admin" ? [{ href: "/roles", label: "Roles", icon: ShieldCheck }] : []),
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                <Icon className="w-5 h-5" />
                {!collapsed && !isMobile ? item.label : null}
              </Link>
            );
          })}
        </nav>

        <div className="p-2 md:p-4 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
          <Link href="/perfil" className={linkClass("/perfil") + " mb-2"}>
            <User className="w-5 h-5" />
            {!collapsed && !isMobile ? "Perfil" : null}
          </Link>
          <Link href="/configuracion" className={linkClass("/configuracion") + " mb-2"}>
            <Settings className="w-5 h-5" />
            {!collapsed && !isMobile ? "Configuración" : null}
          </Link>

          {!collapsed && !isMobile ? (
            <div className="mb-4">
              <ThemeToggle />
            </div>
          ) : (
            <div className="mb-2 md:mb-4 flex justify-center">
              <ThemeToggle compact />
            </div>
          )}

          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} p-1.5 md:p-2`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="User Profile"
              className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-200 object-cover"
              src={profile?.avatar_url || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200&h=200&fit=crop"}
            />
            {!collapsed && !isMobile ? (
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <p className="text-xs text-slate-500 truncate">{displayRole}</p>
              </div>
            ) : null}
          </div>
        </div>
      </aside>
    </>
  );
}
