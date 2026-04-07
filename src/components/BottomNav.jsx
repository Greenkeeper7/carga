import { NavLink, useLocation } from 'react-router-dom'
import { MapPin, Clock, User, Zap } from 'lucide-react'

const tabs = [
  { to: '/mapa', icon: MapPin, label: 'Mapa' },
  { to: '/historial', icon: Clock, label: 'Historial' },
  { to: '/perfil', icon: User, label: 'Perfil' },
]

export default function BottomNav() {
  const location = useLocation()
  const isSesion = location.pathname === '/sesion'

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-bottom">
      <div className="flex">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors ${
                isActive
                  ? 'text-azul'
                  : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            <Icon size={22} strokeWidth={isActive => isActive ? 2.5 : 1.8} />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}

        {/* Botón central de sesión activa */}
        <NavLink
          to="/sesion"
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors ${
            isSesion ? 'text-verde' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center -mt-5 shadow-lg transition-colors ${
            isSesion ? 'bg-verde' : 'bg-gray-200'
          }`}>
            <Zap size={20} color="white" strokeWidth={2.5} />
          </div>
          <span className={`text-[10px] font-medium ${isSesion ? 'text-verde' : 'text-gray-400'}`}>
            Sesión
          </span>
        </NavLink>
      </div>
    </nav>
  )
}
