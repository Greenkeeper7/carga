import { useState, useMemo } from 'react'
import { Clock, Zap, Euro, TrendingUp, Calendar, Download, ChevronLeft, ChevronRight } from 'lucide-react'

// ---------------------------------------------------------------------------
// Datos de prueba realistas — Madrid, abril 2026
// ---------------------------------------------------------------------------
const SESIONES = [
  {
    id: 'h001',
    cargadorNombre: 'Zunder Méndez Álvaro',
    direccion: 'Av. Méndez Álvaro, 83, Madrid',
    red: 'Zunder',
    fecha: '2026-04-06T09:14:00',
    duracion: 31,
    kwhCargados: 43.5,
    precioPorKwh: 0.29,
    potencia: 150,
    conector: 'CCS2 150 kW',
  },
  {
    id: 'h002',
    cargadorNombre: 'Iberdrola Paseo Castellana',
    direccion: 'P.º de la Castellana, 200, Madrid',
    red: 'Iberdrola',
    fecha: '2026-04-03T18:42:00',
    duracion: 38,
    kwhCargados: 22.1,
    precioPorKwh: 0.31,
    potencia: 50,
    conector: 'CCS2 50 kW',
  },
  {
    id: 'h003',
    cargadorNombre: 'Repsol Avenida de América',
    direccion: 'Av. de América, 41, Madrid',
    red: 'Repsol',
    fecha: '2026-04-01T11:05:00',
    duracion: 28,
    kwhCargados: 41.2,
    precioPorKwh: 0.33,
    potencia: 100,
    conector: 'CCS2 100 kW',
  },
  {
    id: 'h004',
    cargadorNombre: 'Endesa Gran Vía',
    direccion: 'Gran Vía, 32, Madrid',
    red: 'Endesa',
    fecha: '2026-03-28T16:30:00',
    duracion: 120,
    kwhCargados: 38.5,
    precioPorKwh: 0.25,
    potencia: 22,
    conector: 'Type2 22 kW',
  },
  {
    id: 'h005',
    cargadorNombre: 'Tesla Supercharger La Vaguada',
    direccion: 'C. de Monforte de Lemos, 36, Madrid',
    red: 'Tesla',
    fecha: '2026-03-22T20:15:00',
    duracion: 22,
    kwhCargados: 48.7,
    precioPorKwh: 0.35,
    potencia: 150,
    conector: 'CCS2 150 kW',
  },
  {
    id: 'h006',
    cargadorNombre: 'EDP Calle Alcalá',
    direccion: 'C. de Alcalá, 265, Madrid',
    red: 'EDP',
    fecha: '2026-03-18T08:50:00',
    duracion: 55,
    kwhCargados: 28.9,
    precioPorKwh: 0.28,
    potencia: 50,
    conector: 'CCS2 50 kW',
  },
  {
    id: 'h007',
    cargadorNombre: 'Zunder Chamartín',
    direccion: 'C. de Agustín de Foxá, 29, Madrid',
    red: 'Zunder',
    fecha: '2026-03-10T13:22:00',
    duracion: 35,
    kwhCargados: 51.3,
    precioPorKwh: 0.29,
    potencia: 150,
    conector: 'CCS2 150 kW',
  },
  {
    id: 'h008',
    cargadorNombre: 'Iberdrola Plaza Mayor',
    direccion: 'Pl. Mayor, 1, Madrid',
    red: 'Iberdrola',
    fecha: '2026-02-25T10:00:00',
    duracion: 90,
    kwhCargados: 24.6,
    precioPorKwh: 0.31,
    potencia: 22,
    conector: 'Type2 22 kW',
  },
  {
    id: 'h009',
    cargadorNombre: 'Repsol Vallecas',
    direccion: 'Av. de la Albufera, 125, Madrid',
    red: 'Repsol',
    fecha: '2026-02-14T17:30:00',
    duracion: 44,
    kwhCargados: 36.8,
    precioPorKwh: 0.33,
    potencia: 100,
    conector: 'CCS2 100 kW',
  },
  {
    id: 'h010',
    cargadorNombre: 'Endesa Retiro',
    direccion: 'C. del Doctor Esquerdo, 12, Madrid',
    red: 'Endesa',
    fecha: '2026-02-07T09:45:00',
    duracion: 65,
    kwhCargados: 19.2,
    precioPorKwh: 0.25,
    potencia: 22,
    conector: 'Type2 22 kW',
  },
]

