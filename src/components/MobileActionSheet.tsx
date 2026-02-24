"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bell,
  CreditCard,
  FileText,
  Landmark,
  LayoutDashboard,
  LineChart,
  Plus,
  ReceiptText,
  PiggyBank,
  Settings,
  Shapes,
  TrendingUp,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import NotificationCenter from "./NotificationCenter";

type MobileProfile = {
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
} | null;

const ACTIONS = [
  { href: "/categorias", label: "Categorías", icon: Shapes },
  { href: "/transacciones", label: "Nueva Transacción", icon: ReceiptText, primary: true },
  { href: "/facturas", label: "Añadir Factura", icon: FileText },
  { href: "/presupuestos", label: "Presupuestos", icon: Landmark },
  { href: "/inversiones", label: "Inversiones", icon: LineChart },
  { href: "/informes", label: "Informes", icon: TrendingUp },
  { href: "/notificaciones", label: "Notificaciones", icon: Bell },
];

const BOTTOM_NAV = [
  { href: "/panel", label: "Inicio", icon: LayoutDashboard },
  { href: "/transacciones", label: "Transacciones", icon: CreditCard },
  { href: "/ahorros", label: "Ahorros", icon: PiggyBank },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

export default function MobileActionSheet({ profile }: { profile: MobileProfile }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const displayName = profile?.full_name?.trim() || profile?.email?.split("@")[0] || "Usuario";
  const avatarSrc =
    profile?.avatar_url ||
    "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200&h=200&fit=crop";

  return (
    <div className="md:hidden">
      <header className="fixed top-0 inset-x-0 z-40 h-14 mb-14 border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm px-4 flex items-center justify-between">
        <Link href="/perfil" className="flex items-center gap-2 min-w-0" aria-label="Abrir perfil">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Avatar"
            className="w-8 h-8 rounded-full border border-slate-700 object-cover"
            src={avatarSrc}
          />
          <span className="font-bold text-white tracking-tight truncate">{displayName}</span>
        </Link>

        <div className="flex items-center gap-2">
          <NotificationCenter anchored={false} panelPositionClass="top-14 right-2" />
        </div>
      </header>

      <div className="pt-14" />
      <nav className="fixed bottom-0 inset-x-0 z-50 h-16 border-t border-slate-800 bg-slate-950 px-6 flex items-center justify-between">
        {BOTTOM_NAV.map((item, index) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const extraClass = index >= 2 ? "pl-10" : "pr-10";

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center min-w-[52px] ${extraClass}`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-slate-400"}`} />
              <span className={`text-[10px] mt-1 font-semibold ${isActive ? "text-primary" : "text-slate-400"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir acciones rápidas"
          className="absolute left-1/2 -translate-x-1/2 -top-6 w-16 h-16 rounded-full bg-primary text-white shadow-xl border-4 border-slate-950 flex items-center justify-center"
        >
          <Plus className="w-8 h-8" />
        </button>
      </nav>

      {open ? (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            aria-label="Cerrar acciones rápidas"
          />

          <div className="relative bg-slate-950 border-t border-slate-800 rounded-t-[2rem] p-8 pb-12 shadow-2xl animate-slide-up">
            <div className="w-12 h-1.5 bg-slate-600 rounded-full mx-auto mb-8" />

            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-white">Acciones Rápidas</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="bg-slate-800 p-2 rounded-full hover:bg-slate-700 transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-6 h-6 text-slate-200" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {ACTIONS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div
                      className={`w-16 h-16 flex items-center justify-center rounded-2xl transition-transform group-active:scale-95 ${
                        item.primary
                          ? "bg-primary/20 text-primary"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      <Icon className="w-8 h-8" />
                    </div>
                    <span className="text-xs text-center font-medium leading-tight text-slate-200">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
