import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import { Search, Locate, Zap, ChevronRight } from 'lucide-react'
import { REDES } from '../data/cargadores'
import { useCargadores } from '../hooks/useCargadores'

const CENTER_ESPANA = { lat: 40.4168, lng: -3.7038 }
const MAP_STYLES = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]

function EstadoBadge({ disponibles, total }) {
  const ratio = disponibles / total
  if (disponibles === 0)
    return <span className="text-xs font-semibold text-rojo">Sin disponibles</span>
  if (ratio < 0.4)
    return <span className="text-xs font-semibold text-amarillo">Pocos libres</span>
  return <span className="text-xs font-semibold text-verde">{disponibles}/{total} libres</span>
}

function TarjetaCargador({ c, onClick }) {
  const ratio = c.disponibles / c.total
  const color = c.disponibles === 0 ? '#C0392B' : ratio < 0.4 ? '#E8B84B' : '#2D8A4E'
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 w-full text-left hover:shadow-md transition-shadow"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: color + '20' }}
      >
        <Zap size={18} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900 truncate">{c.nombre}</p>
        <p className="text-xs text-gray-500 truncate">{c.direccion}</p>
        <div className="flex items-center gap-2 mt-1">
          <EstadoBadge disponibles={c.disponibles} total={c.total} />
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-500">{c.potencia} kW</span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-500">{c.precio != null ? Number(c.precio).toFixed(2) : '—'} €/kWh</span>
        </div>
      </div>
      <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
    </button>
  )
}

