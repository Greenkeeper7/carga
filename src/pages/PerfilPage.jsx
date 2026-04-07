import { useState } from 'react'
import {
  Car,
  CreditCard,
  LogOut,
  ChevronRight,
  Zap,
  Check,
  Plug,
  MapPin,
  AlertCircle,
  Sparkles,
  BarChart3,
  Clock,
  Euro,
  Leaf,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Datos
// ---------------------------------------------------------------------------
const USUARIO = {
  nombre: 'Carlos García',
  email: 'carlos.garcia@email.es',
  plan: 'gratuito', // 'gratuito' | 'premium'
  miembro: 'Enero 2025',
  vehiculo: {
    marca: 'Volkswagen',
    modelo: 'ID.4 Pro',
    año: 2023,
    autonomia: 520,
    bateria: 77,
    conector: 'CCS2',
    matricula: '4821 KLM',
  },
  tarjeta: {
    tipo: 'Visa',
    ultimos: '4892',
    caducidad: '09/27',
  },
}

// Estadísticas (en un proyecto real vendrían de Supabase)
const STATS = {
  totalCargas: 10,
  totalKwh: 355.8,
  gastoTotal: 104.71,
  minutosTotal: 528,
}

const VENTAJAS_PREMIUM = [
  'Tarifas exclusivas hasta un 15% más baratas',
  'Reserva de punto de carga con antelación',
  'Soporte prioritario 24 h',
  'Estadísticas avanzadas y exportación de datos',
  'Facturación mensual unificada',
  'Sin comisión por sesión',
]

const VENTAJAS_GRATIS = [
  'Acceso a más de 8.000 puntos de carga',
  'Pago unificado en todas las redes',
  'Historial de cargas y facturas',
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function iniciales(nombre) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase()
}

function formatMinutos(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}` : `${m}m`
}

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------
function Seccion({ titulo, children }) {
  return (
    <div className="mb-3">
      {titulo && (
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1.5">
          {titulo}
        </p>
      )}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function Fila({ icon: Icon, iconBg = 'bg-gray-100', iconColor = 'text-gray-500', label, sublabel, right, onClick, peligro = false }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0 text-left ${onClick ? 'hover:bg-gray-50 active:bg-gray-100 transition-colors' : ''}`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${peligro ? 'bg-red-50' : iconBg}`}>
        <Icon size={17} className={peligro ? 'text-rojo' : iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug ${peligro ? 'text-rojo' : 'text-gray-900'}`}>{label}</p>
        {sublabel && <p className="text-xs text-gray-400 leading-snug mt-0.5">{sublabel}</p>}
      </div>
      {right ?? (onClick && <ChevronRight size={15} className="text-gray-300 flex-shrink-0" />)}
    </Tag>
  )
}

