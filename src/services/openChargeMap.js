// Servicio Open Charge Map — https://openchargemap.org/site/develop/api
const OCM_BASE = 'https://api.openchargemap.io/v3/poi'

// Normaliza los nombres de conector de OCM a los tipos internos de la app
const CONNECTOR_MAP = {
  'CCS (Type 2)': 'CCS2',
  'CCS Type 2': 'CCS2',
  'Combined Charging System (CCS) Type 2': 'CCS2',
  'CHAdeMO': 'CHAdeMO',
  'Type 2 (Socket Only)': 'Type2',
  'Type 2 (Tethered Connector)': 'Type2',
  'Type 2 (Mennekes)': 'Type2',
  'IEC 62196-2 Type 2': 'Type2',
  'Tesla (Model S/X)': 'Tesla',
  'Tesla Supercharger': 'Tesla',
  'Tesla (Roadster)': 'Tesla',
  'Type 1 (J1772)': 'Type1',
  'Schuko (CEE7/4)': 'Schuko',
}

function normalizeConnector(title = '') {
  if (CONNECTOR_MAP[title]) return CONNECTOR_MAP[title]
  const t = title.toLowerCase()
  if (t.includes('ccs')) return 'CCS2'
  if (t.includes('chademo')) return 'CHAdeMO'
  if (t.includes('type 2') || t.includes('mennekes')) return 'Type2'
  if (t.includes('tesla')) return 'Tesla'
  return title.split('(')[0].trim() || 'Conector'
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
      tipo: normalizeConnector(c.ConnectionType?.Title),
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
    compact: 'true',
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
