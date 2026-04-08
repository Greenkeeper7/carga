import { useState } from 'react'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { X, CreditCard, Lock, AlertCircle, CheckCircle } from 'lucide-react'
import { getStripe } from '../lib/stripe'
import { useAuth } from '../contexts/AuthContext'

const CARD_STYLE = {
  style: {
    base: {
      fontSize: '16px',
      fontFamily: '"Inter", sans-serif',
      color: '#111827',
      '::placeholder': { color: '#9ca3af' },
    },
    invalid: { color: '#C0392B', iconColor: '#C0392B' },
  },
  hidePostalCode: true,
}

// Componente interno que usa los hooks de Stripe (deben estar dentro de <Elements>)
function CardFormInner({ onSuccess, onClose }) {
  const stripe = useStripe()
  const elements = useElements()
  const { savePaymentMethod, user } = useAuth()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [cardComplete, setCardComplete] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    if (!stripe || !elements) return

    setError(null)
    setLoading(true)

    const cardElement = elements.getElement(CardElement)

    const { paymentMethod, error: stripeError } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
      billing_details: { email: user?.email },
    })

    if (stripeError) {
      setError(stripeError.message)
      setLoading(false)
      return
    }

    const { error: saveError } = await savePaymentMethod({
      pmId: paymentMethod.id,
      last4: paymentMethod.card.last4,
      brand: paymentMethod.card.brand,
    })

    setLoading(false)

    if (saveError) {
      setError('Error al guardar la tarjeta. Inténtalo de nuevo.')
      return
    }

    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Cabecera */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <CreditCard size={20} className="text-azul" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900 text-base">Añade tu tarjeta</h2>
          <p className="text-xs text-gray-500">Se guardará para futuras cargas</p>
        </div>
      </div>

      {/* Campo de tarjeta */}
      <div className="bg-gray-100 rounded-xl px-4 py-3.5 mb-3">
        <CardElement
          options={CARD_STYLE}
          onChange={e => {
            setCardComplete(e.complete)
            setError(e.error?.message ?? null)
          }}
        />
      </div>

      {/* Tarjetas de prueba */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-4 flex items-start gap-2">
        <span className="text-sm flex-shrink-0">🧪</span>
        <p className="text-xs text-amber-800">
          <strong>Modo test:</strong> usa <code className="bg-amber-100 px-1 rounded">4242 4242 4242 4242</code>, fecha futura y cualquier CVC.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3 mb-3">
          <AlertCircle size={14} className="text-rojo flex-shrink-0 mt-0.5" />
          <p className="text-xs text-rojo">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !cardComplete || loading}
        className="w-full bg-azul text-white font-bold py-4 rounded-2xl shadow-lg shadow-azul/30 disabled:opacity-50 active:scale-95 transition-all"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Guardando tarjeta…
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Lock size={16} />
            Guardar tarjeta de forma segura
          </span>
        )}
      </button>

      <div className="flex items-center justify-center gap-1.5 mt-3">
        <Lock size={11} className="text-gray-400" />
        <p className="text-xs text-gray-400">Procesado por Stripe · Cifrado SSL</p>
      </div>
    </form>
  )
}

export default function StripeCardForm({ onSuccess, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-3xl px-5 pt-5 pb-10 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-end mb-3">
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <X size={16} />
          </button>
        </div>

        <Elements stripe={getStripe()}>
          <CardFormInner onSuccess={onSuccess} onClose={onClose} />
        </Elements>
      </div>
    </div>
  )
}
