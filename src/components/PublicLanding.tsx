"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CircleCheck,
  Cloud,
  Globe,
  Lock,
  Mail,
  MonitorCog,
  Moon,
  Radar,
  Shield,
  Share2,
  Wallet,
  Zap,
} from "lucide-react";

const SECTION_LINKS = [
  { id: "inicio", label: "Inicio", mobileLabel: "Inicio" },
  { id: "caracteristicas", label: "Características", mobileLabel: "Funciones" },
  { id: "comparativa", label: "Excel vs App", mobileLabel: "Excel/App" },
  { id: "testimonios", label: "Testimonios", mobileLabel: "Opiniones" },
];

export default function PublicLanding() {
  const { resolvedTheme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState("inicio");

  const scrollToSection = (event: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    event.preventDefault();
    const section = document.getElementById(sectionId);
    if (!section) return;

    const header = document.querySelector("header");
    const headerOffset = header instanceof HTMLElement ? header.offsetHeight + 8 : 80;
    const top = section.getBoundingClientRect().top + window.scrollY - headerOffset;

    setActiveSection(sectionId);
    window.scrollTo({ top, behavior: "smooth" });
    window.history.replaceState(null, "", `#${sectionId}`);
  };

  useEffect(() => {
    const ids = SECTION_LINKS.map((item) => item.id);
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => Boolean(node));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target?.id) {
          setActiveSection(visible.target.id);
        }
      },
      {
        rootMargin: "-40% 0px -45% 0px",
        threshold: [0.2, 0.5, 0.8],
      }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background-light dark:bg-[#111621] text-slate-900 dark:text-slate-100 selection:bg-primary selection:text-white antialiased">
      <header className="fixed top-0 z-50 w-full border-b border-slate-200 dark:border-white/10 bg-background-light/90 dark:bg-[#111621cc] backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="Ir al inicio">
              <Wallet className="text-primary w-8 h-8" />
              <span className="text-xl font-bold tracking-tight">FinancePro</span>
            </Link>

            <nav className="hidden md:flex flex-1 min-w-0 items-center justify-center gap-2">
              {SECTION_LINKS.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(event) => scrollToSection(event, item.id)}
                    className={`relative px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 shrink-0 ${
                      isActive
                        ? "bg-primary/20 text-primary shadow-[0_0_0_1px_rgba(20,75,184,0.35)]"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5"
                    }`}
                  >
                    {item.label}
                    <span
                      className={`absolute -bottom-0.5 left-1/2 h-0.5 bg-primary rounded-full transition-all duration-300 ${
                        isActive ? "w-6 -translate-x-1/2 opacity-100" : "w-0 -translate-x-1/2 opacity-0"
                      }`}
                    />
                  </a>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                aria-label="Cambiar tema"
              >
                <Moon className="w-4 h-4" />
              </button>
              <Link href="/login" className="bg-primary hover:bg-primary/90 text-white px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap">
                <span className="md:hidden">Entrar</span>
                <span className="hidden md:inline">Empezar Ahora</span>
              </Link>
            </div>

          </div>

          <nav className="md:hidden pb-2 grid grid-cols-2 gap-1.5">
            {SECTION_LINKS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(event) => scrollToSection(event, item.id)}
                  className={`text-center px-2.5 py-1.5 rounded-lg text-[11px] font-semibold leading-tight transition-all duration-300 ${
                    isActive
                      ? "bg-primary/20 text-primary shadow-[0_0_0_1px_rgba(20,75,184,0.35)]"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5"
                  }`}
                >
                  {item.mobileLabel ?? item.label}
                </a>
              );
            })}
          </nav>
        </div>
      </header>

      <main>
        <section id="inicio" className="relative pt-24 md:pt-28 pb-20 overflow-hidden bg-[radial-gradient(circle_at_top_center,rgba(20,75,184,0.15)_0%,transparent_70%)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              TOTALMENTE GRATIS PARA SIEMPRE
            </div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-[1.1]">
              Adiós Excel, <br />
              <span className="text-primary">Hola Libertad Financiera</span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
              La herramienta definitiva para automatizar tus finanzas personales sin fórmulas complicadas ni errores manuales. Toma el control total de tu dinero hoy mismo.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link href="/login" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-xl text-lg font-bold transition-all inline-flex items-center justify-center gap-2">
                Empezar Ahora - Es Gratis
                <ArrowRight className="w-5 h-5" />
              </Link>
              <p className="text-sm text-slate-500 dark:text-slate-500 flex items-center gap-2">
                <CircleCheck className="w-4 h-4 text-green-500" />
                No requiere tarjeta de crédito
              </p>
            </div>
          </div>
        </section>

        <div className="py-10 border-y border-slate-200 dark:border-white/5 bg-background-light dark:bg-[#111621]/50">
          <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all">
            <div className="flex items-center gap-2 font-bold text-xl"><Shield className="w-5 h-5" /> Seguridad Bancaria</div>
            <div className="flex items-center gap-2 font-bold text-xl"><Radar className="w-5 h-5" /> Cifrado AES-256</div>
            <div className="flex items-center gap-2 font-bold text-xl"><Cloud className="w-5 h-5" /> 100% Cloud Sync</div>
          </div>
        </div>

        <section id="caracteristicas" className="py-24 bg-background-light dark:bg-[#111621]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Todo lo que necesitas para dominar tu dinero</h2>
              <p className="text-slate-600 dark:text-slate-400">Funciones diseñadas para ahorrarte horas de trabajo manual.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <article className="p-8 bg-white dark:bg-slate-custom/30 rounded-2xl border border-slate-200 dark:border-white/5 transition-all hover:border-primary hover:shadow-[0_0_20px_rgba(20,75,184,0.1)]">
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center text-primary mb-6">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold mb-3">Presupuestos Automáticos</h3>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">Tus gastos se categorizan solos mediante IA. Olvídate de anotar cada café o ticket del súper.</p>
              </article>

              <article className="p-8 bg-white dark:bg-slate-custom/30 rounded-2xl border border-slate-200 dark:border-white/5 transition-all hover:border-primary hover:shadow-[0_0_20px_rgba(20,75,184,0.1)]">
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center text-primary mb-6">
                  <MonitorCog className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold mb-3">Seguimiento de Inversiones</h3>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">Visualiza tu patrimonio neto y el rendimiento de tus activos (cripto, bolsa, real estate) en tiempo real.</p>
              </article>

              <article className="p-8 bg-white dark:bg-slate-custom/30 rounded-2xl border border-slate-200 dark:border-white/5 transition-all hover:border-primary hover:shadow-[0_0_20px_rgba(20,75,184,0.1)]">
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center text-primary mb-6">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold mb-3">Control de Facturas</h3>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">Recordatorios inteligentes para servicios y facturas. Nunca más pagues un recargo por olvido.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="comparativa" className="py-24 bg-slate-100 dark:bg-slate-custom/10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white dark:bg-slate-custom/40 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-8 text-center border-b border-slate-200 dark:border-white/5">
                <h2 className="text-3xl font-bold">¿Por qué cambiar el Excel?</h2>
              </div>

              <div className="grid grid-cols-2">
                <div className="p-8 border-r border-slate-200 dark:border-white/5">
                  <h4 className="text-red-400 font-bold mb-6 flex items-center gap-2">
                    <Check className="w-4 h-4 rotate-45" /> Excel / Manual
                  </h4>
                  <ul className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                    <li className="flex items-start gap-2">Actualización manual lenta</li>
                    <li className="flex items-start gap-2">Fórmulas que se rompen</li>
                    <li className="flex items-start gap-2">Difícil de leer en móvil</li>
                    <li className="flex items-start gap-2">Sin alertas de vencimiento</li>
                    <li className="flex items-start gap-2">Gráficos estáticos</li>
                  </ul>
                </div>

                <div className="p-8 bg-primary/5">
                  <h4 className="text-primary font-bold mb-6 flex items-center gap-2">
                    <Check className="w-4 h-4" /> FinancePro
                  </h4>
                  <ul className="space-y-4 text-sm">
                    <li className="flex items-start gap-2 font-medium">Sincronización automática</li>
                    <li className="flex items-start gap-2 font-medium">Algoritmos inteligentes</li>
                    <li className="flex items-start gap-2 font-medium">App nativa multiplataforma</li>
                    <li className="flex items-start gap-2 font-medium">Notificaciones push</li>
                    <li className="flex items-start gap-2 font-medium">Insights con IA</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="testimonios" className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-16">Amado por +10,000 ahorradores</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <article className="p-6 bg-white dark:bg-slate-custom/20 rounded-xl border border-slate-200 dark:border-white/5 italic text-slate-600 dark:text-slate-200">
                &ldquo;Pasaba 3 horas al mes actualizando mi Excel. Con FinancePro ahora solo reviso el dashboard 5 minutos a la semana. ¡Increíble!&rdquo;
                <div className="mt-6 text-sm not-italic">
                  <p className="font-bold text-slate-900 dark:text-white">Carlos Ruiz</p>
                  <p className="text-xs text-slate-500">Inversor Particular</p>
                </div>
              </article>
              <article className="p-6 bg-white dark:bg-slate-custom/20 rounded-xl border border-slate-200 dark:border-white/5 italic text-slate-600 dark:text-slate-200">
                &ldquo;Por fin entiendo a dónde se va mi dinero. Los presupuestos automáticos me ayudaron a ahorrar un 20% más este trimestre.&rdquo;
                <div className="mt-6 text-sm not-italic">
                  <p className="font-bold text-slate-900 dark:text-white">Elena Martínez</p>
                  <p className="text-xs text-slate-500">Freelance Designer</p>
                </div>
              </article>
              <article className="p-6 bg-white dark:bg-slate-custom/20 rounded-xl border border-slate-200 dark:border-white/5 italic text-slate-600 dark:text-slate-200">
                &ldquo;La gestión de inversiones es de otro nivel. Puedo ver mi portfolio de acciones y mi cuenta corriente en un solo lugar.&rdquo;
                <div className="mt-6 text-sm not-italic">
                  <p className="font-bold text-slate-900 dark:text-white">Miguel Ángel S.</p>
                  <p className="text-xs text-slate-500">Analista de Datos</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-primary rounded-3xl p-10 md:p-16 text-center text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-black/20 rounded-full blur-3xl" />
              <h2 className="text-4xl md:text-5xl font-black mb-6 relative z-10">Tu nueva vida financiera empieza aquí</h2>
              <p className="text-xl mb-10 text-white/80 relative z-10">Únete a miles de personas que ya han dejado atrás las hojas de cálculo.</p>
              <div className="relative z-10 flex flex-col items-center gap-4">
                <Link href="/login" className="bg-white text-primary px-10 py-4 rounded-xl text-xl font-bold hover:bg-slate-100 transition-all shadow-xl">
                  Empezar Ahora Gratis
                </Link>
                <p className="text-sm text-white/60">Sin compromiso. Sin tarjeta. Totalmente gratis.</p>
              </div>
            </div>
          </div>
        </section>

        <footer className="bg-slate-100 dark:bg-slate-custom/20 border-t border-slate-200 dark:border-white/5 py-12 pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-4 gap-12 mb-12">
              <div className="col-span-2">
                <div className="flex items-center gap-2 mb-6">
                  <Wallet className="text-primary w-8 h-8" />
                  <span className="text-2xl font-bold tracking-tight">FinancePro</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 max-w-sm mb-6">Simplificando la gestión financiera para la nueva generación de ahorradores e inversores. Hecho con ❤️ para tu bolsillo.</p>
                <div className="flex gap-4">
                  <a className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-custom flex items-center justify-center hover:bg-primary hover:text-white transition-colors" href="#" aria-label="Compartir">
                    <Share2 className="w-4 h-4" />
                  </a>
                  <a className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-custom flex items-center justify-center hover:bg-primary hover:text-white transition-colors" href="#" aria-label="Sitio web">
                    <Globe className="w-4 h-4" />
                  </a>
                  <a className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-custom flex items-center justify-center hover:bg-primary hover:text-white transition-colors" href="#" aria-label="Correo">
                    <Mail className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div>
                <h5 className="font-bold mb-6">Producto</h5>
                <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  <li><a className="hover:text-primary transition-colors" href="#caracteristicas">Características</a></li>
                  <li><a className="hover:text-primary transition-colors" href="#">Seguridad</a></li>
                  <li><a className="hover:text-primary transition-colors" href="#">App Móvil</a></li>
                  <li><a className="hover:text-primary transition-colors" href="#">API para desarrolladores</a></li>
                </ul>
              </div>

              <div>
                <h5 className="font-bold mb-6">Legal</h5>
                <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  <li><Link className="hover:text-primary transition-colors" href="/privacidad">Privacidad</Link></li>
                  <li><Link className="hover:text-primary transition-colors" href="/terminos">Términos de Uso</Link></li>
                  <li><a className="hover:text-primary transition-colors" href="#">Cookies</a></li>
                  <li><Link className="hover:text-primary transition-colors" href="/soporte">Soporte</Link></li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
              <p>© 2026 FinancePro Inc. Todos los derechos reservados.</p>
              <div className="flex gap-6">
                <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Español (ES)</span>
                <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Conexión Segura SSL</span>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
