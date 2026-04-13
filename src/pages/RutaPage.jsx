import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GoogleMap,
  useJsApiLoader,
  DirectionsRenderer,
  Marker,
  Autocomplete,
} from '@react-google-maps/api'
import {
  Navigation, Zap, Battery, Clock, Euro, ChevronRight,
  ArrowLeft, AlertTriangle, Car, Gauge, CheckCircle2,
  Loader2, Info, ExternalLink,
} from 'lucide-react'
import { fetchCargadoresOCM } from '../services/openChargeMap'

// Module-level constant to avoid re-loading Google Maps
const LIBRARIES = ['places']

const MAP_STYLES = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]

const LOADING_STEPS = [
  'Calculando la ruta óptima...',
  'Analizando autonomía y consumo...',
  'Buscando puntos de carga en la ruta...',
]

// SVG pin with a number label for each charging stop
function createNumberMarker(num) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="38" viewBox="0 0 30 38">
    <path d="M15 1C9.48 1 5 5.48 5 11c0 9.5 10 26 10 26S25 20.5 25 11C25 5.48 20.52 1 15 1z"
      fill="#2D8A4E" stroke="white" stroke-width="1.5"/>
    <circle cx="15" cy="11" r="6.5" fill="white"/>
    <text x="15" y="15" text-anchor="middle" fill="#2D8A4E" font-size="8"
      font-weight="bold" font-family="Arial,sans-serif">${num}</text>
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function formatDuracion(min) {
  if (!min || min <= 0) return '0 min'
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)}h ${min % 60 > 0 ? `${min % 60}min` : ''}`
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function RutaPage() {
  const navigate = useNavigate()

  // Form state
  const [origen, setOrigen] = useState('')
  const [destino, setDestino] = useState('')
  const [bateria, setBateria] = useState(80)
  const [autonomia, setAutonomia] = useState(300)
  const [mostrarVehiculo, setMostrarVehiculo] = useState(false)

  // Flow state
  const [fase, setFase] = useState('formulario') // 'formulario' | 'cargando' | 'resultado'
  const [loadingStep, setLoadingStep] = useState(0)
  const [error, setError] = useState(null)

  // Result state
  const [directions, setDirections] = useState(null)
  const [paradas, setParadas] = useState([])
  const [resumen, setResumen] = useState(null)

  // Autocomplete refs
  const autoOrigenRef = useRef(null)
  const autoDestinoRef = useRef(null)

  const gmapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: gmapsApiKey || '',
    libraries: LIBRARIES,
  })

  // ── Route calculation ──────────────────────────────────────────────────────
  const calcularRuta = useCallback(async () => {
    if (!origen.trim() || !destino.trim() || !isLoaded) return
    setFase('cargando')
    setLoadingStep(1)
    setError(null)

    try {
      // 1. Get driving directions from Google
      const ds = new window.google.maps.DirectionsService()
      const result = await new Promise((resolve, reject) =>
        ds.route(
          {
            origin: origen,
            destination: destino,
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (res, status) =>
            status === 'OK'
              ? resolve(res)
              : reject(new Error(`No se pudo calcular la ruta (${status})`))
        )
      )

      setDirections(result)
      setLoadingStep(2)

      const legs = result.routes[0].legs
      const distanciaTotal = legs.reduce((s, l) => s + l.distance.value, 0) / 1000
      const tiempoTotal = legs.reduce((s, l) => s + l.duration.value, 0)

      // Flatten route into fine-grained lat/lng points using step.path
      const points = legs.flatMap(leg =>
        leg.steps.flatMap(step => {
          const path = step.path ?? []
          if (path.length === 0) {
            return [{
              lat: step.end_location.lat(),
              lng: step.end_location.lng(),
              distanciaKm: step.distance.value / 1000,
            }]
          }
          const distPerPt = step.distance.value / 1000 / path.length
          return path.map(p => ({
            lat: p.lat(),
            lng: p.lng(),
            distanciaKm: distPerPt,
          }))
        })
      )

      // 2. Battery simulation — find where to stop
      const rangoInicial = (bateria / 100) * autonomia
      const umbral = autonomia * 0.15      // stop below 15 %
      const objetivo = autonomia * 0.80    // charge to 80 %
      let rango = rangoInicial
      let kmAcumulado = 0
      const puntosParada = []

      for (const pt of points) {
        rango -= pt.distanciaKm
        kmAcumulado += pt.distanciaKm
        // Don't add a stop in the last 20 km before destination
        if (rango <= umbral && kmAcumulado < distanciaTotal - 20) {
          puntosParada.push({
            lat: pt.lat,
            lng: pt.lng,
            kmEnRuta: Math.round(kmAcumulado),
            bateriaLlegada: Math.max(5, Math.round((rango / autonomia) * 100)),
          })
          rango = objetivo
        }
      }

      // 3. Fetch OCM chargers for all stop points in parallel
      setLoadingStep(3)
      const resultadosOCM = await Promise.all(
        puntosParada.map(p =>
          fetchCargadoresOCM({ lat: p.lat, lng: p.lng, distanciaKm: 10, maxResults: 15 })
            .catch(() => [])
        )
      )

      // 4. Build enriched stop objects
      const kwhCap = autonomia * 0.20   // ~0.20 kWh/km average EV consumption
      const bateriaObj = 80

      const paradasFinal = puntosParada.map((punto, i) => {
        const lista = resultadosOCM[i] || []
        // Prefer available chargers, then highest power (DC fast charger)
        const best = [...lista].sort((a, b) => {
          const score = c => (c.disponibles > 0 ? 2000 : 0) + (c.potencia || 0)
          return score(b) - score(a)
        })[0] || null

        const potencia = best?.potencia || 50
        const precio = best?.precio || 0.29
        const kwhNec = ((bateriaObj - punto.bateriaLlegada) / 100) * kwhCap
        const tMin = Math.max(5, Math.round((kwhNec / potencia) * 60))
        const coste = kwhNec * precio

        return {
          id: best?.id || `stop-${i}`,
          nombre: best?.nombre || 'Punto de carga en ruta',
          red: best?.red || 'Desconocido',
          direccion: best?.direccion || '',
          lat: best?.lat ?? punto.lat,
          lng: best?.lng ?? punto.lng,
          potencia,
          kmEnRuta: punto.kmEnRuta,
          bateriaLlegada: punto.bateriaLlegada,
          bateriaObjetivo: bateriaObj,
          tiempoCargaMin: tMin,
          costeEstimado: coste.toFixed(2),
          kwhCargados: kwhNec.toFixed(1),
        }
      })

      const costeTotal = paradasFinal.reduce((s, p) => s + parseFloat(p.costeEstimado), 0)
      const tParadas = paradasFinal.reduce((s, p) => s + p.tiempoCargaMin, 0)

      setParadas(paradasFinal)
      setResumen({
        distanciaKm: Math.round(distanciaTotal),
        tiempoCondMin: Math.round(tiempoTotal / 60),
        tiempoParadasMin: tParadas,
        numParadas: paradasFinal.length,
        costeTotal: costeTotal.toFixed(2),
      })

      setFase('resultado')
    } catch (err) {
      setError(err.message || 'Error al calcular la ruta')
      setFase('formulario')
    }
  }, [origen, destino, bateria, autonomia, isLoaded])

  const volver = useCallback(() => {
    setFase('formulario')
    setDirections(null)
    setParadas([])
    setResumen(null)
    setError(null)
  }, [])

  const abrirEnGoogleMaps = useCallback(() => {
    const params = new URLSearchParams({
      api: '1',
      origin: origen,
      destination: destino,
      travelmode: 'driving',
    })
    if (paradas.length > 0) {
      params.set('waypoints', paradas.map(p => `${p.lat},${p.lng}`).join('|'))
    }
    window.open(
      `https://www.google.com/maps/dir/?${params.toString()}`,
      '_blank',
      'noopener,noreferrer'
    )
  }, [origen, destino, paradas])

  // ── Phase: Formulario ──────────────────────────────────────────────────────
  if (fase === 'formulario') {
    const rangoDisponible = Math.round((bateria / 100) * autonomia)
    const kmEntreparadas = Math.round(autonomia * 0.65)

    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-white px-4 pt-10 pb-4 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #185FA5, #2D8A4E)' }}>
            <Navigation size={18} color="white" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-none text-gray-900">
              Planificador de Ruta
            </h1>
            <p className="text-[10px] text-gray-400 mt-0.5">Paradas de carga optimizadas con IA</p>
          </div>
        </div>

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="p-4 pb-28 space-y-3">

            {/* Route inputs */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              {/* Origen */}
              <div className="p-4 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#185FA5' }} />
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Origen</span>
                </div>
                {isLoaded ? (
                  <Autocomplete
                    onLoad={auto => { autoOrigenRef.current = auto }}
                    onPlaceChanged={() => {
                      const place = autoOrigenRef.current?.getPlace()
                      setOrigen(place?.formatted_address || place?.name || '')
                    }}
                    options={{ componentRestrictions: { country: 'es' } }}
                  >
                    <input
                      type="text"
                      value={origen}
                      onChange={e => setOrigen(e.target.value)}
                      placeholder="Ciudad o dirección de partida..."
                      className="w-full py-1.5 text-sm font-medium text-gray-900 placeholder-gray-300 focus:outline-none bg-transparent"
                    />
                  </Autocomplete>
                ) : (
                  <input
                    type="text"
                    value={origen}
                    onChange={e => setOrigen(e.target.value)}
                    placeholder="Ciudad o dirección de partida..."
                    className="w-full py-1.5 text-sm font-medium text-gray-900 placeholder-gray-300 focus:outline-none bg-transparent"
                  />
                )}
              </div>

              {/* Connector line */}
              <div className="px-4 flex items-center gap-3">
                <div className="w-2.5 flex flex-col items-center">
                  <div className="w-px h-1.5 bg-gray-200" />
                  <div className="w-px h-1.5 bg-gray-200" />
                </div>
                <div className="flex-1 border-t border-dashed border-gray-100" />
              </div>

              {/* Destino */}
              <div className="p-4 pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#2D8A4E' }} />
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Destino</span>
                </div>
                {isLoaded ? (
                  <Autocomplete
                    onLoad={auto => { autoDestinoRef.current = auto }}
                    onPlaceChanged={() => {
                      const place = autoDestinoRef.current?.getPlace()
                      setDestino(place?.formatted_address || place?.name || '')
                    }}
                    options={{ componentRestrictions: { country: 'es' } }}
                  >
                    <input
                      type="text"
                      value={destino}
                      onChange={e => setDestino(e.target.value)}
                      placeholder="¿A dónde vas?"
                      className="w-full py-1.5 text-sm font-medium text-gray-900 placeholder-gray-300 focus:outline-none bg-transparent"
                    />
                  </Autocomplete>
                ) : (
                  <input
                    type="text"
                    value={destino}
                    onChange={e => setDestino(e.target.value)}
                    placeholder="¿A dónde vas?"
                    className="w-full py-1.5 text-sm font-medium text-gray-900 placeholder-gray-300 focus:outline-none bg-transparent"
                  />
                )}
              </div>
            </div>

            {/* Vehicle settings accordion */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => setMostrarVehiculo(v => !v)}
                className="w-full p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Car size={15} className="text-azul" />
                  <span className="text-sm font-medium text-gray-700">Mi vehículo eléctrico</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{bateria}% · {autonomia} km</span>
                  <ChevronRight
                    size={14}
                    className={`text-gray-400 transition-transform duration-200 ${mostrarVehiculo ? 'rotate-90' : ''}`}
                  />
                </div>
              </button>

              {mostrarVehiculo && (
                <div className="px-4 pb-5 pt-1 space-y-5 border-t border-gray-50">
                  {/* Battery slider */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                        <Battery size={12} className="text-azul" />
                        Batería actual
                      </label>
                      <span className="text-sm font-bold text-azul">{bateria}%</span>
                    </div>
                    <input
                      type="range" min="10" max="100" step="5" value={bateria}
                      onChange={e => setBateria(Number(e.target.value))}
                      className="w-full"
                      style={{ accentColor: '#185FA5' }}
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>10%</span><span>55%</span><span>100%</span>
                    </div>
                  </div>

                  {/* Range slider */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                        <Gauge size={12} className="text-azul" />
                        Autonomía al 100%
                      </label>
                      <span className="text-sm font-bold text-azul">{autonomia} km</span>
                    </div>
                    <input
                      type="range" min="100" max="700" step="10" value={autonomia}
                      onChange={e => setAutonomia(Number(e.target.value))}
                      className="w-full"
                      style={{ accentColor: '#185FA5' }}
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>100 km</span><span>400 km</span><span>700 km</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Range info chip */}
            <div className="flex items-center gap-2 bg-blue-50 rounded-xl p-3">
              <Info size={13} className="text-azul flex-shrink-0" />
              <p className="text-xs text-azul">
                Tienes <strong>{rangoDisponible} km</strong> disponibles · paradas cada ~<strong>{kmEntreparadas} km</strong>
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
                <AlertTriangle size={14} className="text-rojo flex-shrink-0 mt-0.5" />
                <p className="text-xs text-rojo leading-relaxed">{error}</p>
              </div>
            )}

            {/* CTA button */}
            <button
              onClick={calcularRuta}
              disabled={!origen.trim() || !destino.trim() || !isLoaded}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-lg"
              style={{
                background:
                  origen.trim() && destino.trim()
                    ? 'linear-gradient(135deg, #185FA5 0%, #2D8A4E 100%)'
                    : undefined,
                backgroundColor:
                  !origen.trim() || !destino.trim() ? '#9CA3AF' : undefined,
              }}
            >
              {!isLoaded ? 'Cargando mapas...' : '✦  Calcular ruta óptima con IA'}
            </button>

            {!gmapsApiKey && (
              <p className="text-[11px] text-center text-gray-400">
                Requiere <code>VITE_GOOGLE_MAPS_API_KEY</code> en .env
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Phase: Cargando ────────────────────────────────────────────────────────
  if (fase === 'cargando') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 gap-8">
        {/* Animated icon */}
        <div className="relative">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #185FA5, #2D8A4E)' }}
          >
            <Navigation size={32} color="white" />
          </div>
          <div
            className="absolute inset-0 rounded-2xl animate-ping opacity-20"
            style={{ background: 'linear-gradient(135deg, #185FA5, #2D8A4E)' }}
          />
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amarillo flex items-center justify-center shadow">
            <Zap size={12} fill="white" color="white" />
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Optimizando ruta</h2>
          <p className="text-sm text-gray-500">La IA está calculando las mejores paradas de carga</p>
        </div>

        {/* Step indicators */}
        <div className="w-full space-y-3">
          {LOADING_STEPS.map((step, i) => {
            const done = loadingStep > i + 1
            const active = loadingStep === i + 1
            return (
              <div
                key={i}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                  active ? 'bg-blue-50' : done ? 'bg-gray-50' : 'opacity-40'
                }`}
              >
                {done ? (
                  <CheckCircle2 size={18} className="text-verde flex-shrink-0" />
                ) : active ? (
                  <Loader2 size={18} className="text-azul flex-shrink-0 animate-spin" />
                ) : (
                  <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-200 flex-shrink-0" />
                )}
                <span
                  className={`text-sm ${
                    done
                      ? 'text-gray-400 line-through'
                      : active
                      ? 'text-azul font-semibold'
                      : 'text-gray-400'
                  }`}
                >
                  {step}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Phase: Resultado ───────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      {/* Compact header */}
      <div className="bg-white px-4 pt-10 pb-3 shadow-sm flex items-center justify-between gap-2">
        <button
          onClick={volver}
          className="flex items-center gap-1 text-azul flex-shrink-0"
        >
          <ArrowLeft size={16} />
          <span className="text-sm font-medium">Editar</span>
        </button>
        <div className="flex-1 text-center min-w-0">
          <p className="text-xs font-semibold text-gray-800 truncate">
            {origen.split(',')[0].trim()} → {destino.split(',')[0].trim()}
          </p>
          <p className="text-[10px] text-gray-400">
            {resumen?.distanciaKm} km
            {resumen?.numParadas > 0
              ? ` · ${resumen.numParadas} parada${resumen.numParadas > 1 ? 's' : ''} de carga`
              : ' · Sin paradas necesarias'}
          </p>
        </div>
        <div className="w-14 flex-shrink-0" />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Map */}
        {isLoaded && directions && (
          <div className="h-52 relative">
            <GoogleMap
              mapContainerClassName="w-full h-full"
              zoom={7}
              center={{ lat: 40.4168, lng: -3.7038 }}
              options={{ styles: MAP_STYLES, disableDefaultUI: true }}
            >
              <DirectionsRenderer
                directions={directions}
                options={{
                  suppressMarkers: false,
                  preserveViewport: false,
                  polylineOptions: {
                    strokeColor: '#185FA5',
                    strokeWeight: 4,
                    strokeOpacity: 0.85,
                  },
                }}
              />
              {paradas.map((p, i) => (
                <Marker
                  key={p.id}
                  position={{ lat: p.lat, lng: p.lng }}
                  icon={{
                    url: createNumberMarker(i + 1),
                    scaledSize: new window.google.maps.Size(30, 38),
                    anchor: new window.google.maps.Point(15, 38),
                  }}
                />
              ))}
            </GoogleMap>
          </div>
        )}

        {/* Summary stats bar */}
        {resumen && (
          <div className="grid grid-cols-4 bg-white border-b border-gray-100">
            {[
              { label: 'Distancia', value: `${resumen.distanciaKm} km`, Icon: Navigation },
              { label: 'Conducción', value: formatDuracion(resumen.tiempoCondMin), Icon: Clock },
              { label: 'En carga', value: formatDuracion(resumen.tiempoParadasMin), Icon: Zap },
              { label: 'Coste', value: `€${resumen.costeTotal}`, Icon: Euro },
            ].map(({ label, value, Icon }) => (
              <div key={label} className="py-3 flex flex-col items-center gap-1 border-r last:border-r-0 border-gray-100">
                <Icon size={12} className="text-gray-400" />
                <span className="text-xs font-bold text-gray-900">{value}</span>
                <span className="text-[9px] text-gray-400 uppercase tracking-wide">{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Stops list */}
        <div className="p-4 pb-28 space-y-3">
          {paradas.length === 0 ? (
            /* No stops needed */
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center">
                <CheckCircle2 size={30} className="text-verde" />
              </div>
              <div>
                <p className="font-bold text-gray-800 text-base">¡Sin paradas necesarias!</p>
                <p className="text-sm text-gray-500 mt-1 max-w-[240px] mx-auto">
                  Tu batería actual es suficiente para llegar al destino sin recargar.
                </p>
              </div>
              <div className="bg-green-50 rounded-xl px-4 py-2.5 text-xs text-verde font-medium">
                Llegarás con ≥ 15% de batería restante
              </div>

              <button
                onClick={abrirEnGoogleMaps}
                className="flex items-center justify-center gap-2 py-4 px-6 rounded-2xl border-2 font-bold text-sm transition-all active:scale-[0.98]"
                style={{ borderColor: '#185FA5', color: '#185FA5' }}
              >
                <ExternalLink size={16} />
                Iniciar viaje en Google Maps
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {paradas.length} parada{paradas.length !== 1 ? 's' : ''} recomendada{paradas.length !== 1 ? 's' : ''}
              </p>

              {paradas.map((p, i) => (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  {/* Stop header */}
                  <div className="flex items-start gap-3 p-4 pb-3">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                      style={{ background: 'linear-gradient(135deg, #185FA5, #2D8A4E)' }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 leading-tight truncate">{p.nombre}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {p.red}{p.direccion ? ` · ${p.direccion}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/cargador/${p.id}`, { state: { cargador: p } })}
                      className="flex-shrink-0 p-1 -mr-1"
                    >
                      <ChevronRight size={16} className="text-gray-300" />
                    </button>
                  </div>

                  {/* Key stats grid */}
                  <div className="grid grid-cols-4 border-t border-gray-50">
                    {[
                      { label: 'En ruta', value: `${p.kmEnRuta} km` },
                      { label: 'Batería llegada', value: `${p.bateriaLlegada}%` },
                      { label: `Carga → ${p.bateriaObjetivo}%`, value: `${p.tiempoCargaMin} min` },
                      { label: 'Potencia', value: `${p.potencia} kW` },
                    ].map(({ label, value }) => (
                      <div key={label} className="py-2.5 flex flex-col items-center gap-0.5 border-r last:border-r-0 border-gray-50">
                        <span className="text-xs font-bold text-gray-900">{value}</span>
                        <span className="text-[8px] text-gray-400 text-center leading-tight px-1">{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Cost footer */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-t border-gray-100">
                    <span className="text-xs text-gray-500">{p.kwhCargados} kWh cargados</span>
                    <span className="text-sm font-bold text-verde">€{p.costeEstimado}</span>
                  </div>
                </div>
              ))}

              {/* Trip summary card */}
              {resumen && (
                <div
                  className="rounded-2xl p-5 text-white"
                  style={{ background: 'linear-gradient(135deg, #185FA5 0%, #2D8A4E 100%)' }}
                >
                  <p className="text-xs font-semibold opacity-70 uppercase tracking-widest mb-3">
                    Resumen del viaje
                  </p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold leading-none">
                        {formatDuracion(resumen.tiempoCondMin + resumen.tiempoParadasMin)}
                      </p>
                      <p className="text-xs opacity-70 mt-1">tiempo total incluyendo cargas</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold leading-none">€{resumen.costeTotal}</p>
                      <p className="text-xs opacity-70 mt-1">coste estimado en carga</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/20 flex justify-between text-xs opacity-80">
                    <span>{resumen.distanciaKm} km de distancia</span>
                    <span>{paradas.length} parada{paradas.length !== 1 ? 's' : ''} · {formatDuracion(resumen.tiempoParadasMin)} en carga</span>
                  </div>
                </div>
              )}

              {/* Open in Google Maps */}
              <button
                onClick={abrirEnGoogleMaps}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 font-bold text-sm transition-all active:scale-[0.98]"
                style={{ borderColor: '#185FA5', color: '#185FA5' }}
              >
                <ExternalLink size={16} />
                Iniciar viaje en Google Maps
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
