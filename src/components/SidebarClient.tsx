"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import LogoutButton from "./LogoutButton";
import { roleLabel, tierLabel } from "@/utils/formatters";
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
  CreditCard,
} from "lucide-react";
import NotificationCenter from "./NotificationCenter";

export type SidebarProfile = {
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  subscription_tier: string | null;
  email: string | null;
};

export function SidebarClient({ initialProfile }: { initialProfile: SidebarProfile | null }) {
  const pathname = usePathname();
  const profile = initialProfile;
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("financepro.sidebar.collapsed") === "1";
  });

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem("financepro.sidebar.collapsed", next ? "1" : "0");
      return next;
    });
  };

  const navItems = [
    { href: "/", label: "Panel", icon: LayoutDashboard },
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
  const displayRole = `${roleLabel(profile?.role)} ${tierLabel(profile?.subscription_tier)}`;
  const isFreeUser = profile?.role !== "admin" && (profile?.subscription_tier ?? "free") === "free";
  const canManageSubscription =
    profile?.role === "admin" ||
    profile?.subscription_tier === "pro" ||
    profile?.subscription_tier === "premium";

  const visibleNavItems = navItems.filter((item) => {
    if (!isFreeUser) return true;
    return item.href !== "/transacciones" && item.href !== "/inversiones";
  });

  const linkClass = (href: string) => {
    const isActive = pathname === href;
    return `flex items-center ${collapsed ? "justify-center" : "gap-3"} px-3 py-2 rounded-lg transition-colors ${
      isActive
        ? "bg-primary/10 text-primary font-medium"
        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
    }`;
  };

  return (
    <>
      <NotificationCenter />

      <aside
        className={`h-screen border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0 transition-all duration-300 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="p-6 flex items-center gap-3">
          <div className={`flex items-center justify-between w-full ${collapsed ? "gap-0" : "gap-3"}`}>
            <button
              type="button"
              onClick={toggleSidebar}
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

            {!collapsed ? <LogoutButton compact /> : null}
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {[
            ...visibleNavItems,
            ...(profile?.role === "admin" ? [{ href: "/roles", label: "Roles", icon: ShieldCheck }] : []),
            ...(profile?.role === "admin"
              ? [{ href: "/admin/suscripciones", label: "Suscripciones", icon: CreditCard }]
              : []),
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                <Icon className="w-5 h-5" />
                {!collapsed ? item.label : null}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
          <Link href="/perfil" className={linkClass("/perfil") + " mb-2"}>
            <User className="w-5 h-5" />
            {!collapsed ? "Perfil" : null}
          </Link>
          <Link href="/configuracion" className={linkClass("/configuracion") + " mb-2"}>
            <Settings className="w-5 h-5" />
            {!collapsed ? "Configuración" : null}
          </Link>
          {canManageSubscription ? (
            <Link href="/suscripcion" className={linkClass("/suscripcion") + " mb-2"}>
              <CreditCard className="w-5 h-5" />
              {!collapsed ? "Suscripción" : null}
            </Link>
          ) : null}

          {!collapsed ? (
            <div className="mb-4">
              <ThemeToggle />
            </div>
          ) : (
            <div className="mb-4 flex justify-center">
              <ThemeToggle compact />
            </div>
          )}

          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} p-2`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="User Profile"
              className="w-10 h-10 rounded-full bg-slate-200 object-cover"
              src={profile?.avatar_url || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200&h=200&fit=crop"}
            />
            {!collapsed ? (
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