function StatCard({ icon: Icon, color, label, value }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col gap-2">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
        <Icon size={15} style={{ color }} />
      </div>
      <p className="text-lg font-bold text-gray-900 leading-none">{value}</p>
      <p className="text-[10px] text-gray-400 leading-snug">{label}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Modal de upgrade
// ---------------------------------------------------------------------------
function ModalPremium({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md rounded-t-3xl px-5 pt-6 pb-10 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Tirón */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        {/* Cabecera */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 bg-gradient-to-br from-azul to-blue-400 rounded-2xl flex items-center justify-center shadow-lg shadow-azul/30">
            <Sparkles size={22} color="white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Carga Premium</h2>
            <p className="text-sm text-gray-500">Solo <span className="font-bold text-azul">4,99 €/mes</span></p>
          </div>
        </div>

        {/* Ventajas */}
        <div className="space-y-2.5 mb-6">
          {VENTAJAS_PREMIUM.map(v => (
            <div key={v} className="flex items-start gap-2.5">
              <div className="w-5 h-5 bg-verde/15 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check size={11} className="text-verde" />
              </div>
              <p className="text-sm text-gray-700">{v}</p>
            </div>
          ))}
        </div>

        <button className="w-full bg-azul text-white font-bold py-4 rounded-2xl shadow-lg shadow-azul/30 active:scale-95 transition-transform text-base">
          Activar Premium — 4,99 €/mes
        </button>
        <button onClick={onClose} className="w-full mt-2 py-3 text-sm text-gray-400 font-medium">
          Ahora no
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------
export default function PerfilPage() {
  const [modalPremium, setModalPremium] = useState(false)
  const [cerrarSesionConfirm, setCerrarSesionConfirm] = useState(false)

  const esPremium = USUARIO.plan === 'premium'

  return (
    <>
      <div className="h-full flex flex-col overflow-hidden bg-gray-50">
        {/* ── Header con avatar ── */}
        <div className="bg-white px-4 pt-12 pb-5 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 bg-gradient-to-br from-azul to-blue-400 rounded-2xl flex items-center justify-center shadow-lg shadow-azul/25">
                <span className="text-white text-xl font-bold tracking-tight">{iniciales(USUARIO.nombre)}</span>
              </div>
              {esPremium && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-amarillo rounded-full flex items-center justify-center shadow">
                  <Sparkles size={10} color="white" />
                </div>
              )}
            </div>

            {/* Datos */}
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-gray-900 text-base truncate">{USUARIO.nombre}</h2>
              <p className="text-xs text-gray-500 truncate">{USUARIO.email}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                {esPremium ? (
                  <span className="inline-flex items-center gap-1 bg-azul text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    <Sparkles size={8} />
                    Premium
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    Plan gratuito
                  </span>
                )}
                <span className="text-[10px] text-gray-400">· Desde {USUARIO.miembro}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Contenido scrollable ── */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-4 pb-24 space-y-0">

          {/* ── Estadísticas ── */}
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1.5">
            Mis estadísticas
          </p>
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <StatCard icon={Zap} color="#185FA5" label="Cargas realizadas" value={STATS.totalCargas} />
            <StatCard icon={BarChart3} color="#2D8A4E" label="kWh totales cargados" value={`${STATS.totalKwh.toFixed(1)} kWh`} />
            <StatCard icon={Leaf} color="#2D8A4E" label="CO₂ evitado" value={`${(STATS.totalKwh * 0.18).toFixed(1)} kg`} />
            <StatCard icon={Euro} color="#E8B84B" label="Gasto total" value={`${STATS.gastoTotal.toFixed(2)} €`} />
          </div>

          {/* ── Mi vehículo ── */}
          <Seccion titulo="Mi vehículo">
            <div className="px-4 py-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Car size={20} className="text-azul" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm">
                    {USUARIO.vehiculo.marca} {USUARIO.vehiculo.modelo}
                  </p>
                  <p className="text-xs text-gray-500">{USUARIO.vehiculo.año} · {USUARIO.vehiculo.matricula}</p>
                </div>
                <button className="text-xs text-azul font-semibold bg-blue-50 px-3 py-1.5 rounded-lg flex-shrink-0">
                  Editar
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Zap, label: 'Batería', value: `${USUARIO.vehiculo.bateria} kWh`, color: '#2D8A4E' },
                  { icon: MapPin, label: 'Autonomía', value: `${USUARIO.vehiculo.autonomia} km`, color: '#185FA5' },
                  { icon: Plug, label: 'Conector', value: USUARIO.vehiculo.conector, color: '#185FA5' },
                ].map(d => (
                  <div key={d.label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <d.icon size={14} style={{ color: d.color }} className="mx-auto mb-1" />
                    <p className="text-xs font-bold text-gray-900">{d.value}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">{d.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Seccion>

          {/* ── Método de pago ── */}
          <Seccion titulo="Método de pago">
            <Fila
              icon={CreditCard}
              iconBg="bg-blue-50"
              iconColor="text-azul"
              label={`${USUARIO.tarjeta.tipo} ···· ${USUARIO.tarjeta.ultimos}`}
              sublabel={`Caduca ${USUARIO.tarjeta.caducidad}`}
              right={
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-verde bg-green-50 px-2 py-0.5 rounded-full">Activa</span>
                  <ChevronRight size={15} className="text-gray-300" />
                </div>
              }
              onClick={() => {}}
            />
            <Fila
              icon={CreditCard}
              iconBg="bg-gray-100"
              iconColor="text-gray-400"
              label="Añadir método de pago"
              sublabel="Tarjeta, SEPA, Apple Pay…"
              onClick={() => {}}
            />
          </Seccion>

          {/* ── Plan ── */}
          <Seccion titulo="Mi plan">
            {esPremium ? (
              <div className="px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={15} className="text-azul" />
                    <p className="font-bold text-gray-900 text-sm">Carga Premium</p>
                  </div>
                  <span className="text-sm font-bold text-azul">4,99 €/mes</span>
                </div>
                {VENTAJAS_PREMIUM.slice(0, 3).map(v => (
                  <div key={v} className="flex items-center gap-2 py-1">
                    <Check size={12} className="text-verde flex-shrink-0" />
                    <p className="text-xs text-gray-600">{v}</p>
                  </div>
                ))}
                <button className="mt-3 w-full text-xs font-medium text-rojo bg-red-50 py-2.5 rounded-xl">
                  Cancelar suscripción
                </button>
              </div>
            ) : (
              <div className="px-4 py-4">
                {/* Plan actual */}
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Plan actual — Gratuito</p>
                  {VENTAJAS_GRATIS.map(v => (
                    <div key={v} className="flex items-center gap-2 py-1">
                      <Check size={12} className="text-gray-400 flex-shrink-0" />
                      <p className="text-xs text-gray-500">{v}</p>
                    </div>
                  ))}
                </div>

                {/* CTA Premium */}
                <div className="bg-gradient-to-br from-azul to-blue-500 rounded-2xl p-4 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} />
                    <p className="text-sm font-bold">Pásate a Premium</p>
                    <span className="ml-auto text-xs font-bold opacity-90">4,99 €/mes</span>
                  </div>
                  <p className="text-xs opacity-80 mb-3">
                    Tarifas exclusivas, reservas y soporte 24 h — cancela cuando quieras.
                  </p>
                  <div className="space-y-1.5 mb-4">
                    {VENTAJAS_PREMIUM.slice(0, 3).map(v => (
                      <div key={v} className="flex items-center gap-1.5">
                        <Check size={11} className="opacity-90 flex-shrink-0" />
                        <p className="text-xs opacity-90">{v}</p>
                      </div>
                    ))}
                    <p className="text-xs opacity-60 pl-4">+ {VENTAJAS_PREMIUM.length - 3} ventajas más…</p>
                  </div>
                  <button
                    onClick={() => setModalPremium(true)}
                    className="w-full bg-white text-azul font-bold text-sm py-3 rounded-xl active:scale-95 transition-transform shadow"
                  >
                    Ver plan Premium →
                  </button>
                </div>
              </div>
            )}
          </Seccion>

          {/* ── Cerrar sesión ── */}
          <Seccion>
            {cerrarSesionConfirm ? (
              <div className="px-4 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={15} className="text-rojo flex-shrink-0" />
                  <p className="text-sm text-gray-700">¿Seguro que quieres cerrar sesión?</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCerrarSesionConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold"
                  >
                    Cancelar
                  </button>
                  <button className="flex-1 py-2.5 rounded-xl bg-rojo text-white text-sm font-bold shadow shadow-rojo/30">
                    Cerrar sesión
                  </button>
                </div>
              </div>
            ) : (
              <Fila
                icon={LogOut}
                label="Cerrar sesión"
                peligro
                onClick={() => setCerrarSesionConfirm(true)}
              />
            )}
          </Seccion>

          <p className="text-center text-[11px] text-gray-300 py-3">
            Carga v0.1.0 · Hecho con ⚡ en España
          </p>
        </div>
      </div>

      {modalPremium && <ModalPremium onClose={() => setModalPremium(false)} />}
    </>
  )
}
