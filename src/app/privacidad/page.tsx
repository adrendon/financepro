import PublicInfoLayout from "@/components/PublicInfoLayout";

export default function PrivacidadPage() {
  return (
    <PublicInfoLayout
      title="Política de Privacidad"
      subtitle="Última actualización: 20 de febrero de 2026"
    >

        <section className="space-y-2">
          <h2 className="text-xl font-bold">1. Datos que recopilamos</h2>
          <p className="text-slate-600 dark:text-slate-300">
            Recopilamos datos de registro (correo, nombre) y datos financieros que tú ingresas (transacciones, metas, presupuestos)
            para habilitar las funciones principales de la plataforma.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">2. Uso de la información</h2>
          <p className="text-slate-600 dark:text-slate-300">
            Utilizamos la información para operar tu cuenta, personalizar reportes y mejorar el producto. No vendemos información
            personal a terceros.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">3. Seguridad</h2>
          <p className="text-slate-600 dark:text-slate-300">
            Aplicamos controles de acceso y mecanismos de autenticación para proteger tus datos. También recomendamos mantener
            contraseñas seguras y únicas para tu cuenta.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">4. Derechos del usuario</h2>
          <p className="text-slate-600 dark:text-slate-300">
            Puedes solicitar actualización o eliminación de datos de perfil y gestionar tus preferencias desde la aplicación.
          </p>
        </section>
    </PublicInfoLayout>
  );
}
