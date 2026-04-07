import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User,
  Car,
  CreditCard,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Star,
  Zap,
  Check,
  Edit3,
} from 'lucide-react'

const USUARIO = {
  nombre: 'Carlos García',
  email: 'carlos.garcia@email.es',
  plan: 'Pro',
  vehiculo: {
    marca: 'Volkswagen',
    modelo: 'ID.4',
    año: 2023,
    bateria: 77,
    matricula: '1234-ABC',
  },
  tarjeta: {
    tipo: 'Visa',
    ultimos: '4892',
  },
}

const PLANES = [
  {
    id: 'basico',
    nombre: 'Básico',
    precio: '0 €/mes',
    features: ['Acceso a todas las redes', 'Pago por sesión', 'Historial básico'],
    color: '#6b7280',
  },
  {
    id: 'pro',
    nombre: 'Pro',
    precio: '4,99 €/mes',
    features: ['Todo lo de Básico', 'Tarifas preferentes', 'Soporte prioritario', 'Estadísticas avanzadas'],
    color: '#185FA5',
    recomendado: true,
  },
  {
    id: 'empresa',
    nombre: 'Empresa',
    precio: 'Personalizado',
    features: ['Todo lo de Pro', 'Flota multi-vehículo', 'Facturación centralizada', 'API acceso'],
    color: '#2D8A4E',
  },
]

function OpcionMenu({ icon: Icon, label, sublabel, onClick, peligro = false, badge }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3.5 px-0 text-left"
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          peligro ? 'bg-red-50' : 'bg-gray-100'
        }`}
      >
        <Icon size={18} className={peligro ? 'text-rojo' : 'text-gray-600'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${peligro ? 'text-rojo' : 'text-gray-900'}`}>{label}</p>
        {sublabel && <p className="text-xs text-gray-400 truncate">{sublabel}</p>}
      </div>
      {badge && (
        <span className="bg-azul text-white text-[10px] font-bold px-2 py-0.5 rounded-full mr-1">
          {badge}
        </span>
      )}
      <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
    </button>
  )
}

function SeccionMenu({ titulo, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-3">
      {titulo && (
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1">
          {titulo}
        </p>
      )}
      <div className="px-4 divide-y divide-gray-50">{children}</div>
    </div>
  )
}

export default function PerfilPage() {
  const navigate = useNavigate()
  const [mostrarPlanes, setMostrarPlanes] = useState(false)

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-5 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Perfil</h1>

        {/* Avatar y datos usuario */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-azul to-blue-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-azul/30">
              {USUARIO.nombre.charAt(0)}
            </div>
            <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full border border-gray-200 flex items-center justify-center shadow-sm">
              <Edit3 size={11} className="text-gray-500" />
            </button>
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-gray-900">{USUARIO.nombre}</h2>
            <p className="text-xs text-gray-500">{USUARIO.email}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="bg-azul/10 text-azul text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Star size={9} fill="#185FA5" />
                Plan {USUARIO.plan}
              </div>
            </div>
          </div>
        </div>

        {/* Stats rápidas */}
        <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100">
          {[
            { label: 'Sesiones', value: '4' },
            { label: 'kWh totales', value: '178.5' },
            { label: 'CO₂ evitado', value: '32.1 kg' },
          ].map(stat => (
            <div key={stat.label} className="flex-1 text-center">
              <p className="text-base font-bold text-gray-900">{stat.value}</p>
              <p className="text-[10px] text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-4 pb-24">
        {/* Vehículo */}
        <SeccionMenu titulo="Mi vehículo">
          <button className="w-full flex items-center gap-3 py-3.5 text-left">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Car size={18} className="text-azul" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {USUARIO.vehiculo.marca} {USUARIO.vehiculo.modelo}
              </p>
              <p className="text-xs text-gray-400">
                {USUARIO.vehiculo.año} · {USUARIO.vehiculo.matricula} · {USUARIO.vehiculo.bateria} kWh
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1">
                <Zap size={11} className="text-verde" />
                <span className="text-xs font-semibold text-verde">77 kWh</span>
              </div>
              <ChevronRight size={16} className="text-gray-300 mt-1 ml-auto" />
            </div>
          </button>
        </SeccionMenu>

        {/* Plan */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-3">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1">
            Mi plan
          </p>
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-azul rounded-full" />
                <p className="text-sm font-semibold text-gray-900">Plan {USUARIO.plan}</p>
              </div>
              <span className="text-sm font-bold text-azul">4,99 €/mes</span>
            </div>
            <button
              onClick={() => setMostrarPlanes(v => !v)}
              className="w-full text-xs font-medium text-azul bg-blue-50 py-2.5 rounded-xl"
            >
              {mostrarPlanes ? 'Ocultar planes' : 'Ver todos los planes'}
            </button>

            {mostrarPlanes && (
              <div className="mt-3 space-y-2">
                {PLANES.map(plan => (
                  <div
                    key={plan.id}
                    className={`rounded-xl border-2 p-3 ${
                      plan.id === 'pro' ? 'border-azul' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-gray-900">{plan.nombre}</p>
                        {plan.recomendado && (
                          <span className="text-[9px] bg-azul text-white font-bold px-1.5 py-0.5 rounded-full">
                            ACTUAL
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold" style={{ color: plan.color }}>
                        {plan.precio}
                      </p>
                    </div>
                    {plan.features.map(f => (
                      <div key={f} className="flex items-center gap-1.5 py-0.5">
                        <Check size={11} style={{ color: plan.color }} />
                        <p className="text-xs text-gray-600">{f}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cuenta */}
        <SeccionMenu titulo="Cuenta">
          <OpcionMenu
            icon={CreditCard}
            label="Método de pago"
            sublabel={`${USUARIO.tarjeta.tipo} ···· ${USUARIO.tarjeta.ultimos}`}
          />
          <OpcionMenu icon={Bell} label="Notificaciones" sublabel="Alertas de carga, precios" badge="3" />
          <OpcionMenu icon={Shield} label="Privacidad y seguridad" />
        </SeccionMenu>

        {/* Soporte */}
        <SeccionMenu titulo="Soporte">
          <OpcionMenu icon={HelpCircle} label="Ayuda y soporte" sublabel="FAQ, contacto" />
          <OpcionMenu icon={Star} label="Valorar la app" />
        </SeccionMenu>

        {/* Sesión */}
        <SeccionMenu>
          <OpcionMenu icon={LogOut} label="Cerrar sesión" peligro />
        </SeccionMenu>

        {/* Versión */}
        <p className="text-center text-xs text-gray-300 mt-2 pb-4">
          Carga v0.1.0 · Hecho con ⚡ en España
        </p>
      </div>
    </div>
  )
}
