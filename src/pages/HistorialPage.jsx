import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Zap, Euro, ChevronRight, TrendingUp, Calendar } from 'lucide-react'
import { HISTORIAL } from '../data/cargadores'

function formatFecha(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatHora(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

function formatDuracion(min) {
  if (min >= 60) return `${Math.floor(min / 60)}h ${min % 60}min`
  return `${min} min`
}

function TarjetaHistorial({ sesion, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{sesion.cargadorNombre}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <Calendar size={11} className="text-gray-400" />
            <p className="text-xs text-gray-500">
              {formatFecha(sesion.fecha)} · {formatHora(sesion.fecha)}
            </p>
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">{sesion.conector}</p>
        </div>
        <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-1" />
      </div>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center">
            <Clock size={12} className="text-azul" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400">Duración</p>
            <p className="text-xs font-semibold text-gray-700">{formatDuracion(sesion.duracion)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 bg-green-50 rounded-lg flex items-center justify-center">
            <Zap size={12} className="text-verde" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400">Cargado</p>
            <p className="text-xs font-semibold text-gray-700">{sesion.kwhCargados} kWh</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="w-6 h-6 bg-yellow-50 rounded-lg flex items-center justify-center">
            <Euro size={12} className="text-amarillo" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400">Coste</p>
            <p className="text-xs font-bold text-gray-900">{sesion.coste.toFixed(2)} €</p>
          </div>
        </div>
      </div>
    </button>
  )
}

export default function HistorialPage() {
  const navigate = useNavigate()
  const [periodo, setPeriodo] = useState('mes')

  const totalKwh = HISTORIAL.reduce((s, h) => s + h.kwhCargados, 0)
  const totalEuros = HISTORIAL.reduce((s, h) => s + h.coste, 0)
  const totalSesiones = HISTORIAL.length
  const totalMinutos = HISTORIAL.reduce((s, h) => s + h.duracion, 0)

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Historial</h1>
        <p className="text-sm text-gray-500 mt-0.5">Tus sesiones de carga</p>

        {/* Filtro periodo */}
        <div className="flex gap-1 mt-3 bg-gray-100 rounded-xl p-1">
          {[
            { id: 'semana', label: '7 días' },
            { id: 'mes', label: 'Este mes' },
            { id: 'año', label: 'Este año' },
            { id: 'todo', label: 'Todo' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriodo(p.id)}
              className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${
                periodo === p.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Resumen estadísticas */}
        <div className="px-4 py-4">
          <div className="bg-gradient-to-br from-azul to-blue-600 rounded-2xl p-5 text-white shadow-lg shadow-azul/30">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} />
              <p className="text-sm font-semibold opacity-90">Resumen del periodo</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold">{totalKwh.toFixed(1)} kWh</p>
                <p className="text-xs opacity-70 mt-0.5">Total cargado</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{totalEuros.toFixed(2)} €</p>
                <p className="text-xs opacity-70 mt-0.5">Gasto total</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{totalSesiones}</p>
                <p className="text-xs opacity-70 mt-0.5">Sesiones</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.round(totalMinutos / 60)}h {totalMinutos % 60}m</p>
                <p className="text-xs opacity-70 mt-0.5">Tiempo total</p>
              </div>
            </div>
          </div>
        </div>

        {/* Ahorro CO2 */}
        <div className="mx-4 mb-4 bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-verde/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-lg">🌱</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-verde">
              {(totalKwh * 0.18).toFixed(1)} kg CO₂ evitados
            </p>
            <p className="text-xs text-gray-500">frente a un vehículo de combustión equivalente</p>
          </div>
        </div>

        {/* Lista sesiones */}
        <div className="px-4 pb-24 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Sesiones recientes
          </p>
          {HISTORIAL.length === 0 ? (
            <div className="text-center py-12">
              <Zap size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No hay sesiones en este periodo</p>
            </div>
          ) : (
            HISTORIAL.map(sesion => (
              <TarjetaHistorial
                key={sesion.id}
                sesion={sesion}
                onClick={() => navigate(`/cargador/${sesion.cargadorId}`)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
