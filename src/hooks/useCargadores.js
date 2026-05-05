import { useState, useEffect } from 'react'

async function fetchCargadores() {
  const res = await fetch('/api/cargadores')
  if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`)
  return res.json()
}

async function fetchCargadorById(id) {
  const res = await fetch(`/api/cargador/${id}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`)
  return res.json()
}

function mapRow(row) {
  const potencia = row['potencia_kW']
  const precio = row['precio_kWh']
  const total = row.conectores_total ?? 0
  const libres = row.conectores_libres ?? 0
  return {
    id: String(row.id),
    nombre: row.nombre,
    red: row.red,
    direccion: row.direccion,
    lat: row.latitud,
    lng: row.longitud,
    disponibles: libres,
    total,
    potencia,
    precio,
    horario: row.horario,
    conectores: Array.from({ length: total }, (_, i) => ({
      tipo: potencia >= 100 ? 'CCS2' : potencia >= 22 ? 'CCS2' : 'Type2',
      kw: potencia,
      disponible: i < libres,
    })),
    valoracion: null,
    opiniones: null,
  }
}

export function useCargadores() {
  const [cargadores, setCargadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchCargadores()
      .then(data => {
        if (!cancelled) setCargadores(data.map(mapRow))
      })
      .catch(err => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  return { cargadores, loading, error }
}

export function useCargador(id) {
  const [cargador, setCargador] = useState(null)
  const [loading, setLoading] = useState(id !== null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (id === null || id === undefined) return
    let cancelled = false
    setLoading(true)
    fetchCargadorById(id)
      .then(row => {
        if (!cancelled) setCargador(row ? mapRow(row) : null)
      })
      .catch(err => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id])

  return { cargador, loading, error }
}