export default function MapaPage() {
  const navigate = useNavigate()
  const { cargadores, loading: loadingDatos, error: errorDatos } = useCargadores()
  const [selected, setSelected] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroRed, setFiltroRed] = useState('todas')
  const [soloDisponibles, setSoloDisponibles] = useState(false)
  const [vistaLista, setVistaLista] = useState(false)
  const mapRef = useRef(null)

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey || '',
    libraries: ['places'],
  })

  const cargadoresFiltrados = cargadores.filter(c => {
    if (soloDisponibles && c.disponibles === 0) return false
    if (filtroRed !== 'todas' && c.red !== filtroRed) return false
    if (
      busqueda &&
      !c.nombre.toLowerCase().includes(busqueda.toLowerCase()) &&
      !c.direccion.toLowerCase().includes(busqueda.toLowerCase())
    )
      return false
    return true
  })

  const getMarkerIcon = c => {
    const ratio = c.disponibles / c.total
    const color =
      c.disponibles === 0 ? '#C0392B' : ratio < 0.4 ? '#E8B84B' : '#2D8A4E'
    return {
      path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#fff',
      strokeWeight: 2,
      scale: selected?.id === c.id ? 2.2 : 1.8,
      anchor: isLoaded ? new window.google.maps.Point(12, 22) : undefined,
    }
  }

  const centrarMapa = useCallback(() => {
    if (mapRef.current && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        mapRef.current.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        mapRef.current.setZoom(14)
      })
    }
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-3 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-azul rounded-lg flex items-center justify-center">
              <Zap size={16} color="white" fill="white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Carga</h1>
          </div>
          <button
            onClick={() => setVistaLista(v => !v)}
            className="text-xs font-medium text-azul bg-blue-50 px-3 py-1.5 rounded-lg"
          >
            {vistaLista ? 'Ver mapa' : 'Ver lista'}
          </button>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cargador o dirección..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-azul/30"
          />
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSoloDisponibles(v => !v)}
            className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              soloDisponibles ? 'bg-verde text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Solo disponibles
          </button>
          {REDES.map(r => (
            <button
              key={r.id}
              onClick={() => setFiltroRed(r.id)}
              className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                filtroRed === r.id ? 'bg-azul text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {r.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 relative overflow-hidden">
        {errorDatos ? (
          <div className="h-full flex items-center justify-center p-8 text-center">
            <p className="text-sm text-red-500">Error al cargar cargadores: {errorDatos}</p>
          </div>
        ) : vistaLista ? (
          <div className="h-full overflow-y-auto no-scrollbar p-4 pb-20 space-y-2">
            <p className="text-xs text-gray-500 font-medium mb-3">
              {cargadoresFiltrados.length} cargadores encontrados
            </p>
            {cargadoresFiltrados.map(c => (
              <TarjetaCargador
                key={c.id}
                c={c}
                onClick={() => navigate(`/cargador/${c.id}`)}
              />
            ))}
          </div>
        ) : !apiKey || apiKey === '' ? (
          /* Vista demo sin API key */
          <div
            className="h-full bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col items-center justify-center relative overflow-hidden"
          >
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg,transparent,transparent 40px,#185FA5 40px,#185FA5 41px),repeating-linear-gradient(90deg,transparent,transparent 40px,#185FA5 40px,#185FA5 41px)',
              }}
            />
            {cargadoresFiltrados.map(c => {
              const ratio = c.disponibles / c.total
              const color =
                c.disponibles === 0 ? '#C0392B' : ratio < 0.4 ? '#E8B84B' : '#2D8A4E'
              const xPos = ((c.lng + 9.5) / 14) * 100
              const yPos = ((43.8 - c.lat) / 12) * 100
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(selected?.id === c.id ? null : c)}
                  className="absolute transform -translate-x-1/2 -translate-y-full"
                  style={{
                    left: `${Math.max(5, Math.min(90, xPos))}%`,
                    top: `${Math.max(5, Math.min(85, yPos))}%`,
                  }}
                >
                  <div className="flex flex-col items-center">
                    <div
                      className="w-9 h-9 rounded-full border-2 border-white shadow-lg flex items-center justify-center"
                      style={{ backgroundColor: color }}
                    >
                      <Zap size={14} fill="white" color="white" />
                    </div>
                    {selected?.id === c.id && (
                      <div className="mt-1 bg-white rounded-xl shadow-xl p-3 w-52 text-left border border-gray-100 z-10">
                        <p className="font-semibold text-sm text-gray-900 leading-tight">{c.nombre}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{c.red}</p>
                        <div className="flex items-center justify-between mt-2">
                          <EstadoBadge disponibles={c.disponibles} total={c.total} />
                          <span className="text-xs font-semibold text-azul">{c.precio != null ? Number(c.precio).toFixed(2) : '—'} €/kWh</span>
                        </div>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            navigate(`/cargador/${c.id}`)
                          }}
                          className="mt-2 w-full bg-azul text-white text-xs font-semibold py-2 rounded-lg"
                        >
                          Ver detalles →
                        </button>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
            <div className="absolute bottom-24 left-4 right-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              <strong>Vista demo:</strong> Añade tu <code>VITE_GOOGLE_MAPS_API_KEY</code> en{' '}
              <code>.env</code> para activar Google Maps completo.
            </div>
          </div>
        ) : isLoaded ? (
          <GoogleMap
            mapContainerClassName="w-full h-full"
            center={CENTER_ESPANA}
            zoom={12}
            options={{ styles: MAP_STYLES, disableDefaultUI: true, zoomControl: true }}
            onLoad={map => {
              mapRef.current = map
            }}
            onClick={() => setSelected(null)}
          >
            {cargadoresFiltrados.map(c => (
              <Marker
                key={c.id}
                position={{ lat: c.lat, lng: c.lng }}
                icon={getMarkerIcon(c)}
                onClick={() => setSelected(c)}
              />
            ))}
            {selected && (
              <InfoWindow
                position={{ lat: selected.lat, lng: selected.lng }}
                options={{ headerDisabled: true }}
              >
                <div className="p-2 min-w-[180px]">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <p className="font-semibold text-sm leading-tight">{selected.nombre}</p>
                      <p className="text-xs text-gray-500">{selected.red}</p>
                    </div>
                    <button
                      onClick={() => setSelected(null)}
                      className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 text-xs leading-none"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex justify-between mt-2">
                    <EstadoBadge disponibles={selected.disponibles} total={selected.total} />
                    <span className="text-xs font-semibold" style={{ color: '#185FA5' }}>
                      {selected.precio != null ? Number(selected.precio).toFixed(2) : '—'} €/kWh
                    </span>
                  </div>
                  <button
                    onClick={() => navigate(`/cargador/${selected.id}`)}
                    className="mt-2 w-full text-white text-xs font-bold py-2 px-4 rounded-lg"
                    style={{ backgroundColor: '#185FA5' }}
                  >
                    Ver detalles →
                  </button>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-azul border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Botón localización (solo en mapa) */}
        {!vistaLista && (
          <button
            onClick={centrarMapa}
            className="absolute bottom-24 right-4 w-11 h-11 bg-white rounded-xl shadow-lg flex items-center justify-center border border-gray-200"
          >
            <Locate size={20} className="text-azul" />
          </button>
        )}
      </div>
    </div>
  )
}
