import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

const tabs = ['Política de Privacidad', 'Términos de Uso']

export default function LegalPage() {
  const [tab, setTab] = useState(0)
  const navigate = useNavigate()

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-safe pt-4 pb-3 border-b border-gray-100">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600"
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-base font-bold text-gray-900">Información legal</h1>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 mx-4 mt-4 mb-4">
        {tabs.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
              tab === i ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {tab === 0 ? <PoliticaPrivacidad /> : <TerminosUso />}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <h2 className="text-sm font-bold text-gray-900 mb-2">{title}</h2>
      <div className="text-sm text-gray-600 space-y-1">{children}</div>
    </div>
  )
}

function PoliticaPrivacidad() {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-5">Última actualización: abril 2026</p>

      <Section title="Responsable del tratamiento">
        <p>Ricardo [APELLIDO], con domicilio en La Línea de la Concepción, Cádiz.</p>
        <p>Contacto: <a href="mailto:hola@cargapp.es" className="text-azul">hola@cargapp.es</a></p>
      </Section>

      <Section title="Datos que recogemos">
        <ul className="list-disc list-inside space-y-1">
          <li>Dirección de email</li>
          <li>Historial de sesiones de carga</li>
          <li>Datos de pago (gestionados íntegramente por Stripe; CargApp no almacena datos de tarjeta)</li>
          <li>Ubicación GPS (únicamente durante el uso activo de la app)</li>
        </ul>
      </Section>

      <Section title="Finalidad">
        <p>Prestación del servicio de localización de puntos de carga para vehículos eléctricos y gestión de pagos asociados.</p>
      </Section>

      <Section title="Base legal">
        <p>Ejecución de contrato entre el usuario y CargApp, según el Art. 6.1.b del Reglamento General de Protección de Datos (RGPD).</p>
      </Section>

      <Section title="Terceros encargados del tratamiento">
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Stripe</strong> — procesamiento de pagos</li>
          <li><strong>Supabase</strong> — base de datos y autenticación</li>
          <li><strong>Google Maps</strong> — mapas y geolocalización</li>
        </ul>
        <p className="mt-2">No se ceden datos a terceros salvo los indicados anteriormente.</p>
      </Section>

      <Section title="Tus derechos">
        <p>Puedes ejercer tus derechos de acceso, rectificación, supresión y portabilidad escribiendo a <a href="mailto:hola@cargapp.es" className="text-azul">hola@cargapp.es</a>.</p>
      </Section>
    </div>
  )
}

function TerminosUso() {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-5">Última actualización: abril 2026</p>

      <Section title="¿Qué es CargApp?">
        <p>CargApp es una aplicación de localización y pago en puntos de carga para vehículos eléctricos en España. Permite al usuario encontrar cargadores disponibles, iniciar sesiones de carga y abonar el servicio desde el móvil.</p>
      </Section>

      <Section title="Comisión por transacción">
        <p>CargApp aplica una comisión de entre el <strong>5 % y el 8 %</strong> sobre el coste de cada sesión de carga. Este porcentaje se mostrará antes de confirmar el pago.</p>
      </Section>

      <Section title="Compatibilidad de conectores">
        <p>El usuario es responsable de verificar la compatibilidad de los conectores disponibles en cada punto de carga con su vehículo antes de iniciar una sesión.</p>
      </Section>

      <Section title="Precios">
        <p>Los precios mostrados en la app son estimaciones basadas en la información proporcionada por las redes de carga. El precio final de cada sesión lo determina la red operadora correspondiente.</p>
      </Section>

      <Section title="Edad mínima">
        <p>El uso de CargApp está restringido a personas mayores de <strong>18 años</strong>.</p>
      </Section>

      <Section title="Ley aplicable">
        <p>Estos términos se rigen por la legislación española. Cualquier controversia se someterá a los juzgados y tribunales competentes según la normativa vigente.</p>
      </Section>

      <Section title="Contacto">
        <p>Para cualquier consulta: <a href="mailto:hola@cargapp.es" className="text-azul">hola@cargapp.es</a></p>
      </Section>
    </div>
  )
}
