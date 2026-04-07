import { useState, useEffect, useCallback } from 'react'
import { fetchCargadoresOCM } from '../services/openChargeMap'

const MADRID = { lat: 40.4168, lng: -3.7038 }

export function useOCMCargadores() {
  const [cargadores, setCargadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  // Centro actual de búsqueda (se actualiza al mover el mapa)
  const [centro, setCentro] = useState(null)

  // Obtener ubicación del usuario al montar
  useEffect(() => {
    if (!navigator.geolocation) {
      setCentro(MADRID)
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc)
        setCentro(loc)
      },
      () => setCentro(MADRID), // Si deniega permisos, centramos en Madrid
      { timeout: 6000 }
    )
  }, [])

  // Cada vez que cambia el centro, lanzar la consulta OCM
  useEffect(() => {
    if (!centro) return
    let cancelled = false

    setLoading(true)
    setError(null)

    fetchCargadoresOCM({ lat: centro.lat, lng: centro.lng })
      .then(data => {
        if (!cancelled) setCargadores(data)
      })
      .catch(err => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [centro])

  // Llamar desde MapaPage cuando el usuario mueve el mapa
  const buscarEnZona = useCallback((lat, lng) => {
    setCentro({ lat, lng })
  }, [])

  return { cargadores, loading, error, userLocation, buscarEnZona }
}
