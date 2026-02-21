import PublicInfoLayout from "@/components/PublicInfoLayout";

export default function TerminosPage() {
  return (
    <PublicInfoLayout
      title="Términos de Servicio"
      subtitle="Última actualización: 20 de febrero de 2026"
    >

        <section className="space-y-2">
          <h2 className="text-xl font-bold">1. Uso de la plataforma</h2>
          <p className="text-slate-600 dark:text-slate-300">
            FinancePro está diseñado para ayudarte a gestionar presupuestos, transacciones, ahorros e inversiones personales.
            Al usar la plataforma, aceptas proporcionar información veraz y utilizarla únicamente con fines legales.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">2. Cuenta y seguridad</h2>
          <p className="text-slate-600 dark:text-slate-300">
            Eres responsable de mantener la confidencialidad de tu cuenta y contraseña. Si detectas actividad no autorizada,
            debes actualizar tus credenciales y contactar soporte de inmediato.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">3. Disponibilidad del servicio</h2>
          <p className="text-slate-600 dark:text-slate-300">
            Buscamos ofrecer continuidad del servicio, pero pueden existir mantenimientos, mejoras o interrupciones puntuales.
            Nos reservamos el derecho de actualizar funcionalidades para mejorar seguridad y rendimiento.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">4. Limitación de responsabilidad</h2>
          <p className="text-slate-600 dark:text-slate-300">
            FinancePro ofrece herramientas de organización financiera y no constituye asesoría financiera profesional.
            Las decisiones económicas del usuario son de su exclusiva responsabilidad.
          </p>
        </section>
    </PublicInfoLayout>
  );
}
