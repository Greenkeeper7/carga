import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Zap, MapPin, Clock, Euro, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getStripe } from '../lib/stripe'

const CARGADOR_FALLBACK = {
  nombre: 'Punto de carga',
  direccion: '',
  conector: '—',
  precio: null,
  potenciaMax: 50,
}

const BATERIA_INICIO = 22
const BATERIA_FIN = 80

function CircularProgress({ porcentaje, potenciaActual }) {
  const radio = 80
  const circunferencia = 2 * Math.PI * radio
  const offset = circunferencia - (porcentaje / 100) * circunferencia

  const colorBateria =
    porcentaje < 20 ? '#C0392B' : porcentaje < 50 ? '#E8B84B' : '#2D8A4E'

  return (
    <div className="relative w-52 h-52 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200">
        {/* Track */}
        <circle
          cx="100"
          cy="100"
          r={radio}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="12"
        />
        {/* Progress */}
        <circle
          cx="100"
          cy="100"
          r={radio}
          fill="none"
          stroke={colorBateria}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease' }}
        />
      </svg>
      <div className="text-center z-10">
        <p className="text-5xl font-bold" style={{ color: colorBateria }}>
          {porcentaje}
          <span className="text-2xl font-medium">%</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">batería</p>
        <div className="flex items-center justify-center gap-1 mt-2">
          <Zap size={12} className="text-amarillo" fill="#E8B84B" />
          <span className="text-sm font-semibold text-gray-700">{potenciaActual} kW</span>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color = '#185FA5' }) {
  return (
    <div className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-gray-100">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '15' }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-base font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

export default function SesionPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  // Datos del cargador pasados desde FichaPage
  const cargadorNav = location.state?.cargador
  const sesionValida = !!cargadorNav
  const CARGADOR_ACTIVO = cargadorNav
    ? {
        nombre: cargadorNav.nombre,
        direccion: cargadorNav.direccion,
        conector: cargadorNav.conectores?.[0]
          ? `${cargadorNav.conectores[0].tipo} ${cargadorNav.conectores[0].kw ? cargadorNav.conectores[0].kw + ' kW' : ''}`
          : '—',
        precio: cargadorNav.precio ?? 0.31,
        potenciaMax: cargadorNav.potencia ?? 50,
      }
    : CARGADOR_FALLBACK

  const [bateria, setBateria] = useState(BATERIA_INICIO)
  const [segundos, setSegundos] = useState(0)
  const [activa, setActiva] = useState(true)
  const [mostrarStop, setMostrarStop] = useState(false)
  const [kwhCargados, setKwhCargados] = useState(0)
  const [potenciaActual, setPotenciaActual] = useState(48)
  const [cobrando, setCobrando] = useState(false)
  const [resultadoCobro, setResultadoCobro] = useState(null) // { ok, amount_eur, error }

  // Simulación de carga
  useEffect(() => {
    if (!activa || bateria >= BATERIA_FIN) return
    const intervalo = setInterval(() => {
      setSegundos(s => s + 1)
      setBateria(b => {
        const nuevo = Math.min(BATERIA_FIN, b + 0.08)
        return Math.round(nuevo * 10) / 10
      })
      setKwhCargados(k => Math.round((k + 0.013) * 1000) / 1000)
      // Simular variación de potencia (curva de carga)
      setPotenciaActual(p => {
        if (bateria > 70) return Math.max(20, p - 0.2)
        if (bateria > 60) return Math.max(35, p - 0.05)
        return 48
      })
    }, 500)
    return () => clearInterval(intervalo)
  }, [activa, bateria])

  const porcentaje = Math.round(bateria)
  const bateriaObjetivo = BATERIA_FIN
  const progresoCarga = ((bateria - BATERIA_INICIO) / (BATERIA_FIN - BATERIA_INICIO)) * 100

  const formatTiempo = s => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const coste = (kwhCargados * CARGADOR_ACTIVO.precio).toFixed(2)
  const cargaCompleta = bateria >= BATERIA_FIN

  const detenerCarga = useCallback(async () => {
    setActiva(false)
    setMostrarStop(false)
    setCobrando(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sesión expirada. Vuelve a iniciar sesión.')
      const pmId = session?.user?.user_metadata?.stripe_pm_id
      const importeEur = parseFloat((kwhCargados * CARGADOR_ACTIVO.precio).toFixed(2))
      const amountCents = Math.round(importeEur * 100)

      // 1. Pedir el client_secret al servidor (la secret key nunca sale del servidor)
      const res = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          amount_cents: amountCents,
          description: `Carga en ${CARGADOR_ACTIVO.nombre} — ${kwhCargados.toFixed(2)} kWh`,
        }),
      })
      const { client_secret, error: serverError } = await res.json()
      if (!res.ok) throw new Error(serverError ?? 'Error al crear el pago')

      // 2. Confirmar el pago con la tarjeta guardada (Stripe.js en el navegador)
      const stripe = await getStripe()
      const { error: stripeError } = await stripe.confirmCardPayment(client_secret, {
        payment_method: pmId,
      })
      if (stripeError) throw new Error(stripeError.message)

      setResultadoCobro({ ok: true, amount_eur: importeEur })
    } catch (e) {
      setResultadoCobro({ ok: false, error: e.message })
    } finally {
      setCobrando(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kwhCargados])

  // Pantalla de estado vacío: acceso directo sin sesión activa
  if (!sesionValida) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8 text-center bg-gray-50">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-5">
          <Zap size={36} className="text-gray-300" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Sin sesión activa</h2>
        <p className="text-sm text-gray-500 mb-8">
          No tienes ninguna sesión de carga en curso. Busca un cargador cercano para empezar.
        </p>
        <button
          onClick={() => navigate('/mapa')}
          className="w-full bg-azul text-white font-bold py-4 rounded-2xl shadow-lg shadow-azul/30 active:scale-95 transition-transform"
        >
          Buscar cargador
        </button>
      </div>
    )
  }

  if (!activa && !cargaCompleta) {
    // Pantalla de carga mientras procesa el cobro
    if (cobrando) {
      return (
        <div className="h-full flex flex-col items-center justify-center px-6 text-center bg-gray-50">
          <div className="w-16 h-16 border-4 border-azul border-t-transparent rounded-full animate-spin mb-6" />
          <h2 className="text-lg font-bold text-gray-900 mb-1">Procesando pago</h2>
          <p className="text-sm text-gray-500">
            Cobrando {coste} € a tu tarjeta guardada…
          </p>
        </div>
      )
    }

    // Pantalla de resultado del cobro
    if (resultadoCobro) {
      const ok = resultadoCobro.ok
      return (
        <div className="h-full flex flex-col items-center justify-center px-6 text-center bg-gray-50">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${ok ? 'bg-verde/10' : 'bg-red-50'}`}>
            {ok
              ? <CheckCircle size={40} className="text-verde" />
              : <XCircle size={40} className="text-rojo" />
            }
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {ok ? 'Pago realizado' : 'Error en el pago'}
          </h2>

          {ok ? (
            <>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {resultadoCobro.amount_eur.toFixed(2)} €
              </p>
              <p className="text-sm text-gray-500 mb-1">
                {kwhCargados.toFixed(2)} kWh cargados
              </p>
              <p className="text-xs text-gray-400 mb-8">
                {CARGADOR_ACTIVO.nombre}
              </p>
              <div className="w-full space-y-2">
                <button
                  onClick={() => navigate('/historial')}
                  className="w-full bg-azul text-white font-bold py-4 rounded-2xl shadow-lg shadow-azul/30"
                >
                  Ver en historial
                </button>
                <button
                  onClick={() => navigate('/mapa')}
                  className="w-full bg-gray-100 text-gray-700 font-semibold py-4 rounded-2xl"
                >
                  Buscar otro cargador
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-2">
                {resultadoCobro.error}
              </p>
              <p className="text-xs text-gray-400 mb-8">
                Has cargado {kwhCargados.toFixed(2)} kWh · {coste} €
              </p>
              <div className="w-full space-y-2">
                <button
                  onClick={detenerCarga}
                  className="w-full bg-azul text-white font-bold py-4 rounded-2xl"
                >
                  Reintentar pago
                </button>
                <button
                  onClick={() => navigate('/mapa')}
                  className="w-full bg-gray-100 text-gray-700 font-semibold py-4 rounded-2xl"
                >
                  Volver al mapa
                </button>
              </div>
            </>
          )}
        </div>
      )
    }

    // Fallback (no debería ocurrir)
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 text-center bg-gray-50">
        <p className="text-gray-500 mb-4">Has cargado {kwhCargados.toFixed(2)} kWh · {coste} €</p>
        <button onClick={() => navigate('/mapa')} className="text-azul font-medium">Volver al mapa</button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${cargaCompleta ? 'bg-verde' : 'bg-verde animate-pulse'}`} />
              <span className="text-xs font-semibold text-verde uppercase tracking-wide">
                {cargaCompleta ? 'Carga completa' : 'Cargando'}
              </span>
            </div>
            <h1 className="text-base font-bold text-gray-900 mt-0.5">{CARGADOR_ACTIVO.nombre}</h1>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={11} className="text-gray-400" />
              <p className="text-xs text-gray-400">{CARGADOR_ACTIVO.direccion}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Conector</p>
            <p className="text-xs font-semibold text-gray-700">{CARGADOR_ACTIVO.conector}</p>
          </div>
        </div>
      </div>

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Círculo de progreso */}
        <div className="flex justify-center py-8">
          <CircularProgress porcentaje={porcentaje} potenciaActual={Math.round(potenciaActual)} />
        </div>

        {/* Objetivo */}
        <div className="mx-4 mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Batería inicial: {BATERIA_INICIO}%</span>
            <span>Objetivo: {bateriaObjetivo}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-verde transition-all duration-700"
              style={{ width: `${Math.min(100, progresoCarga)}%` }}
            />
          </div>
          <p className="text-xs text-center text-gray-500 mt-1.5">
            {cargaCompleta
              ? 'Objetivo alcanzado'
              : `${Math.round(bateriaObjetivo - bateria)}% restante para el objetivo`}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 px-4 pb-4">
          <StatCard icon={Clock} label="Tiempo" value={formatTiempo(segundos)} color="#185FA5" />
          <StatCard icon={Zap} label="kWh cargados" value={`${kwhCargados.toFixed(2)} kWh`} color="#2D8A4E" />
          <StatCard icon={Euro} label="Coste actual" value={`${coste} €`} color="#E8B84B" />
          <StatCard
            icon={Zap}
            label="Tarifa"
            value={`${Number(CARGADOR_ACTIVO.precio ?? 0).toFixed(2)} €/kWh`}
            color="#185FA5"
          />
        </div>

        {/* Estimación */}
        {!cargaCompleta && (
          <div className="mx-4 mb-4 bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={14} className="text-azul" />
              <p className="text-xs font-semibold text-azul">Estimación</p>
            </div>
            <div className="flex justify-between text-sm">
              <div>
                <p className="text-xs text-gray-500">Tiempo restante</p>
                <p className="font-bold text-gray-900">
                  ~{Math.ceil(((bateriaObjetivo - bateria) / 0.08) / 120)} min
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Coste total est.</p>
                <p className="font-bold text-gray-900">
                  ~{((kwhCargados + (bateriaObjetivo - bateria) * 0.6) * CARGADOR_ACTIVO.precio).toFixed(2)} €
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="h-28" />
      </div>

      {/* Botón detener / completado */}
      <div className="absolute bottom-16 left-0 right-0 px-4 pb-2 bg-gradient-to-t from-gray-50 pt-4">
        {cargaCompleta ? (
          <button
            onClick={() => navigate('/historial')}
            className="w-full py-4 rounded-2xl bg-verde text-white font-bold text-base shadow-lg shadow-verde/30 active:scale-95 transition-transform"
          >
            Finalizar y ver resumen
          </button>
        ) : mostrarStop ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <AlertTriangle size={14} className="text-amber-600" />
              <p className="text-xs text-amber-700">¿Seguro que quieres detener la carga?</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setMostrarStop(false)}
                className="flex-1 py-3.5 rounded-2xl bg-gray-100 text-gray-700 font-semibold"
              >
                Continuar
              </button>
              <button
                onClick={detenerCarga}
                className="flex-1 py-3.5 rounded-2xl bg-rojo text-white font-bold shadow-lg shadow-rojo/30"
              >
                Detener
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setMostrarStop(true)}
            className="w-full py-4 rounded-2xl bg-rojo text-white font-bold text-base shadow-lg shadow-rojo/30 active:scale-95 transition-transform"
          >
            Detener carga
          </button>
        )}
      </div>
    </div>
  )
}
