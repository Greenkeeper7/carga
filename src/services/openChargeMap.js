// Servicio Open Charge Map — https://openchargemap.org/site/develop/api
const OCM_BASE = 'https://api.openchargemap.io/v3/poi'

// Mapa de ConnectionTypeID (modo compact) → nombre normalizado
// IDs más comunes de OCM España
const CONNECTOR_ID_MAP = {
  1: 'Type1',      // Type 1 (J1772)
  2: 'CHAdeMO',
  25: 'Type2',     // Type 2 (Socket Only)
  27: 'Type2',     // Type 2 (Socket Only)
  28: 'Type2',     // Type 2 (Tethered Connector)
  33: 'CCS2',      // CCS (Type 2)
  30: 'Tesla',     // Tesla (Model S/X)
  32: 'Tesla',     // Tesla Supercharger
  3: 'Schuko',     // Schuko (CEE7/4)
  1036: 'Type2',   // Type 2 (Tethered Connector) — ID alternativo
}

// Normaliza el título de conector de OCM, con trim para espacios sobrantes
function normalizeConnector(title, typeId) {
  if (!title && typeId && CONNECTOR_ID_MAP[typeId]) return CONNECTOR_ID_MAP[typeId]
  const t = (title ?? '').trim()
  if (!t) return typeId && CONNECTOR_ID_MAP[typeId] ? CONNECTOR_ID_MAP[typeId] : 'Conector'
  const tl = t.toLowerCase()
  if (tl.includes('ccs') || tl.includes('combo')) return 'CCS2'
  if (tl.includes('chademo')) return 'CHAdeMO'
  if (tl.includes('type 2') || tl.includes('mennekes')) return 'Type2'
  if (tl.includes('tesla')) return 'Tesla'
  if (tl.includes('type 1') || tl.includes('j1772')) return 'Type1'
  if (tl.includes('schuko')) return 'Schuko'
  return t.split('(')[0].trim() || 'Conector'
}

// Convierte un POI de OCM al formato interno de la app
export function mapOCMPoi(poi) {
  const info = poi.AddressInfo ?? {}
  const conns = poi.Connections ?? []

  const total =
    poi.NumberOfPoints ??
    (conns.reduce((s, c) => s + (c.Quantity ?? 1), 0) || 1)

  const disponibles = conns
    .filter(c => c.StatusType?.IsOperational !== false)
    .reduce((s, c) => s + (c.Quantity ?? 1), 0)

  const potencia =
    conns.reduce((max, c) => Math.max(max, c.PowerKW ?? 0), 0) || null

  const conectores = conns.flatMap(c =>
    Array.from({ length: Math.max(1, c.Quantity ?? 1) }, () => ({
      tipo: normalizeConnector(c.ConnectionType?.Title, c.ConnectionTypeID),
      kw: c.PowerKW ?? null,
      disponible: c.StatusType?.IsOperational !== false,
    }))
  )

  const direccion =
    [info.AddressLine1, info.Town].filter(Boolean).join(', ') || info.Title || ''

  return {
    id: `ocm-${poi.ID}`,
    ocmId: poi.ID,
    nombre: info.Title ?? 'Punto de carga',
    red: poi.OperatorInfo?.Title ?? 'Desconocido',
    direccion,
    lat: info.Latitude,
    lng: info.Longitude,
    disponibles: Math.min(disponibles, total),
    total,
    potencia,
    precio: null, // OCM no provee precios estructurados
    horario: info.AccessComments ?? null,
    conectores,
    valoracion: null,
    opiniones: null,
  }
}

// Consulta la API de OCM cerca de una coordenada
export async function fetchCargadoresOCM({
  lat,
  lng,
  distanciaKm = 30,
  maxResults = 60,
}) {
  const apiKey = import.meta.env.VITE_OCM_API_KEY
  const params = new URLSearchParams({
    output: 'json',
    countrycode: 'ES',
    maxresults: String(maxResults),
    verbose: 'false',
    latitude: String(lat),
    longitude: String(lng),
    distance: String(distanciaKm),
    distanceunit: 'KM',
    key: apiKey,
  })

  const res = await fetch(`${OCM_BASE}?${params}`)
  if (!res.ok) throw new Error(`Open Charge Map error ${res.status}`)
  const data = await res.json()
  return data.map(mapOCMPoi)
}
