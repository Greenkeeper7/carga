import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Star,
  MapPin,
  Clock,
  Zap,
  ChevronRight,
  Navigation,
  Share2,
  Heart,
} from 'lucide-react'
import { useCargador } from '../hooks/useCargadores'

const CONECTOR_COLORES = {
  CCS2: '#185FA5',
  CHAdeMO: '#E8B84B',
  Type2: '#2D8A4E',
  'Tesla V3': '#C0392B',
}

function ConectorChip({ tipo, kw, disponible }) {
  const color = CONECTOR_COLORES[tipo] || '#6b7280'
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-opacity ${
        disponible ? 'opacity-100' : 'opacity-40'
      }`}
      style={{ borderColor: color + '40', backgroundColor: color + '10' }}
    >
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: disponible ? color : '#9ca3af' }} />
      <div>
        <p className="text-xs font-semibold" style={{ color: disponible ? color : '#9ca3af' }}>
          {tipo}
        </p>
        <p className="text-[10px] text-gray-500">{kw} kW</p>
      </div>
      {!disponible && (
        <span className="ml-auto text-[10px] text-gray-400 font-medium">Ocupado</span>
      )}
    </div>
  )
}

function EstrellaRating({ valor }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={12}
          fill={i <= Math.round(valor) ? '#E8B84B' : 'none'}
          color={i <= Math.round(valor) ? '#E8B84B' : '#d1d5db'}
        />
      ))}
    </div>
  )
}

export default function FichaPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { cargador, loading, error } = useCargador(id)

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-azul border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !cargador) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <p className="text-gray-500 mb-4">{error ?? 'Cargador no encontrado'}</p>
        <button onClick={() => navigate('/mapa')} className="text-azul font-medium">
          Volver al mapa
        </button>
      </div>
    )
  }

  const ratio = cargador.disponibles / cargador.total
  const estadoColor =
    cargador.disponibles === 0 ? '#C0392B' : ratio < 0.4 ? '#E8B84B' : '#2D8A4E'
  const estadoTexto =
    cargador.disponibles === 0
      ? 'Sin disponibles'
      : `${cargador.disponibles} de ${cargador.total} libres`

  const conectoresDisponibles = cargador.conectores.filter(c => c.disponible)
  const puedeCarga = conectoresDisponibles.length > 0

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Mapa miniatura / cabecera */}
      <div className="relative bg-gradient-to-br from-blue-100 to-blue-200 h-52 flex-shrink-0">
        {/* Mapa decorativo */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg,transparent,transparent 25px,#185FA5 25px,#185FA5 26px),repeating-linear-gradient(90deg,transparent,transparent 25px,#185FA5 25px,#185FA5 26px)',
          }}
        />
        {/* Pin central */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div
              className="w-14 h-14 rounded-full border-4 border-white shadow-xl flex items-center justify-center"
              style={{ backgroundColor: estadoColor }}
            >
              <Zap size={24} fill="white" color="white" />
            </div>
            <div className="w-2 h-2 bg-gray-400 rounded-full mt-1" />
          </div>
        </div>

        {/* Botones superiores */}
        <div className="absolute top-12 left-4 right-4 flex justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-gray-700" />
          </button>
          <div className="flex gap-2">
            <button className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center">
              <Heart size={18} className="text-gray-400" />
            </button>
            <button className="w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center">
              <Share2 size={18} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Badge red */}
        <div className="absolute bottom-4 left-4">
          <span className="bg-white text-xs font-semibold text-gray-700 px-3 py-1.5 rounded-full shadow">
            {cargador.red}
          </span>
        </div>
      </div>

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto no-scrollbar bg-gray-50">
        {/* Tarjeta principal */}
        <div className="bg-white mx-0 -mt-4 rounded-t-3xl px-5 pt-6 pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h1 className="text-lg font-bold text-gray-900 leading-snug">{cargador.nombre}</h1>
              <div className="flex items-center gap-1.5 mt-1">
                <MapPin size={13} className="text-gray-400" />
                <p className="text-xs text-gray-500">{cargador.direccion}</p>
              </div>
            </div>
            <div
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{ backgroundColor: estadoColor + '20', color: estadoColor }}
            >
              {estadoTexto}
            </div>
          </div>

          {/* Rating y horario */}
          <div className="flex items-center gap-4 mt-3">
            {cargador.valoracion != null && (
              <div className="flex items-center gap-1.5">
                <EstrellaRating valor={cargador.valoracion} />
                <span className="text-xs font-semibold text-gray-700">{cargador.valoracion}</span>
                {cargador.opiniones != null && (
                  <span className="text-xs text-gray-400">({cargador.opiniones})</span>
                )}
              </div>
            )}
            <div className="flex items-center gap-1 text-gray-500">
              <Clock size={13} />
              <span className="text-xs">{cargador.horario}</span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 px-4 py-3">
          {[
            { label: 'Precio', value: cargador.precio != null ? `${Number(cargador.precio).toFixed(2)} €` : '—', sub: 'por kWh' },
            { label: 'Potencia máx.', value: `${cargador.potencia} kW`, sub: 'disponible' },
            { label: 'Conectores', value: `${cargador.conectores.length}`, sub: 'tipos' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100">
              <p className="text-lg font-bold text-gray-900">{stat.value}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{stat.label}</p>
              <p className="text-[9px] text-gray-400">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Conectores */}
        <div className="px-4 pb-3">
          <h2 className="text-sm font-bold text-gray-900 mb-2">Conectores</h2>
          <div className="grid grid-cols-2 gap-2">
            {cargador.conectores.map((conector, i) => (
              <ConectorChip key={i} {...conector} />
            ))}
          </div>
        </div>

        {/* Cómo llegar */}
        <div className="px-4 pb-3">
          <button className="w-full flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                <Navigation size={16} className="text-azul" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">Cómo llegar</p>
                <p className="text-xs text-gray-500">Abrir en Maps</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </button>
        </div>

        {/* Spacer para el botón fijo */}
        <div className="h-24" />
      </div>

      {/* Botón de carga fijo */}
      <div className="absolute bottom-16 left-0 right-0 px-4 pb-2 bg-gradient-to-t from-gray-50 pt-4">
        <button
          onClick={() => puedeCarga && navigate('/sesion')}
          disabled={!puedeCarga}
          className={`w-full py-4 rounded-2xl text-white font-bold text-base shadow-lg transition-all ${
            puedeCarga
              ? 'bg-verde active:scale-95 shadow-verde/30'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          {puedeCarga ? (
            <span className="flex items-center justify-center gap-2">
              <Zap size={20} fill="white" />
              Iniciar carga
            </span>
          ) : (
            'No hay conectores disponibles'
          )}
        </button>
      </div>
    </div>
  )
}