// Coste calculado siempre desde precio × kWh
const sesiones = SESIONES.map(s => ({
  ...s,
  coste: Math.round(s.kwhCargados * s.precioPorKwh * 100) / 100,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const RED_COLORES = {
  Zunder: '#185FA5',
  Iberdrola: '#2D8A4E',
  Endesa: '#E8B84B',
  Repsol: '#C0392B',
  Tesla: '#374151',
  EDP: '#7C3AED',
}

function formatFecha(iso) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatHora(iso) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

function formatDuracion(min) {
  if (min >= 60) return `${Math.floor(min / 60)}h ${min % 60}m`
  return `${min} min`
}

function mesLabel(year, month) {
  return new Date(year, month, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
}

// ---------------------------------------------------------------------------
// Generador de factura HTML → impresión → PDF
// ---------------------------------------------------------------------------
function generarFactura(s) {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Factura ${s.id.toUpperCase()} — Carga</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #111; padding: 48px; font-size: 13px; }
    .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; }
    .logo-icon { width: 36px; height: 36px; background: #185FA5; border-radius: 8px;
      display: flex; align-items: center; justify-content: center; color: white;
      font-weight: bold; font-size: 18px; }
    .logo-text { font-size: 22px; font-weight: 700; color: #185FA5; }
    h2 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
    .subtitle { color: #6b7280; margin-bottom: 32px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #185FA5; color: white; text-align: left; padding: 10px 12px; font-size: 12px; }
    td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
    tr:last-child td { border-bottom: none; }
    .total-row td { font-weight: 700; background: #f9fafb; }
    .footer { margin-top: 40px; color: #9ca3af; font-size: 11px; text-align: center; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px;
      font-size: 11px; font-weight: 600; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 28px; }
    .info-block label { display: block; font-size: 11px; color: #6b7280; margin-bottom: 2px; }
    .info-block span { font-weight: 600; }
    @media print { body { padding: 32px; } }
  </style>
</head>
<body>
  <div class="logo">
    <div class="logo-icon">⚡</div>
    <span class="logo-text">Carga</span>
  </div>

  <h2>Factura de recarga</h2>
  <p class="subtitle">N.º ${s.id.toUpperCase()} · Emitida el ${formatFecha(new Date().toISOString())}</p>

  <div class="info-grid">
    <div class="info-block">
      <label>Punto de recarga</label>
      <span>${s.cargadorNombre}</span>
    </div>
    <div class="info-block">
      <label>Dirección</label>
      <span>${s.direccion}</span>
    </div>
    <div class="info-block">
      <label>Red operadora</label>
      <span>${s.red}</span>
    </div>
    <div class="info-block">
      <label>Conector</label>
      <span>${s.conector}</span>
    </div>
    <div class="info-block">
      <label>Fecha y hora</label>
      <span>${formatFecha(s.fecha)} ${formatHora(s.fecha)}</span>
    </div>
    <div class="info-block">
      <label>Duración</label>
      <span>${formatDuracion(s.duracion)}</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Concepto</th>
        <th>Cantidad</th>
        <th>Precio unitario</th>
        <th>Importe</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Energía recargada</td>
        <td>${s.kwhCargados.toFixed(2)} kWh</td>
        <td>${s.precioPorKwh.toFixed(3)} €/kWh</td>
        <td>${(s.kwhCargados * s.precioPorKwh).toFixed(2)} €</td>
      </tr>
      <tr>
        <td>IVA (21%)</td>
        <td>—</td>
        <td>—</td>
        <td>${(s.coste * 0.21).toFixed(2)} €</td>
      </tr>
      <tr class="total-row">
        <td colspan="3">Total</td>
        <td>${(s.coste * 1.21).toFixed(2)} €</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    Carga App · CIF B-00000000 · soporte@carga.app<br/>
    Este documento tiene validez como factura simplificada según el art. 4 RD 1619/2012
  </div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=800,height=900')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.onload = () => win.print()
}

// ---------------------------------------------------------------------------
// Componentes
// ---------------------------------------------------------------------------
function TarjetaSesion({ s }) {
  const color = RED_COLORES[s.red] || '#6b7280'

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Barra de color de red */}
      <div className="h-1 w-full" style={{ backgroundColor: color }} />

      <div className="p-4">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm text-gray-900 truncate">{s.cargadorNombre}</p>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: color + '18', color }}
              >
                {s.red}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Calendar size={11} className="text-gray-400 flex-shrink-0" />
              <p className="text-xs text-gray-500">
                {formatFecha(s.fecha)} · {formatHora(s.fecha)}
              </p>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">{s.conector}</p>
          </div>

          {/* Coste destacado */}
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-gray-900">{s.coste.toFixed(2)} €</p>
            <p className="text-[10px] text-gray-400">{s.precioPorKwh.toFixed(3)} €/kWh</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-50">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock size={11} className="text-azul" />
            </div>
            <div>
              <p className="text-[9px] text-gray-400 leading-none mb-0.5">Duración</p>
              <p className="text-xs font-semibold text-gray-700 leading-none">{formatDuracion(s.duracion)}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap size={11} className="text-verde" />
            </div>
            <div>
              <p className="text-[9px] text-gray-400 leading-none mb-0.5">Cargado</p>
              <p className="text-xs font-semibold text-gray-700 leading-none">{s.kwhCargados.toFixed(1)} kWh</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap size={11} className="text-gray-500" />
            </div>
            <div>
              <p className="text-[9px] text-gray-400 leading-none mb-0.5">Potencia</p>
              <p className="text-xs font-semibold text-gray-700 leading-none">{s.potencia} kW</p>
            </div>
          </div>
        </div>

        {/* Botón factura */}
        <button
          onClick={() => generarFactura(s)}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
          <Download size={13} />
          Descargar factura PDF
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------
export default function HistorialPage() {
  // Obtener meses únicos con datos, ordenados de más reciente a más antiguo
  const mesesDisponibles = useMemo(() => {
    const set = new Map()
    sesiones.forEach(s => {
      const d = new Date(s.fecha)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (!set.has(key)) set.set(key, { year: d.getFullYear(), month: d.getMonth() })
    })
    return Array.from(set.values()).sort((a, b) =>
      b.year !== a.year ? b.year - a.year : b.month - a.month
    )
  }, [])

  const [mesIdx, setMesIdx] = useState(0)
  const mesActual = mesesDisponibles[mesIdx]

  const sesionesMes = useMemo(() => {
    if (!mesActual) return []
    return sesiones.filter(s => {
      const d = new Date(s.fecha)
      return d.getFullYear() === mesActual.year && d.getMonth() === mesActual.month
    })
  }, [mesActual])

  const totalKwh = sesionesMes.reduce((acc, s) => acc + s.kwhCargados, 0)
  const totalEuros = sesionesMes.reduce((acc, s) => acc + s.coste, 0)
  const totalMinutos = sesionesMes.reduce((acc, s) => acc + s.duracion, 0)

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Historial</h1>
        <p className="text-sm text-gray-500 mt-0.5">Tus sesiones de carga</p>

        {/* Selector de mes */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => setMesIdx(i => Math.min(mesesDisponibles.length - 1, i + 1))}
            disabled={mesIdx >= mesesDisponibles.length - 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 disabled:opacity-30"
          >
            <ChevronLeft size={16} className="text-gray-600" />
          </button>

          <div className="flex-1 flex gap-1.5 overflow-x-auto no-scrollbar">
            {mesesDisponibles.map((m, i) => (
              <button
                key={`${m.year}-${m.month}`}
                onClick={() => setMesIdx(i)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  i === mesIdx
                    ? 'bg-azul text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {new Date(m.year, m.month, 1).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })}
              </button>
            ))}
          </div>

          <button
            onClick={() => setMesIdx(i => Math.max(0, i - 1))}
            disabled={mesIdx <= 0}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 disabled:opacity-30"
          >
            <ChevronRight size={16} className="text-gray-600" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Tarjeta resumen del mes */}
        <div className="px-4 pt-4 pb-3">
          <div className="bg-azul rounded-2xl p-5 text-white shadow-lg shadow-azul/25">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={15} className="opacity-80" />
                <p className="text-sm font-semibold opacity-90 capitalize">
                  {mesActual ? mesLabel(mesActual.year, mesActual.month) : '—'}
                </p>
              </div>
              <span className="text-xs opacity-60">{sesionesMes.length} {sesionesMes.length === 1 ? 'carga' : 'cargas'}</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/15 rounded-xl p-3 text-center">
                <p className="text-xl font-bold">{totalEuros.toFixed(2)}</p>
                <p className="text-[10px] opacity-70 mt-0.5">€ gastados</p>
              </div>
              <div className="bg-white/15 rounded-xl p-3 text-center">
                <p className="text-xl font-bold">{totalKwh.toFixed(1)}</p>
                <p className="text-[10px] opacity-70 mt-0.5">kWh totales</p>
              </div>
              <div className="bg-white/15 rounded-xl p-3 text-center">
                <p className="text-xl font-bold">
                  {totalMinutos >= 60
                    ? `${Math.floor(totalMinutos / 60)}h${totalMinutos % 60 > 0 ? `${totalMinutos % 60}m` : ''}`
                    : `${totalMinutos}m`}
                </p>
                <p className="text-[10px] opacity-70 mt-0.5">tiempo total</p>
              </div>
            </div>

            {/* CO₂ */}
            {totalKwh > 0 && (
              <div className="flex items-center gap-2 mt-3 bg-white/10 rounded-xl px-3 py-2">
                <span className="text-base">🌱</span>
                <p className="text-xs opacity-90">
                  <span className="font-semibold">{(totalKwh * 0.18).toFixed(1)} kg CO₂</span> evitados este mes
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Lista de sesiones */}
        <div className="px-4 pb-24 space-y-3">
          {sesionesMes.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Zap size={24} className="text-gray-300" />
              </div>
              <p className="text-gray-500 text-sm font-medium">Sin cargas este mes</p>
              <p className="text-gray-400 text-xs mt-1">Selecciona otro mes para ver tu historial</p>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                {sesionesMes.length} {sesionesMes.length === 1 ? 'sesión' : 'sesiones'}
              </p>
              {sesionesMes.map(s => (
                <TarjetaSesion key={s.id} s={s} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
