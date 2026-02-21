import PublicInfoLayout from "@/components/PublicInfoLayout";

export default function SoportePage() {
  return (
    <PublicInfoLayout
      title="Soporte"
      subtitle="Estamos aquí para ayudarte con cualquier duda sobre tu cuenta o el uso de FinancePro."
    >

        <section className="space-y-2">
          <h2 className="text-xl font-bold">Canales de atención</h2>
          <ul className="list-disc pl-5 text-slate-600 dark:text-slate-300 space-y-1">
            <li>Correo: soporte@financepro.app</li>
            <li>Horario: lunes a viernes, 9:00 a 18:00 (UTC-5)</li>
            <li>Tiempo de respuesta estimado: 24 a 48 horas hábiles</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">Problemas comunes</h2>
          <ul className="list-disc pl-5 text-slate-600 dark:text-slate-300 space-y-1">
            <li>No recibí correo de verificación: revisa spam y vuelve a enviar desde Login.</li>
            <li>Olvidé mi contraseña: usa la opción de restablecimiento en el formulario de acceso.</li>
            <li>Error al subir imágenes: verifica configuración de Cloudinary y tamaño del archivo.</li>
          </ul>
        </section>
    </PublicInfoLayout>
  );
}
