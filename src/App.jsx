import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import BottomNav from './components/BottomNav'
import MapaPage from './pages/MapaPage'
import FichaPage from './pages/FichaPage'
import SesionPage from './pages/SesionPage'
import HistorialPage from './pages/HistorialPage'
import PerfilPage from './pages/PerfilPage'

export default function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
      <div className="h-full flex flex-col bg-gray-50 max-w-md mx-auto relative shadow-2xl overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Navigate to="/mapa" replace />} />
            <Route path="/mapa" element={<MapaPage />} />
            <Route path="/cargador/:id" element={<FichaPage />} />
            <Route path="/sesion" element={<SesionPage />} />
            <Route path="/historial" element={<HistorialPage />} />
            <Route path="/perfil" element={<PerfilPage />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </BrowserRouter>
    </AuthProvider>
  )
}
