import Link from "next/link";

export default function AppFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-10 border-t border-slate-200/60 dark:border-slate-800/80 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500 dark:text-slate-400">
      <p className="text-sm">
        <span className="font-semibold text-primary">FinancePro</span> © {currentYear} Todos los derechos reservados.
      </p>
      <nav className="flex items-center gap-6 text-sm">
        <Link href="/terminos" className="hover:text-primary transition-colors">Términos</Link>
        <Link href="/privacidad" className="hover:text-primary transition-colors">Privacidad</Link>
        <Link href="/soporte" className="hover:text-primary transition-colors">Soporte</Link>
      </nav>
    </footer>
  );
}
