import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X, Mail, Lock, Zap, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function AuthModal({ onSuccess, onClose, mensaje }) {
  const { signIn, signUp } = useAuth()
  const [modo, setModo] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [aceptaLegal, setAceptaLegal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [confirmacion, setConfirmacion] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setError(null)

    if (modo === 'register' && !aceptaLegal) {
      setError('Debes aceptar la Política de Privacidad y los Términos de Uso para registrarte.')
      return
    }

    setLoading(true)

    const { data, error: authError } =
      modo === 'login'
        ? await signIn(email, password)
        : await signUp(email, password)

    setLoading(false)

    if (authError) {
      setError(traducirError(authError.message))
      return
    }

    if (modo === 'register' && !data.session) {
      // Supabase requiere confirmar el email antes de iniciar sesión
      setConfirmacion(true)
      return
    }

    onSuccess(data.user)
  }

  if (confirmacion) {
    return (
      <Backdrop onClose={onClose}>
        <div className="text-center px-2">
          <div className="w-16 h-16 bg-verde/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-verde" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Revisa tu email</h2>
          <p className="text-sm text-gray-500 mb-6">
            Te hemos enviado un enlace de confirmación a <strong>{email}</strong>.<br />
            Confirma tu cuenta y vuelve a iniciar sesión.
          </p>
          <button
            onClick={() => { setConfirmacion(false); setModo('login') }}
            className="w-full bg-azul text-white font-bold py-3.5 rounded-2xl"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </Backdrop>
    )
  }

  return (
    <Backdrop onClose={onClose}>
      {/* Logo */}
      <div className="flex items-center gap-2 justify-center mb-5">
        <div className="w-9 h-9 bg-azul rounded-xl flex items-center justify-center shadow-lg shadow-azul/30">
          <Zap size={18} color="white" fill="white" />
        </div>
        <span className="text-xl font-bold">
          <span style={{ color: '#185FA5' }}>Carg</span><span style={{ color: '#E8B84B' }}>App</span>
        </span>
      </div>

      <h2 className="text-lg font-bold text-gray-900 text-center mb-1">
        {modo === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}
      </h2>
      <p className="text-sm text-gray-500 text-center mb-5">
        {mensaje ?? 'Necesitas una cuenta para iniciar una carga'}
      </p>

      {/* Toggle */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
        {[{ id: 'login', label: 'Iniciar sesión' }, { id: 'register', label: 'Registrarse' }].map(m => (
          <button
            key={m.id}
            onClick={() => { setModo(m.id); setError(null) }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
              modo === m.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Email */}
        <div className="relative">
          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-azul/30"
          />
        </div>

        {/* Contraseña */}
        <div className="relative">
          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="password"
            placeholder={modo === 'register' ? 'Mínimo 6 caracteres' : 'Contraseña'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-azul/30"
          />
        </div>

        {/* Aceptación legal — solo en registro */}
        {modo === 'register' && (
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={aceptaLegal}
              onChange={e => setAceptaLegal(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-azul flex-shrink-0"
            />
            <span className="text-xs text-gray-500 leading-relaxed">
              He leído y acepto la{' '}
              <Link
                to="/legal"
                onClick={onClose}
                className="text-azul font-medium underline"
              >
                Política de Privacidad y los Términos de Uso
              </Link>
            </span>
          </label>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
            <AlertCircle size={15} className="text-rojo flex-shrink-0 mt-0.5" />
            <p className="text-xs text-rojo">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-azul text-white font-bold py-4 rounded-2xl shadow-lg shadow-azul/30 disabled:opacity-60 active:scale-95 transition-all"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {modo === 'login' ? 'Entrando…' : 'Creando cuenta…'}
            </span>
          ) : (
            modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'
          )}
        </button>
      </form>

      {modo === 'login' && (
        <p className="text-center text-xs text-gray-400 mt-6">
          Al continuar aceptas los{' '}
          <Link to="/legal" onClick={onClose} className="text-azul font-medium">Términos de Uso</Link>
          {' '}y la{' '}
          <Link to="/legal" onClick={onClose} className="text-azul font-medium">Política de Privacidad</Link>
        </p>
      )}
    </Backdrop>
  )
}

function Backdrop({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-end mb-2">
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function traducirError(msg) {
  if (msg.includes('Invalid login credentials')) return 'Email o contraseña incorrectos'
  if (msg.includes('Email not confirmed')) return 'Confirma tu email antes de iniciar sesión'
  if (msg.includes('User already registered')) return 'Ya existe una cuenta con ese email'
  if (msg.includes('Password should be')) return 'La contraseña debe tener al menos 6 caracteres'
  if (msg.includes('rate limit')) return 'Demasiados intentos. Espera unos minutos.'
  return msg
}
