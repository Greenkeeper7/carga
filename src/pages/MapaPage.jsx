import { useState, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import { Search, Locate, Zap, ChevronRight, RefreshCw } from 'lucide-react'
import { useOCMCargadores } from '../hooks/useOCMCargadores'

const CENTER_ESPANA = { lat: 40.4168, lng: -3.7038 }
const MAP_STYLES = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]

// ---------------------------------------------------------------------------
// Helpers de color por estado
// ---------------------------------------------------------------------------
function colorEstado(disponibles, total) {
  if (!total || disponibles === 0) return '#C0392B'
  if (disponibles / total < 0.4) return '#E8B84B'
  return '#2D8A4E'
}

function EstadoBadge({ disponibles, total }) {
  const color = colorEstado(disponibles, total)
  const texto =
    !total || disponibles === 0
      ? 'Sin disponibles'
      : disponibles / total < 0.4
      ? 'Pocos libres'
      : `${disponibles}/${total} libres`
  const cls =
    !total || disponibles === 0
      ? 'text-rojo'
      : disponibles / total < 0.4
      ? 'text-amarillo'
      : 'text-verde'
  return <span className={`text-xs font-semibold ${cls}`}>{texto}</span>
}

// ---------------------------------------------------------------------------
// Tarjeta de la vista lista
// ---------------------------------------------------------------------------
function TarjetaCargador({ c, onClick }) {
  const color = colorEstado(c.disponibles, c.total)
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
          {c.potencia && (
            <>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-500">{c.potencia} kW</span>
            </>
          )}
        </div>
      </div>
      <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------
export default function MapaPage() {
  const navigate = useNavigate()
  const { cargadores, loading, error, userLocation, buscarEnZona } = useOCMCargadores()

  const [selected, setSelected] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroRed, setFiltroRed] = useState('todas')
  const [soloDisponibles, setSoloDisponibles] = useState(false)
  const [vistaLista, setVistaLista] = useState(false)
  const [mostrarBuscarZona, setMostrarBuscarZona] = useState(false)
  const mapRef = useRef(null)

  const gmapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  const { isLoaded: gmapsLoaded } = useJsApiLoader({
    googleMapsApiKey: gmapsApiKey || '',
    libraries: ['places'],
  })

  const PALABRAS_EXCLUIDAS = ['business', 'unknown', 'private', 'individual']

  // Redes disponibles derivadas de los datos reales (top 7 por frecuencia, solo operadores reales)
  const redes = useMemo(() => {
    const counts = {}
    cargadores.forEach(c => {
      if (!c.red || c.red === 'Desconocido') return
      const lower = c.red.toLowerCase()
      if (PALABRAS_EXCLUIDAS.some(p => lower.includes(p))) return
      if (c.red.length > 25) return
      counts[c.red] = (counts[c.red] ?? 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([nombre]) => nombre)
  }, [cargadores])

  // Filtrado
  const cargadoresFiltrados = useMemo(() =>
    cargadores.filter(c => {
      if (soloDisponibles && c.disponibles === 0) return false
      if (filtroRed !== 'todas' && c.red !== filtroRed) return false
      if (busqueda) {
        const q = busqueda.toLowerCase()
        if (!c.nombre.toLowerCase().includes(q) && !c.direccion.toLowerCase().includes(q))
          return false
      }
      return true
    }),
  [cargadores, soloDisponibles, filtroRed, busqueda])

  // Icono del marcador en Google Maps
  const getMarkerIcon = useCallback(c => ({
    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
    fillColor: colorEstado(c.disponibles, c.total),
    fillOpacity: 1,
    strokeColor: '#fff',
    strokeWeight: 2,
    scale: selected?.id === c.id ? 2.2 : 1.8,
    anchor: gmapsLoaded ? new window.google.maps.Point(12, 22) : undefined,
  }), [selected, gmapsLoaded])

  // Centrar en ubicación del usuario y refrescar cargadores
  const centrarEnUsuario = useCallback(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords
      if (mapRef.current) {
        mapRef.current.panTo({ lat, lng })
        mapRef.current.setZoom(13)
      }
      buscarEnZona(lat, lng)
      setMostrarBuscarZona(false)
    })
  }, [buscarEnZona])

  // Al parar de mover el mapa mostrar botón "Buscar en esta zona"
  const onMapIdle = useCallback(() => {
    if (mapRef.current) setMostrarBuscarZona(true)
  }, [])

  const buscarZonaActual = useCallback(() => {
    if (!mapRef.current) return
    const center = mapRef.current.getCenter()
    buscarEnZona(center.lat(), center.lng())
    setMostrarBuscarZona(false)
  }, [buscarEnZona])

  // Centro inicial del mapa — zoom 6 muestra España entera; si hay ubicación del usuario zoom 13
  const centroInicial = CENTER_ESPANA
  const zoomInicial = 6

  return (
    <div className="h-full flex flex-col">
      {/* ── Header ── */}
      <div className="bg-white px-4 pt-10 pb-1.5 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            {/* Logo SVG: C blanca + rayo amarillo sobre fondo azul */}
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="28" height="28" rx="7" fill="#185FA5"/>
              <path d="M18 7C15.8 5.9 13.2 6.1 11.2 7.4C9.2 8.7 8 11 8 13.4C8 15.8 9.2 18.1 11.2 19.4C13.2 20.7 15.8 20.9 18 19.8" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
              <path d="M16.5 6.5L12.5 14h4l-2.5 7.5L22 13h-5.5l3-6.5z" fill="#E8B84B"/>
            </svg>
            <h1 className="text-lg font-bold leading-none">
              <span style={{ color: '#185FA5' }}>Carg</span><span style={{ color: '#E8B84B' }}>App</span>
            </h1>
            {loading && (
              <div className="w-3.5 h-3.5 border-2 border-azul border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          <button
            onClick={() => setVistaLista(v => !v)}
            className="text-xs font-medium text-azul bg-blue-50 px-2.5 py-1 rounded-lg"
          >
            {vistaLista ? 'Ver mapa' : 'Ver lista'}
          </button>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cargador o dirección..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-gray-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-azul/30"
          />
        </div>

        {/* Filtros */}
        <div className="flex gap-1.5 mt-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => setSoloDisponibles(v => !v)}
            className={`flex-shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors ${
              soloDisponibles ? 'bg-verde text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Solo disponibles
          </button>
          <button
            onClick={() => setFiltroRed('todas')}
            className={`flex-shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors ${
              filtroRed === 'todas' ? 'bg-azul text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Todas las redes
          </button>
          {redes.map(red => (
            <button
              key={red}
              onClick={() => setFiltroRed(red)}
              className={`flex-shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors ${
                filtroRed === red ? 'bg-azul text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {red}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-3">
            <p className="text-sm text-red-500">Error al cargar cargadores: {error}</p>
            <button
              onClick={() => buscarEnZona(centroInicial.lat, centroInicial.lng)}
              className="text-xs text-azul font-medium bg-blue-50 px-4 py-2 rounded-lg"
            >
              Reintentar
            </button>
          </div>
        ) : vistaLista ? (
          /* ── Vista lista ── */
          <div className="h-full overflow-y-auto no-scrollbar p-4 pb-20 space-y-2">
            <p className="text-xs text-gray-500 font-medium mb-3">
              {cargadoresFiltrados.length} cargadores encontrados
            </p>
            {cargadoresFiltrados.length === 0 && !loading && (
              <p className="text-center text-sm text-gray-400 py-12">
                No hay cargadores que coincidan con los filtros
              </p>
            )}
            {cargadoresFiltrados.map(c => (
              <TarjetaCargador
                key={c.id}
                c={c}
                onClick={() => navigate(`/cargador/${c.id}`, { state: { cargador: c } })}
              />
            ))}
          </div>
        ) : !gmapsApiKey ? (
          /* ── Vista demo sin Google Maps ── */
          <div className="h-full bg-gradient-to-br from-blue-50 to-blue-100 relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg,transparent,transparent 40px,#185FA5 40px,#185FA5 41px),repeating-linear-gradient(90deg,transparent,transparent 40px,#185FA5 40px,#185FA5 41px)',
              }}
            />
            {cargadoresFiltrados.slice(0, 40).map(c => {
              const color = colorEstado(c.disponibles, c.total)
              const xPos = ((c.lng + 9.5) / 14) * 100
              const yPos = ((43.8 - c.lat) / 12) * 100
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(selected?.id === c.id ? null : c)}
                  className="absolute transform -translate-x-1/2 -translate-y-full"
                  style={{ left: `${Math.max(5, Math.min(90, xPos))}%`, top: `${Math.max(5, Math.min(85, yPos))}%` }}
                >
                  <div className="flex flex-col items-center">
                    <div
                      className="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center"
                      style={{ backgroundColor: color }}
                    >
                      <Zap size={12} fill="white" color="white" />
                    </div>
                    {selected?.id === c.id && (
                      <div className="mt-1 bg-white rounded-xl shadow-xl p-3 w-52 text-left border border-gray-100 z-10">
                        <div className="flex justify-between items-start gap-1">
                          <div>
                            <p className="font-semibold text-sm text-gray-900 leading-tight">{c.nombre}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{c.red}</p>
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); setSelected(null) }}
                            className="text-gray-400 text-xs leading-none"
                          >✕</button>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <EstadoBadge disponibles={c.disponibles} total={c.total} />
                          {c.potencia && <span className="text-xs text-gray-500">{c.potencia} kW</span>}
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/cargador/${c.id}`, { state: { cargador: c } }) }}
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
              <strong>Vista demo:</strong> Añade <code>VITE_GOOGLE_MAPS_API_KEY</code> en <code>.env</code> para Google Maps.
            </div>
          </div>
        ) : gmapsLoaded ? (
          /* ── Google Maps ── */
          <>
            <GoogleMap
              mapContainerClassName="w-full h-full"
              center={centroInicial}
              zoom={zoomInicial}
              options={{ styles: MAP_STYLES, disableDefaultUI: true, zoomControl: true }}
              onLoad={map => { mapRef.current = map }}
              onIdle={onMapIdle}
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
                  <div className="p-2 min-w-[190px]">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm leading-tight">{selected.nombre}</p>
                        <p className="text-xs text-gray-500">{selected.red}</p>
                      </div>
                      <button
                        onClick={() => setSelected(null)}
                        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <EstadoBadge disponibles={selected.disponibles} total={selected.total} />
                      {selected.potencia && (
                        <span className="text-xs text-gray-500">{selected.potencia} kW</span>
                      )}
                    </div>
                    <button
                      onClick={() => navigate(`/cargador/${selected.id}`, { state: { cargador: selected } })}
                      className="mt-2 w-full text-white text-xs font-bold py-2 px-4 rounded-lg"
                      style={{ backgroundColor: '#185FA5' }}
                    >
                      Ver detalles →
                    </button>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>

            {/* Botón "Buscar en esta zona" */}
            {mostrarBuscarZona && (
              <div className="absolute top-3 left-0 right-0 flex justify-center pointer-events-none">
                <button
                  onClick={buscarZonaActual}
                  className="pointer-events-auto flex items-center gap-1.5 bg-white text-gray-700 text-xs font-semibold px-4 py-2 rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all"
                >
                  <RefreshCw size={12} />
                  Buscar en esta zona
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-azul border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Botón de localización */}
        {!vistaLista && (
          <button
            onClick={centrarEnUsuario}
            className="absolute bottom-24 right-4 w-11 h-11 bg-white rounded-xl shadow-lg flex items-center justify-center border border-gray-200 active:scale-95 transition-transform"
          >
            <Locate size={20} className="text-azul" />
          </button>
        )}
      </div>
    </div>
  )
}
